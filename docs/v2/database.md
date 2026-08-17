# Bastion V2 — Database Specification

> **Author:** Agam Latiff  
> **Version:** 2.0  
> **Status:** Draft  
> **Database:** PostgreSQL 16  
> **Previous Version:** V1 — Digital Wallet Transaction Core  

---

## 1. Database Philosophy

Bastion V2 menggunakan database V1 sebagai **financial source of truth** dan menambahkan tabel baru untuk domain V2.

Prinsip utama:

> **Financial state remains authoritative in PostgreSQL and is mutated by Go Core.**

Java memiliki data domain sendiri untuk risk, fraud, dan reconciliation, tetapi **tidak boleh mengubah financial records secara langsung**.

---

## 2. High-Level Schema

```text
                           ┌────────────┐
                           │   users    │
                           └─────┬──────┘
                                 │
                         ┌───────┴───────┐
                         ▼               ▼
                    ┌──────────┐   ┌──────────────┐
                    │ wallets  │   │    KYC       │
                    └────┬─────┘   └──────────────┘
                         │
                         │
                    ┌────▼─────────┐
                    │ transactions │
                    └────┬─────────┘
                         │
                    ┌────▼─────────┐
                    │ledger_entries│
                    └──────────────┘

                 V2 FINANCIAL DOMAIN
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
   ┌─────────┐      ┌──────────┐     ┌─────────┐
   │merchants│      │ payments │     │ refunds │
   └────┬────┘      └────┬─────┘     └─────────┘
        │                │
        └────────────────┘


                 V2 JAVA DOMAIN
                         │
        ┌────────────────┼──────────────────┐
        ▼                ▼                  ▼
 ┌──────────────┐ ┌────────────┐ ┌─────────────────┐
 │risk_assess.  │ │fraud_cases │ │reconciliation   │
 └──────────────┘ └────────────┘ └─────────────────┘


                 EVENT INFRASTRUCTURE
                         │
                    ┌────▼────┐
                    │ outbox  │
                    └─────────┘
```

---

## 3. Existing V1 Tables

V2 keeps the following tables from V1:

```text
users
wallets
transactions
kyc_verifications
```

And from Sprint 1.4:

```text
ledger_entries
```

V2 must not unnecessarily modify the existing financial model.

---

## 4. `users`

Existing V1 table.

Conceptually:

```text
users
├── id
├── email
├── password_hash
├── tier
├── is_verified
├── created_at
└── updated_at
```

V2 continues to use `users.id` as the identity reference throughout the system.

---

## 5. `wallets`

Existing V1 table.

```text
wallets
├── id
├── user_id
├── balance
├── max_balance_limit
├── created_at
└── updated_at
```

V2 financial operations continue to use `wallets` as the authoritative balance source.

### Important

Java must **never** directly execute:

```sql
UPDATE wallets
SET balance = ...
```

Financial mutations belong to Go Core.

---

## 6. `transactions`

Existing V1 financial transaction table.

V2 transactions should support additional transaction types.

Example:

```text
TOP_UP
TRANSFER
PAYMENT
REFUND
```

Potential future types should not require rewriting historical records.

---

## 7. `ledger_entries`

V1 ledger table introduced for P2P transfers.

Each financial transaction should produce corresponding ledger entries.

For a payment:

```text
Transaction
     │
     ├── DEBIT  customer wallet
     │
     └── CREDIT merchant wallet
```

For a refund:

```text
Refund Transaction
     │
     ├── DEBIT  merchant wallet
     │
     └── CREDIT customer wallet
```

The ledger remains immutable.

---

## 8. Merchant Domain

V2 introduces merchants.

### `merchants`

```sql
CREATE TABLE merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT merchants_status_check
        CHECK (status IN ('pending', 'active', 'suspended'))
);
```

### Relationship

```text
users
  │
  └──< merchants
```

A merchant account belongs to a Bastion user.

---

## 9. Merchant Wallet

For V2, the merchant should use a normal Bastion wallet rather than introducing a completely separate balance system.

```text
merchant
    │
    ▼
user
    │
    ▼
wallet
```

This preserves the financial source-of-truth model.

A merchant's wallet balance therefore remains inside:

```text
wallets.balance
```

---

## 10. `payments`

Payment represents the business-level payment lifecycle.

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID NOT NULL REFERENCES merchants(id),
    customer_id UUID NOT NULL REFERENCES users(id),

    transaction_id UUID REFERENCES transactions(id),

    amount NUMERIC(20,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',

    reference VARCHAR(100) NOT NULL,
    description TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT payments_amount_check
        CHECK (amount > 0),

    CONSTRAINT payments_status_check
        CHECK (
            status IN (
                'pending',
                'authorized',
                'completed',
                'failed',
                'cancelled',
                'refunded'
            )
        )
);
```

---

## 11. Payment Relationships

```text
users
 │
 ├──────────────┐
 │              │
 ▼              ▼
customer      merchant
 │              │
 └──────┬───────┘
        ▼
     payments
        │
        ▼
 transactions
        │
        ▼
 ledger_entries
```

The `payments` table describes the **business lifecycle**.

The `transactions` table describes the **financial movement**.

This distinction is important.

---

## 12. Payment Reference

Payment references must be unique.

Recommended index:

```sql
CREATE UNIQUE INDEX idx_payments_reference
ON payments(reference);
```

This prevents duplicate payment references.

---

## 13. Payment Expiration

Payments with:

```text
status = pending
```

may have:

```text
expires_at
```

A payment must not be executed after expiration.

Expiration should be handled by the application/service layer rather than relying solely on a database constraint.

---

## 14. `refunds`

Refunds represent a reversal of an existing payment.

```sql
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    payment_id UUID NOT NULL REFERENCES payments(id),

    transaction_id UUID REFERENCES transactions(id),

    amount NUMERIC(20,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',

    reason TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT refunds_amount_check
        CHECK (amount > 0),

    CONSTRAINT refunds_status_check
        CHECK (
            status IN (
                'pending',
                'completed',
                'failed'
            )
        )
);
```

---

## 15. Refund Integrity

A payment may have multiple partial refunds.

Example:

```text
Payment = Rp1,000,000

Refund #1 = Rp300,000
Refund #2 = Rp200,000

Total refunded = Rp500,000
Remaining refundable = Rp500,000
```

The application must ensure:

```text
SUM(completed refunds) <= payment amount
```

This should be enforced within the Go financial transaction.

---

## 16. Risk Domain

Java owns risk assessment data.

### `risk_assessments`

```sql
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transaction_id UUID NOT NULL,

    user_id UUID NOT NULL,

    risk_score INTEGER NOT NULL,

    decision VARCHAR(30) NOT NULL,

    reasons JSONB,

    engine_version VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT risk_score_check
        CHECK (risk_score >= 0 AND risk_score <= 100),

    CONSTRAINT risk_decision_check
        CHECK (
            decision IN (
                'approve',
                'monitor',
                'review'
            )
        )
);
```

---

## 17. Risk Assessment Relationship

```text
transaction
      │
      └──< risk_assessments
```

A transaction may potentially have multiple risk assessments over its lifecycle.

For example:

```text
Initial assessment
       ↓
Risk rule update
       ↓
Re-assessment
```

Historical assessments should remain available for auditability.

---

## 18. Risk Reasons

Risk reasons should be stored as structured JSON.

Example:

```json
[
  "HIGH_AMOUNT",
  "HIGH_VELOCITY",
  "NEW_RECIPIENT"
]
```

This allows new reasons to be introduced without requiring a schema migration for every new rule.

---

## 19. Fraud Domain

### `fraud_cases`

```sql
CREATE TABLE fraud_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    transaction_id UUID NOT NULL,

    user_id UUID NOT NULL,

    risk_assessment_id UUID REFERENCES risk_assessments(id),

    status VARCHAR(30) NOT NULL DEFAULT 'open',

    reason TEXT,

    risk_score INTEGER,

    assigned_to UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fraud_case_status_check
        CHECK (
            status IN (
                'open',
                'under_review',
                'confirmed',
                'dismissed'
            )
        )
);
```

---

## 20. Fraud Case Lifecycle

```text
OPEN
 │
 ▼
UNDER_REVIEW
 │
 ├──────────────┐
 ▼              ▼
CONFIRMED     DISMISSED
```

Fraud cases are investigative records.

They do not replace the original transaction.

---

## 21. Reconciliation

V2 introduces reconciliation between Bastion and external financial records.

### `reconciliation_runs`

```sql
CREATE TABLE reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider VARCHAR(100) NOT NULL,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at TIMESTAMPTZ,

    status VARCHAR(30) NOT NULL DEFAULT 'running',

    total_records INTEGER NOT NULL DEFAULT 0,
    matched_records INTEGER NOT NULL DEFAULT 0,
    mismatched_records INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reconciliation_status_check
        CHECK (
            status IN (
                'running',
                'completed',
                'failed'
            )
        )
);
```

---

## 22. `reconciliation_items`

Each external record is represented by a reconciliation item.

```sql
CREATE TABLE reconciliation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reconciliation_run_id UUID NOT NULL
        REFERENCES reconciliation_runs(id),

    internal_transaction_id UUID
        REFERENCES transactions(id),

    external_reference VARCHAR(255),

    internal_amount NUMERIC(20,2),

    external_amount NUMERIC(20,2),

    status VARCHAR(40) NOT NULL,

    discrepancy_amount NUMERIC(20,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reconciliation_item_status_check
        CHECK (
            status IN (
                'matched',
                'amount_mismatch',
                'missing_internal',
                'missing_external'
            )
        )
);
```

---

## 23. Reconciliation Flow

```text
External Provider
       │
       ▼
reconciliation_items
       │
       ▼
     MATCH
       │
       ├── matched
       ├── amount_mismatch
       ├── missing_internal
       └── missing_external
```

Reconciliation does not silently modify historical transactions.

---

## 24. Notification Domain

### `notifications`

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id),

    event_type VARCHAR(100) NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    channel VARCHAR(30) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    reference_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,

    CONSTRAINT notification_channel_check
        CHECK (
            channel IN (
                'email',
                'push',
                'in_app'
            )
        ),

    CONSTRAINT notification_status_check
        CHECK (
            status IN (
                'pending',
                'sent',
                'failed'
            )
        )
);
```

Notifications are non-financial records.

Their failure must never rollback a completed payment.

---

## 25. Event / Outbox Domain

V2 introduces an outbox pattern.

### `outbox_events`

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    aggregate_type VARCHAR(100) NOT NULL,

    aggregate_id UUID NOT NULL,

    event_type VARCHAR(100) NOT NULL,

    event_version INTEGER NOT NULL DEFAULT 1,

    payload JSONB NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    published_at TIMESTAMPTZ,

    retry_count INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT outbox_status_check
        CHECK (
            status IN (
                'pending',
                'published',
                'failed'
            )
        )
);
```

---

## 26. Outbox Transaction

The important part is that the financial mutation and event creation happen in the **same PostgreSQL transaction**.

Example:

```text
BEGIN
 │
 ├── Update wallet
 │
 ├── Insert transaction
 │
 ├── Insert ledger entries
 │
 └── Insert outbox event
 │
COMMIT
```

Then:

```text
Outbox Publisher
       │
       ▼
Kafka
```

This prevents the classic failure:

```text
Money committed
       │
       X
Event lost
```

---

## 27. Event Example

When payment completes:

```json
{
  "event_id": "uuid",
  "aggregate_type": "payment",
  "aggregate_id": "uuid",
  "event_type": "PAYMENT_COMPLETED",
  "event_version": 1,
  "payload": {
    "payment_id": "uuid",
    "transaction_id": "uuid",
    "amount": 100000
  }
}
```

---

## 28. Idempotency

V1 already introduces Redis-based idempotency.

V2 extends idempotency to:

* Payments
* Refunds
* Transfers
* Top-ups

For long-term durability, financial operations should have a persistent idempotency record.

Recommended table:

### `idempotency_records`

```sql
CREATE TABLE idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    idempotency_key VARCHAR(255) NOT NULL,

    user_id UUID REFERENCES users(id),

    endpoint VARCHAR(255) NOT NULL,

    response_status INTEGER,

    response_body JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ,

    CONSTRAINT unique_idempotency_request
        UNIQUE (idempotency_key, endpoint, user_id)
);
```

Redis can remain the fast path.

PostgreSQL provides durable protection.

---

## 29. Indexing Strategy

Important indexes:

### Payments

```sql
CREATE INDEX idx_payments_merchant
ON payments(merchant_id);

CREATE INDEX idx_payments_customer
ON payments(customer_id);

CREATE INDEX idx_payments_status
ON payments(status);
```

### Risk

```sql
CREATE INDEX idx_risk_transaction
ON risk_assessments(transaction_id);

CREATE INDEX idx_risk_user
ON risk_assessments(user_id);
```

### Fraud

```sql
CREATE INDEX idx_fraud_transaction
ON fraud_cases(transaction_id);

CREATE INDEX idx_fraud_status
ON fraud_cases(status);
```

### Reconciliation

```sql
CREATE INDEX idx_reconciliation_run
ON reconciliation_items(reconciliation_run_id);

CREATE INDEX idx_reconciliation_transaction
ON reconciliation_items(internal_transaction_id);
```

### Outbox

```sql
CREATE INDEX idx_outbox_pending
ON outbox_events(status, created_at);
```

---

## 30. Foreign Key Strategy

Financial relationships should use foreign keys wherever practical.

Examples:

```text
payments.merchant_id
        ↓
merchants.id

payments.customer_id
        ↓
users.id

payments.transaction_id
        ↓
transactions.id

refunds.payment_id
        ↓
payments.id

refunds.transaction_id
        ↓
transactions.id
```

This prevents orphan financial records.

---

## 31. Monetary Data Type

All monetary values use:

```sql
NUMERIC(20,2)
```

Do **not** use:

```text
FLOAT
REAL
DOUBLE
```

for financial amounts.

Currency should be explicitly stored.

Example:

```text
amount = 100000.00
currency = IDR
```

This prepares Bastion for future multi-currency support without redesigning the monetary columns.

---

## 32. UUID Strategy

All major domain entities use UUID primary keys.

Examples:

```text
users
wallets
transactions
ledger_entries
merchants
payments
refunds
risk_assessments
fraud_cases
reconciliation_runs
outbox_events
```

This is consistent with the V1 architecture and avoids sequential public identifiers.

---

## 33. Timestamp Strategy

All timestamps use:

```sql
TIMESTAMPTZ
```

and should be stored in UTC.

Application responses may convert timestamps into the user's desired timezone.

---

## 34. Data Ownership

This is one of the most important parts of the V2 database architecture.

| Table                  | Owner | Financial Authority  |
| ---------------------- | ----- | -------------------- |
| `users`                | Go    | No                   |
| `wallets`              | Go    | **Yes**              |
| `transactions`         | Go    | **Yes**              |
| `ledger_entries`       | Go    | **Yes**              |
| `kyc_verifications`    | Go    | No                   |
| `merchants`            | Go    | No                   |
| `payments`             | Go    | **Yes**              |
| `refunds`              | Go    | **Yes**              |
| `risk_assessments`     | Java  | No                   |
| `fraud_cases`          | Java  | No                   |
| `reconciliation_runs`  | Java  | No                   |
| `reconciliation_items` | Java  | No                   |
| `notifications`        | Java  | No                   |
| `outbox_events`        | Go    | Event infrastructure |

---

## 35. Cross-Service Data Rule

Java should **not** query Go's tables directly as part of normal application behavior.

Bad:

```text
Java
  │
  └── SELECT * FROM wallets
```

Better:

```text
Java
  │
  ▼
Go Internal API
  │
  ▼
Financial Data
```

Or through domain events.

This keeps ownership clear.

---

## 36. Database Migration Structure

Recommended migration sequence:

```text
migrations/
│
├── 001_create_users.sql
├── 002_create_wallets.sql
├── 003_create_transactions.sql
├── 004_create_kyc_verifications.sql
├── 005_create_ledger_entries.sql
│
├── 006_create_merchants.sql
├── 007_create_payments.sql
├── 008_create_refunds.sql
├── 009_create_risk_assessments.sql
├── 010_create_fraud_cases.sql
├── 011_create_reconciliation_runs.sql
├── 012_create_reconciliation_items.sql
├── 013_create_notifications.sql
├── 014_create_outbox_events.sql
└── 015_create_idempotency_records.sql
```

Actual numbering should follow whatever migration numbering V1 currently uses.

---

## 37. V2 ERD — Simplified

```text
                         users
                           │
              ┌────────────┼─────────────┐
              │            │             │
              ▼            ▼             ▼
           wallets       merchants      KYC
              │            │
              │            │
              │       ┌────┴────┐
              │       ▼         ▼
              │    payments   merchant
              │       │
              │       │
              │       ▼
              │    refunds
              │
              ▼
        transactions
              │
              ▼
       ledger_entries
              │
              │
              ▼
      risk_assessments
              │
              ▼
         fraud_cases


transactions
     │
     ▼
outbox_events
     │
     ▼
   Kafka
     │
     ├── Risk
     ├── Fraud
     ├── Notification
     └── Reconciliation
```

---

## 38. Critical Invariants

Database design must preserve these invariants.

### Balance

```text
wallet.balance >= 0
```

### Transfer

```text
debit = credit
```

### Payment

```text
payment.amount > 0
```

### Refund

```text
total_refunded <= payment.amount
```

### Risk

```text
0 <= risk_score <= 100
```

### Idempotency

```text
same request ≠ multiple financial mutations
```

### Event

```text
financial commit + outbox event
```

must be atomic.

---

## 39. What V2 Does NOT Put in the Database Yet

We intentionally do **not** add:

```text
cards
bank_accounts
currencies
exchange_rates
loans
credit_scores
subscriptions
payouts
external_payment_providers
```

Those belong to possible V3/V4 domains.

This keeps V2 focused.

---

## 40. Final Database Architecture

The V2 database should effectively be viewed as **three layers**:

```text
┌─────────────────────────────────────┐
│       FINANCIAL SOURCE OF TRUTH     │
│                                     │
│ users                               │
│ wallets                             │
│ transactions                        │
│ ledger_entries                      │
│ payments                            │
│ refunds                             │
└──────────────────┬──────────────────┘
                   │
                   │ events
                   ▼
┌─────────────────────────────────────┐
│       FINANCIAL INTELLIGENCE        │
│                                     │
│ risk_assessments                    │
│ fraud_cases                         │
│ reconciliation_*                    │
│ notifications                       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│        EVENT INFRASTRUCTURE         │
│                                     │
│ outbox_events                       │
│ Kafka                               │
│ consumers                           │
└─────────────────────────────────────┘
```

### The most important boundary:

**Go:**

> `wallets → transactions → ledger_entries → payments/refunds`

**Java:**

> `risk_assessments → fraud_cases → reconciliation → notifications`

**Kafka/outbox:**

> `connect what happened to everything that needs to react to it.`
