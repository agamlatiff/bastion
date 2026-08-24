# Bastion V2 — Entity Relationship Diagram

> **Version:** 2.0
> **Status:** Draft
> **Database:** PostgreSQL

---

## 1. ERD Overview

Bastion V2 contains these core entities:

```text
users
wallets
transactions
ledger_entries
kyc_verifications
audit_logs
```

High-level relationship:

```text
users
 │
 ├────── 1:1 ────── wallets
 │                     │
 │                     │
 │                     ├──── 1:N ──── transactions
 │                     │
 │                     └──── 1:N ──── ledger_entries
 │
 ├────── 1:1 ────── kyc_verifications
 │
 └────── 1:N ────── audit_logs

transactions
 │
 └────── 1:N ────── ledger_entries
```

---

## 2. Users

```text
┌──────────────────────────────┐
│            users             │
├──────────────────────────────┤
│ PK id UUID                   │
│    email VARCHAR             │
│    password_hash TEXT        │
│    full_name VARCHAR         │
│    role VARCHAR              │
│    tier VARCHAR              │
│    is_verified BOOLEAN       │
│    created_at TIMESTAMP       │
│    updated_at TIMESTAMP       │
└──────────────────────────────┘
```

Constraints:

```text
PRIMARY KEY (id)
UNIQUE (email)
NOT NULL (email)
NOT NULL (password_hash)
NOT NULL (role)
NOT NULL (tier)
```

---

## 3. Wallets

```text
┌──────────────────────────────┐
│           wallets            │
├──────────────────────────────┤
│ PK id UUID                   │
│ FK user_id UUID              │
│    balance NUMERIC           │
│    max_balance_limit NUMERIC │
│    status VARCHAR            │
│    created_at TIMESTAMP       │
│    updated_at TIMESTAMP       │
└──────────────────────────────┘
```

Constraints:

```text
PRIMARY KEY (id)

UNIQUE (user_id)

CHECK (balance >= 0)

CHECK (max_balance_limit >= 0)

CHECK (balance <= max_balance_limit)
```

Relationship:

```text
users 1 ───────── 1 wallets
```

---

## 4. Transactions

```text
┌─────────────────────────────────────┐
│             transactions             │
├─────────────────────────────────────┤
│ PK id UUID                          │
│ FK user_id UUID                     │
│ FK source_wallet_id UUID            │
│ FK destination_wallet_id UUID       │
│    transaction_type VARCHAR         │
│    amount NUMERIC                   │
│    status VARCHAR                   │
│    idempotency_key VARCHAR          │
│    request_fingerprint VARCHAR      │
│    reference VARCHAR                │
│    created_at TIMESTAMP             │
│    updated_at TIMESTAMP             │
│    completed_at TIMESTAMP           │
└─────────────────────────────────────┘
```

Relationships:

```text
users
  │
  └──── 1:N ──── transactions

wallets
  │
  ├──── 1:N ──── transactions.source_wallet_id
  │
  └──── 1:N ──── transactions.destination_wallet_id
```

---

## 5. Transaction Constraints

Amount:

```text
CHECK (amount > 0)
```

Idempotency:

```text
UNIQUE (
    user_id,
    transaction_type,
    idempotency_key
)
```

Transfer:

```text
source_wallet_id != destination_wallet_id
```

Foreign keys:

```text
user_id
    → users.id

source_wallet_id
    → wallets.id

destination_wallet_id
    → wallets.id
```

---

## 6. Ledger Entries

```text
┌──────────────────────────────┐
│        ledger_entries        │
├──────────────────────────────┤
│ PK id UUID                   │
│ FK transaction_id UUID       │
│ FK wallet_id UUID            │
│    entry_type VARCHAR        │
│    amount NUMERIC            │
│    balance_after NUMERIC     │
│    created_at TIMESTAMP       │
└──────────────────────────────┘
```

Relationships:

```text
transactions 1 ───── N ledger_entries

wallets      1 ───── N ledger_entries
```

---

## 7. Ledger Constraints

```text
CHECK (amount > 0)
```

Entry type:

```text
DEBIT
CREDIT
```

Ledger entries should be append-only from the application's perspective.

---

## 8. Financial Model

### Top-Up

```text
Transaction
    │
    └── TOP_UP
          │
          └── Ledger
                └── CREDIT
```

Example:

```text
Top-up = 100

Wallet:
100 → 200

Ledger:
CREDIT 100
```

---

## 9. Transfer

```text
Transaction
    │
    ├── source_wallet
    │       └── DEBIT
    │
    └── destination_wallet
            └── CREDIT
```

Example:

```text
Alice = 1000
Bob   = 500

Transfer = 200

Alice = 800
Bob   = 700
```

Ledger:

```text
Alice → DEBIT  200
Bob   → CREDIT 200
```

---

## 10. KYC Verifications

```text
┌────────────────────────────────┐
│       kyc_verifications        │
├────────────────────────────────┤
│ PK id UUID                     │
│ FK user_id UUID                │
│    id_card_number VARCHAR      │
│    status VARCHAR              │
│    rejection_reason TEXT       │
│ FK reviewed_by UUID NULL       │
│    submitted_at TIMESTAMP      │
│    reviewed_at TIMESTAMP       │
│    created_at TIMESTAMP        │
│    updated_at TIMESTAMP        │
└────────────────────────────────┘
```

Relationships:

```text
users
  │
  ├──── 1:1 ──── kyc_verifications.user_id
  │
  └──── 1:N ──── kyc_verifications.reviewed_by
```

Constraints:

```text
UNIQUE (user_id)

UNIQUE (id_card_number)
```

---

## 11. KYC State Machine

```text
             ┌──────────────┐
             │   PENDING    │
             └──────┬───────┘
                    / \
                   /   \
                  ▼     ▼
          ┌──────────┐ ┌──────────┐
          │ APPROVED │ │ REJECTED │
          └──────────┘ └──────────┘
```

Allowed:

```text
PENDING → APPROVED
PENDING → REJECTED
```

---

## 12. Audit Logs

```text
┌──────────────────────────────┐
│          audit_logs          │
├──────────────────────────────┤
│ PK id UUID                   │
│ FK user_id UUID NULL         │
│    action VARCHAR            │
│    request_id VARCHAR        │
│    ip_address VARCHAR        │
│    user_agent TEXT           │
│    metadata JSONB             │
│    created_at TIMESTAMP       │
└──────────────────────────────┘
```

Relationship:

```text
users 1 ───── N audit_logs
```

`user_id` may be nullable for events that happen before a user can be identified.

---

## 13. Audit Actions

Initial values:

```text
AUTH_REGISTER
AUTH_LOGIN_SUCCESS
AUTH_LOGIN_FAILED
AUTH_LOGOUT

KYC_SUBMITTED
KYC_APPROVED
KYC_REJECTED

WALLET_TOPUP
WALLET_TRANSFER
WALLET_TRANSFER_FAILED
```

Audit logs are append-only.

---

## 14. Complete ERD

```text
                                  ┌──────────────────────┐
                                  │        users         │
                                  ├──────────────────────┤
                                  │ PK id                │
                                  │    email UNIQUE      │
                                  │    password_hash     │
                                  │    full_name         │
                                  │    role              │
                                  │    tier              │
                                  │    is_verified       │
                                  │    created_at        │
                                  │    updated_at        │
                                  └──────────┬───────────┘
                                             │
                     ┌───────────────────────┼────────────────────────┐
                     │                       │                        │
                    1:1                     1:1                      1:N
                     │                       │                        │
                     ▼                       ▼                        ▼
          ┌──────────────────┐   ┌──────────────────────┐  ┌──────────────────┐
          │     wallets      │   │  kyc_verifications   │  │   audit_logs     │
          ├──────────────────┤   ├──────────────────────┤  ├──────────────────┤
          │ PK id            │   │ PK id                │  │ PK id            │
          │ FK user_id       │   │ FK user_id           │  │ FK user_id       │
          │ balance          │   │ id_card_number       │  │ action           │
          │ max_limit        │   │ status               │  │ request_id       │
          │ status           │   │ rejection_reason     │  │ ip_address       │
          │ created_at       │   │ FK reviewed_by       │  │ user_agent       │
          │ updated_at       │   │ submitted_at         │  │ metadata         │
          └────────┬─────────┘   │ reviewed_at          │  │ created_at       │
                   │             └──────────────────────┘  └──────────────────┘
                   │
            ┌──────┴──────────────────────────┐
            │                                 │
           1:N                               1:N
            │                                 │
            ▼                                 ▼
┌───────────────────────────┐       ┌──────────────────────────────┐
│       transactions        │       │       ledger_entries         │
├───────────────────────────┤       ├──────────────────────────────┤
│ PK id                     │──────<│ FK transaction_id            │
│ FK user_id                │  1:N  │ FK wallet_id                │
│ FK source_wallet_id       │       │ entry_type                   │
│ FK destination_wallet_id  │       │ amount                       │
│ transaction_type          │       │ balance_after                │
│ amount                    │       │ created_at                   │
│ status                    │       └──────────────────────────────┘
│ idempotency_key           │
│ request_fingerprint       │
│ reference                 │
│ created_at                │
│ updated_at                │
│ completed_at              │
└───────────────────────────┘
```

---

## 15. Relationship Summary

| Parent       | Child                              | Cardinality |
| ------------ | ---------------------------------- | ----------- |
| users        | wallets                            | 1:1         |
| users        | transactions                       | 1:N         |
| users        | kyc_verifications                  | 1:1         |
| users        | audit_logs                         | 1:N         |
| users        | kyc_verifications.reviewed_by      | 1:N         |
| wallets      | transactions.source_wallet_id      | 1:N         |
| wallets      | transactions.destination_wallet_id | 1:N         |
| wallets      | ledger_entries                     | 1:N         |
| transactions | ledger_entries                     | 1:N         |

---

## 16. Financial Invariants

The database/application combination must guarantee:

```text
balance >= 0

balance <= max_balance_limit

transaction.amount > 0

ledger_entry.amount > 0
```

For transfer:

```text
DEBIT amount = CREDIT amount
```

For top-up:

```text
CREDIT amount = transaction amount
```

Every completed transaction must have the required ledger entries.

---

## 17. Indexes

### users

```sql
CREATE UNIQUE INDEX idx_users_email
ON users(email);
```

### wallets

```sql
CREATE UNIQUE INDEX idx_wallets_user_id
ON wallets(user_id);
```

### transactions

```sql
CREATE INDEX idx_transactions_user_created
ON transactions(user_id, created_at DESC);

CREATE INDEX idx_transactions_source_created
ON transactions(source_wallet_id, created_at DESC);

CREATE INDEX idx_transactions_destination_created
ON transactions(destination_wallet_id, created_at DESC);

CREATE UNIQUE INDEX idx_transactions_idempotency
ON transactions(
    user_id,
    transaction_type,
    idempotency_key
);
```

### ledger

```sql
CREATE INDEX idx_ledger_transaction
ON ledger_entries(transaction_id);

CREATE INDEX idx_ledger_wallet_created
ON ledger_entries(wallet_id, created_at DESC);
```

### KYC

```sql
CREATE UNIQUE INDEX idx_kyc_user
ON kyc_verifications(user_id);

CREATE INDEX idx_kyc_status
ON kyc_verifications(status);
```

### Audit

```sql
CREATE INDEX idx_audit_user_created
ON audit_logs(user_id, created_at DESC);

CREATE INDEX idx_audit_request
ON audit_logs(request_id);

CREATE INDEX idx_audit_action_created
ON audit_logs(action, created_at DESC);
```

---

## 18. Transaction Locking

Transfer operations must lock wallets deterministically.

Conceptually:

```sql
SELECT id, balance, status
FROM wallets
WHERE id IN ($1, $2)
ORDER BY id
FOR UPDATE;
```

This prevents concurrent transfers from bypassing balance checks and reduces deadlock risk.

---

## 19. Source of Truth

The architecture intentionally separates:

```text
wallets.balance
    ↓
Current operational state
```

from:

```text
ledger_entries
    ↓
Historical financial record
```

PostgreSQL is the source of truth for both.

Redis must never become the authoritative financial store.

---

## 20. Future Extensions

The ERD intentionally leaves room for V3+ features:

```text
currencies
payment_methods
withdrawals
fees
refunds
settlements
external_references
fraud_events
```

These should only be introduced once their accounting and business semantics are defined.

---

## 21. ERD Definition of Done

The V2 ERD is considered complete when:

- Every core entity has a clear owner
- Relationships are explicit
- Transfer source/destination are explicit
- Idempotency has a database uniqueness boundary
- Ledger entries reference transactions
- Wallet ownership is unique
- KYC reviewer is traceable
- Audit events are traceable
- Financial invariants are defined
- Required indexes are identified
- Concurrency strategy is compatible with the schema
- Migration strategy can evolve the V1 schema safely
