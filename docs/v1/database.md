# 🗄️ Bastion — Database Design & ERD

> **Engine:** PostgreSQL 16 (Relational DB) + Redis 7 (In-Memory Store)  
> **Convention:** All primary keys are UUID v4. All monetary values are `BIGINT` (integer rupiah).

---

## 1. Design Principles

| Principle | Rule | Reason |
|---|---|---|
| **Primary Keys** | UUID v4 | Security against sequential ID enumeration. Safe for microservice distribution. |
| **Monetary Amounts** | `BIGINT` | Never use FLOAT/DECIMAL. `Rp 50.000` is stored as `50000` integer rupiah. |
| **Timestamps** | `TIMESTAMPTZ` | Always store in UTC (`NOW()`). Format to local time on presentation layer. |
| **Immutability** | Append-only ledger | Transactions, ledger entries, and audit logs are **never UPDATED or DELETED**. |
| **Concurrency Lock** | Row-level locking | Use `SELECT ... FOR UPDATE` with ascending UUID ordering during balance mutations. |
| **Double-Entry** | Balanced entries | P2P transfers create matching debit and credit entries. Top-ups create a single credit entry. |
| **Tiered Limits** | KYC Tiering | Simulation: Tier 1 max `2,000,000 IDR`. Tier 2 max `10,000,000 IDR`. Enforced by application + DB CHECK constraints. |

---

## 2. Visual Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--|| WALLETS : "owns (1:1)"
    USERS ||--o| KYC_VERIFICATIONS : "submits (0..1)"
    WALLETS ||--o{ TRANSACTIONS : "sends (0..N)"
    WALLETS ||--o{ TRANSACTIONS : "receives (0..N)"
    WALLETS ||--o{ LEDGER_ENTRIES : "records (0..N)"
    TRANSACTIONS ||--|{ LEDGER_ENTRIES : "generates (1..N)"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar tier
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    WALLETS {
        uuid id PK
        uuid user_id FK_UK
        bigint balance
        bigint max_balance_limit
        varchar currency
        timestamptz created_at
        timestamptz updated_at
    }

    TRANSACTIONS {
        uuid id PK
        varchar idempotency_key UK
        uuid sender_wallet_id FK
        uuid receiver_wallet_id FK
        bigint amount
        bigint fee_amount
        varchar type
        varchar status
        text description
        timestamptz created_at
    }

    LEDGER_ENTRIES {
        uuid id PK
        uuid transaction_id FK
        uuid wallet_id FK
        varchar entry_type
        bigint amount
        bigint balance_after
        timestamptz created_at
    }

    KYC_VERIFICATIONS {
        uuid id PK
        uuid user_id FK_UK
        varchar id_card_number UK
        varchar id_card_image_url
        varchar selfie_image_url
        varchar status
        text rejection_reason
        timestamptz submitted_at
        timestamptz verified_at
    }
```

---

## 3. Table Relationships & Cardinality

| Parent Table | Child Table | Cardinality | FK Column | Nullable | Cascade Rule | Description |
|---|---|---|---|---|---|---|
| `users` | `wallets` | 1:1 | `wallets.user_id` | No | `ON DELETE CASCADE` | Every user has exactly one auto-created wallet. |
| `users` | `kyc_verifications` | 1:0..1 | `kyc_verifications.user_id` | No | `ON DELETE CASCADE` | Users can submit at most 1 active KYC record. |
| `wallets` | `transactions` | 1:N | `transactions.sender_wallet_id` | Yes | No Cascade | Outgoing transfer records. Null for top-ups. |
| `wallets` | `transactions` | 1:N | `transactions.receiver_wallet_id` | Yes | No Cascade | Incoming transfer or top-up records. |
| `wallets` | `ledger_entries` | 1:N | `ledger_entries.wallet_id` | No | No Cascade | Append-only double-entry audit history. |
| `transactions` | `ledger_entries` | 1:N | `ledger_entries.transaction_id` | No | No Cascade | 1 entry for top-up (credit), 2 entries for P2P (debit+credit). |

---

## 4. SQL Schema Definitions (DDL)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. USERS TABLE
-- ==========================================
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

-- ==========================================
-- 2. WALLETS TABLE
-- ==========================================
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

-- ==========================================
-- 3. TRANSACTIONS TABLE
-- ==========================================
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

-- ==========================================
-- 4. KYC_VERIFICATIONS TABLE
-- ==========================================
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

-- ==========================================
-- 5. LEDGER_ENTRIES TABLE (Sprint 1.4)
-- ==========================================
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

-- ==========================================
-- 6. AUDIT_LOGS TABLE (Level 2)
-- ==========================================
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

---

## 5. Database Constraints & Enums

### 5.1 CHECK Constraints (Safety Nets)

| Table | Constraint Rule | Purpose |
|---|---|---|
| `wallets` | `CHECK (balance >= 0)` | Prevents negative balances and overdrafts at DB level. |
| `wallets` | `CHECK (max_balance_limit > 0)` | Ensures positive tier limits. |
| `wallets` | `CHECK (balance <= max_balance_limit)` | Prevents balance from exceeding tier limit (2M for Tier 1, 10M for Tier 2). |
| `transactions` | `CHECK (amount > 0)` | Rejects zero or negative amounts. |
| `transactions` | `CHECK (fee_amount >= 0)` | Rejects negative fees. |
| `ledger_entries` | `CHECK (amount > 0)` | Rejects invalid accounting mutations. |
| `ledger_entries` | `CHECK (balance_after >= 0)` | Guarantees non-negative snapshots after mutations. |

### 5.2 Enumerations

| Table | Column | Allowed Values | Description |
|---|---|---|---|
| `users` | `tier` | `tier_1`, `tier_2` | Tier 1 limit: 2M IDR. Tier 2 limit: 10M IDR (unlocked via KYC). |
| `transactions` | `type` | `topup`, `transfer` | Identifies transaction category. |
| `transactions` | `status` | `pending`, `success`, `failed` | Lifecycle state of transactions. |
| `kyc_verifications` | `status` | `pending`, `approved`, `rejected` | State of KYC document review. |
| `ledger_entries` | `entry_type` | `debit`, `credit` | `debit` = money deducted; `credit` = money added. |

---

## 6. Double-Entry Accounting Examples

### 6.1 Top-Up Flow (Rp 100,000 to Mateo)

*Creates **1 transaction record** and **1 ledger entry** (credit only):*

```
transactions:
┌──────────┬──────────────┬────────────┬─────────────────┬──────────┬─────────┐
│ id       │ idem_key     │ sender     │ receiver        │ amount   │ type    │
├──────────┼──────────────┼────────────┼─────────────────┼──────────┼─────────┤
│ tx-001   │ topup-uuid-1 │ NULL       │ wallet-mateo    │ 100000   │ topup   │
└──────────┴──────────────┴────────────┴─────────────────┴──────────┴─────────┘

ledger_entries:
┌──────────┬──────────┬──────────────┬────────────┬──────────┬───────────────┐
│ id       │ tx_id    │ wallet_id    │ entry_type │ amount   │ balance_after │
├──────────┼──────────┼──────────────┼────────────┼──────────┼───────────────┤
│ le-001   │ tx-001   │ wallet-mateo │ credit     │ 100000   │ 100000        │
└──────────┴──────────┴──────────────┴────────────┴──────────┴───────────────┘
```

---

### 6.2 P2P Transfer Flow (Mateo sends Rp 50,000 to Jack)

*Creates **1 transaction record** and **2 ledger entries** (debit + credit):*

```
transactions:
┌──────────┬──────────────────┬──────────────┬──────────────┬──────────┬──────────┐
│ id       │ idem_key         │ sender       │ receiver     │ amount   │ type     │
├──────────┼──────────────────┼──────────────┼──────────────┼──────────┼──────────┤
│ tx-002   │ transfer-uuid-1  │ wallet-mateo │ wallet-jack  │ 50000    │ transfer │
└──────────┴──────────────────┴──────────────┴──────────────┴──────────┴──────────┘

ledger_entries:
┌──────────┬──────────┬──────────────┬────────────┬──────────┬───────────────┐
│ id       │ tx_id    │ wallet_id    │ entry_type │ amount   │ balance_after │
├──────────┼──────────┼──────────────┼────────────┼──────────┼───────────────┤
│ le-002   │ tx-002   │ wallet-mateo │ debit      │ 50000    │ 50000         │
│ le-003   │ tx-002   │ wallet-jack  │ credit     │ 50000    │ 50000         │
└──────────┴──────────┴──────────────┴────────────┴──────────┴───────────────┘
```

---

## 7. Redis Key Architecture

| Key Pattern | Data Type | TTL | Purpose | Status |
|---|---|---|---|---|
| `blacklist:{jwt_token}` | String | Token Exp | Token invalidation upon logout | ✅ Active |
| `idempotency:{idem_key}` | String (JSON) | 24 Hours | Duplicate transaction protection | ⏳ Sprint 1.4 / Level 2 |
| `rate_limit:{ip}:{endpoint}` | Counter | 1 Minute | Abuse prevention | ⏳ Level 3 |
