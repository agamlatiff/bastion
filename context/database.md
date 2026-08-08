# 🗄️ Bastion — Database Design

> **Engine**: PostgreSQL 16 (Relational DB) + Redis 7 (In-Memory Store)
> **Convention**: `[CURRENT]` = exists in migrations, `[PLANNED]` = committed, `[FUTURE]` = not committed

---

## 1. Design Principles

| Principle | Rule | Reason |
|-----------|------|--------|
| **Primary Keys** | UUID v4 | Security against sequential ID guessing. Safe for microservice distribution. |
| **Monetary Amounts** | `BIGINT` | Never use FLOAT/DECIMAL. `Rp 50.000` stored as `50000` integer rupiah. |
| **Timestamps** | `TIMESTAMPTZ` | Always store in UTC. Format to local time on presentation layer. |
| **Immutability** | Append-only ledger | Transactions, ledger entries, and audit logs are **never UPDATED or DELETED**. |
| **Concurrency Lock** | Row-level locking | Use `SELECT ... FOR UPDATE` during balance mutations. |
| **Double-Entry** | Balanced entries | P2P transfers create matching debit and credit entries. Top-ups create a single credit entry. |
| **Tiered Limits** | KYC Tiering | Simplified simulation: Tier 1 max Rp 2,000,000. Tier 2 max Rp 20,000,000. Enforced by CHECK constraints. |

---

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--|| WALLETS : "owns (1:1)"
    USERS ||--o| KYC_VERIFICATIONS : "submits (1:1)"
    USERS ||--o{ NOTIFICATIONS : "receives (1:N)"
    USERS ||--o{ AUDIT_LOGS : "triggers (1:N)"

    WALLETS ||--o{ TRANSACTIONS : "sender (1:N)"
    WALLETS ||--o{ TRANSACTIONS : "receiver (1:N)"
    WALLETS ||--o{ LEDGER_ENTRIES : "has (1:N)"

    TRANSACTIONS ||--|{ LEDGER_ENTRIES : "generates (1:N)"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string tier
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    WALLETS {
        uuid id PK
        uuid user_id FK-UK
        bigint balance
        bigint max_balance_limit
        string currency
        timestamptz created_at
        timestamptz updated_at
    }

    TRANSACTIONS {
        uuid id PK
        string idempotency_key UK
        uuid sender_wallet_id FK
        uuid receiver_wallet_id FK
        bigint amount
        string type
        string status
        timestamptz created_at
    }

    LEDGER_ENTRIES {
        uuid id PK
        uuid transaction_id FK
        uuid wallet_id FK
        string entry_type
        bigint amount
        bigint balance_after
        timestamptz created_at
    }

    KYC_VERIFICATIONS {
        uuid id PK
        uuid user_id FK-UK
        string id_card_number UK
        string status
        timestamptz submitted_at
        timestamptz verified_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string title
        text message
        boolean is_read
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string ip_address
        string user_agent
        timestamptz created_at
    }
```

---

## 3. Schema Definitions

### [CURRENT] 3.1 `users`

Stores user profile, security state, and KYC tier status.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    tier          VARCHAR(20) NOT NULL DEFAULT 'tier_1',
    is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### [CURRENT] 3.2 `wallets`

Stores wallet balance with simulated tier limits enforced by CHECK constraint.

```sql
CREATE TABLE IF NOT EXISTS wallets (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance            BIGINT      NOT NULL DEFAULT 0 CHECK (balance >= 0),
    max_balance_limit  BIGINT      NOT NULL DEFAULT 2000000 CHECK (max_balance_limit > 0),
    currency           VARCHAR(3)  NOT NULL DEFAULT 'IDR',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_wallet_limit CHECK (balance <= max_balance_limit)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
```

### [PLANNED — Level 1] 3.3 `transactions`

Immutable record of transfers and top-ups.

```sql
CREATE TABLE IF NOT EXISTS transactions (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key    VARCHAR(255) UNIQUE NOT NULL,
    sender_wallet_id   UUID        REFERENCES wallets(id),
    receiver_wallet_id UUID        REFERENCES wallets(id),
    amount             BIGINT      NOT NULL CHECK (amount > 0),
    fee_amount         BIGINT      NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    type               VARCHAR(50) NOT NULL,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending',
    description        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender   ON transactions(sender_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_idem_key ON transactions(idempotency_key);
```

### [PLANNED — Level 1] 3.4 `ledger_entries`

Accounting log tracking balance changes. P2P transfers create 2 entries (1 debit for sender, 1 credit for receiver). Top-ups create 1 entry (credit only).

```sql
CREATE TABLE IF NOT EXISTS ledger_entries (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID        NOT NULL REFERENCES transactions(id),
    wallet_id      UUID        NOT NULL REFERENCES wallets(id),
    entry_type     VARCHAR(10) NOT NULL,
    amount         BIGINT      NOT NULL CHECK (amount > 0),
    balance_after  BIGINT      NOT NULL CHECK (balance_after >= 0),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger_entries(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_tx     ON ledger_entries(transaction_id);
```

### [PLANNED — Level 1] 3.5 `kyc_verifications`

KYC identity verification records.

```sql
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id_card_number     VARCHAR(50) UNIQUE NOT NULL,
    id_card_image_url  VARCHAR(512) NOT NULL,
    selfie_image_url   VARCHAR(512) NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'pending',
    rejection_reason   TEXT,
    submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications(user_id);
```

### [PLANNED — Level 2] 3.6 `audit_logs`

Security and compliance audit trail.

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    action     VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45)  NOT NULL,
    user_agent TEXT,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
```

### [PLANNED — Level 3] 3.7 `notifications`

User notification inbox populated by event consumers.

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    message    TEXT        NOT NULL,
    type       VARCHAR(50) NOT NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

### [FUTURE] 3.8 `outbox_events`

Transactional Outbox for reliable Kafka publishing. Only introduced if the outbox pattern is justified.

```sql
CREATE TABLE IF NOT EXISTS outbox_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   UUID        NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    payload        JSONB       NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status, created_at ASC) WHERE status = 'pending';
```

---

## 4. Table State Summary

| Table | State | Introduced At |
|-------|-------|---------------|
| `users` | [CURRENT] | Level 1 |
| `wallets` | [CURRENT] | Level 1 |
| `transactions` | [PLANNED] | Level 1 |
| `ledger_entries` | [PLANNED] | Level 1 |
| `kyc_verifications` | [PLANNED] | Level 1 |
| `audit_logs` | [PLANNED] | Level 2 |
| `notifications` | [PLANNED] | Level 3 |
| `outbox_events` | [FUTURE] | — |

---

## 5. Redis Key Architecture

| Key Pattern | Data Type | TTL | Purpose | State |
|-------------|-----------|-----|---------|-------|
| `blacklist:{jwt_token}` | String | Token exp | Token revocation on logout | [CURRENT] |
| `idempotency:{idem_key}` | String (JSON) | 24 Hours | Prevent duplicate transactions | [PLANNED — Level 2] |
| `rate_limit:{ip}:{endpoint}` | Counter | 1 Minute | API abuse prevention | [PLANNED — Level 3] |
