# 🗄️ Bastion — Database Schema

---

## Overview

Bastion uses **PostgreSQL 16** as its primary database.

### Key Design Decisions

| Decision | Reason |
|---|---|
| `UUID` primary keys | Doesn't expose row count. Safe for public APIs |
| `BIGINT` for money | Never use FLOAT for money. Rp50,000 stored as `50000` |
| `TIMESTAMPTZ` for dates | Always store UTC, convert to local on display |
| Immutable transactions | Never UPDATE or DELETE transactions. Append-only |
| Double-entry ledger | Every debit has a matching credit. Full audit trail |
| Row-level locking | `SELECT FOR UPDATE` prevents concurrent balance corruption |

---

## Tables

### `users`
Stores registered users.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    is_verified   BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `email` | VARCHAR | Unique, indexed for fast login lookup |
| `password_hash` | VARCHAR | bcrypt hash. NEVER store plain text |
| `full_name` | VARCHAR | Display name |
| `is_verified` | BOOLEAN | Email verification flag (Phase 5+) |
| `created_at` | TIMESTAMPTZ | UTC timestamp |
| `updated_at` | TIMESTAMPTZ | UTC timestamp |

---

### `wallets`
One wallet per user. Stores current balance.

```sql
CREATE TABLE wallets (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance    BIGINT      NOT NULL DEFAULT 0,
    currency   VARCHAR(3)  NOT NULL DEFAULT 'IDR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated |
| `user_id` | UUID | Foreign key to users. UNIQUE = one wallet per user |
| `balance` | BIGINT | In smallest unit (rupiah). Rp50,000 = `50000` |
| `currency` | VARCHAR | ISO 4217 currency code. Default: IDR |

> ⚠️ **Never use FLOAT for money.**
> `0.1 + 0.2 = 0.30000000000000004` in floating point.
> Store as integer (rupiah), display as formatted string.

---

### `transactions`
Immutable record of every financial operation.

```sql
CREATE TABLE transactions (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key    VARCHAR(255) UNIQUE NOT NULL,
    sender_wallet_id   UUID        REFERENCES wallets(id),
    receiver_wallet_id UUID        REFERENCES wallets(id),
    amount             BIGINT      NOT NULL,
    type               VARCHAR(50) NOT NULL,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending',
    description        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_sender   ON transactions(sender_wallet_id, created_at DESC);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_wallet_id, created_at DESC);
CREATE INDEX idx_transactions_idem_key ON transactions(idempotency_key);
```

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated |
| `idempotency_key` | VARCHAR | Client-generated key. Prevents duplicate payments |
| `sender_wallet_id` | UUID | NULL for top-up (no sender) |
| `receiver_wallet_id` | UUID | NULL for outgoing payment to merchant |
| `amount` | BIGINT | In rupiah. Always positive |
| `type` | VARCHAR | `transfer` \| `topup` \| `payment` |
| `status` | VARCHAR | `pending` \| `success` \| `failed` |
| `description` | TEXT | Optional memo |

> ⚠️ **NEVER UPDATE OR DELETE transactions.**
> Financial records must be immutable for audit compliance.
> If a transaction fails, INSERT a new one with status `failed`.

---

### `ledger_entries`
Double-entry bookkeeping. Every transaction generates exactly 2 entries.

```sql
CREATE TABLE ledger_entries (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID        NOT NULL REFERENCES transactions(id),
    wallet_id      UUID        NOT NULL REFERENCES wallets(id),
    entry_type     VARCHAR(10) NOT NULL,
    amount         BIGINT      NOT NULL,
    balance_after  BIGINT      NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_wallet ON ledger_entries(wallet_id, created_at DESC);
```

| Column | Type | Notes |
|---|---|---|
| `transaction_id` | UUID | Which transaction this entry belongs to |
| `wallet_id` | UUID | Which wallet this entry affects |
| `entry_type` | VARCHAR | `debit` (money out) \| `credit` (money in) |
| `amount` | BIGINT | Always positive |
| `balance_after` | BIGINT | Snapshot of balance after this entry |

**Example — Transfer of Rp50,000 from Alice to Bob:**

| transaction_id | wallet_id | entry_type | amount | balance_after |
|---|---|---|---|---|
| txn-abc | wallet-alice | debit | 50000 | 150000 |
| txn-abc | wallet-bob | credit | 50000 | 75000 |

This means:
- Alice had Rp200,000, now has Rp150,000 (debit Rp50,000)
- Bob had Rp25,000, now has Rp75,000 (credit Rp50,000)

---

### `notifications`
User notifications generated from payment events.

```sql
CREATE TABLE notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    message    TEXT        NOT NULL,
    type       VARCHAR(50) NOT NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | Which user this notification belongs to |
| `title` | VARCHAR | Short title e.g. "Money Received" |
| `message` | TEXT | Full message e.g. "You received Rp50,000 from John" |
| `type` | VARCHAR | `transfer_received` \| `transfer_sent` \| `topup` |
| `is_read` | BOOLEAN | Has user seen this notification |

---

## Redis Keys

Redis is used for fast, temporary data:

| Key Pattern | Value | TTL | Purpose |
|---|---|---|---|
| `blacklist:{token}` | `"1"` | JWT expiry duration | Logout — invalidate token |
| `idempotency:{key}` | JSON response | 24 hours | Prevent duplicate payments |
| `wallet:cache:{userID}` | JSON wallet | 60 seconds | Cache wallet balance reads |
| `rate_limit:{ip}:{endpoint}` | count | 1 minute | Rate limiting |

---

## Entity Relationship Diagram

```
users
  │  1
  │  │
  ▼  1
wallets ──────────────────────────────┐
  │  1                                │
  │  │                                │
  ▼  *                                ▼ *
transactions (as sender)         transactions (as receiver)
  │  1
  │  │
  ▼  2
ledger_entries

users
  │  1
  │  │
  ▼  *
notifications
```

---

## Migration Files

Migrations run in order when Docker starts PostgreSQL:

| File | Contents |
|---|---|
| `001_init.sql` | users, wallets tables |
| `002_transactions.sql` | transactions, ledger_entries tables |
| `003_notifications.sql` | notifications table |
