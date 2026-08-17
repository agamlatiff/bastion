# Bastion — Global Entity Relationship Diagram (ERD) & Data Model

> **Author:** Agam Latiff  
> **Database Engine:** PostgreSQL 16  
> **Primary Key Standard:** UUID v4 (`gen_random_uuid()`)  
> **Monetary Standard:** `NUMERIC(20,2)` / `BIGINT` (Integer Rupiah)  
> **Timestamp Standard:** `TIMESTAMPTZ` (UTC)  

---

## 1. Complete Visual ERD (Mermaid)

```mermaid
erDiagram
    %% Core Identity & Wallets
    USERS ||--|| WALLETS : "owns (1:1)"
    USERS ||--o| KYC_VERIFICATIONS : "submits (0..1)"
    USERS ||--o| MERCHANTS : "registers (0..1)"
    USERS ||--o{ NOTIFICATIONS : "receives (0..N)"
    USERS ||--o{ AUDIT_LOGS : "generates (0..N)"
    USERS ||--o{ IDEMPOTENCY_RECORDS : "initiates (0..N)"

    %% Wallet Money Movement
    WALLETS ||--o{ TRANSACTIONS : "sends (0..N)"
    WALLETS ||--o{ TRANSACTIONS : "receives (0..N)"
    WALLETS ||--o{ LEDGER_ENTRIES : "contains (0..N)"
    TRANSACTIONS ||--|{ LEDGER_ENTRIES : "generates (1..N)"

    %% Merchant & Payments
    MERCHANTS ||--o{ PAYMENTS : "creates (0..N)"
    USERS ||--o{ PAYMENTS : "pays as customer (0..N)"
    PAYMENTS ||--o| TRANSACTIONS : "executes as (0..1)"
    PAYMENTS ||--o{ REFUNDS : "refunded by (0..N)"
    REFUNDS ||--o| TRANSACTIONS : "reverses via (0..1)"

    %% Intelligence & Risk
    TRANSACTIONS ||--o{ RISK_ASSESSMENTS : "evaluated by (0..N)"
    RISK_ASSESSMENTS ||--o| FRAUD_CASES : "triggers (0..1)"
    TRANSACTIONS ||--o| FRAUD_CASES : "investigates (0..1)"

    %% Reconciliation
    RECONCILIATION_RUNS ||--|{ RECONCILIATION_ITEMS : "contains (1..N)"
    TRANSACTIONS ||--o| RECONCILIATION_ITEMS : "matches (0..1)"

    %% Event Outbox
    TRANSACTIONS ||--o| OUTBOX_EVENTS : "publishes (0..1)"

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

    MERCHANTS {
        uuid id PK
        uuid user_id FK_UK
        varchar business_name
        varchar business_type
        varchar status
        timestamptz created_at
        timestamptz updated_at
    }

    PAYMENTS {
        uuid id PK
        uuid merchant_id FK
        uuid customer_id FK
        uuid transaction_id FK
        numeric amount
        varchar currency
        varchar reference UK
        varchar status
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }

    REFUNDS {
        uuid id PK
        uuid payment_id FK
        uuid transaction_id FK
        numeric amount
        varchar currency
        varchar status
        text reason
        timestamptz created_at
        timestamptz updated_at
    }

    RISK_ASSESSMENTS {
        uuid id PK
        uuid transaction_id FK
        uuid user_id FK
        integer risk_score
        varchar decision
        jsonb reasons
        varchar engine_version
        timestamptz created_at
    }

    FRAUD_CASES {
        uuid id PK
        uuid transaction_id FK
        uuid user_id FK
        uuid risk_assessment_id FK
        varchar status
        text reason
        integer risk_score
        uuid assigned_to
        timestamptz created_at
        timestamptz updated_at
    }

    RECONCILIATION_RUNS {
        uuid id PK
        varchar provider
        varchar status
        integer total_records
        integer matched_records
        integer mismatched_records
        timestamptz started_at
        timestamptz completed_at
        timestamptz created_at
    }

    RECONCILIATION_ITEMS {
        uuid id PK
        uuid reconciliation_run_id FK
        uuid internal_transaction_id FK
        varchar external_reference
        numeric internal_amount
        numeric external_amount
        numeric discrepancy_amount
        varchar status
        timestamptz created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar event_type
        varchar title
        text message
        varchar channel
        varchar status
        uuid reference_id
        timestamptz created_at
        timestamptz sent_at
    }

    OUTBOX_EVENTS {
        uuid id PK
        varchar aggregate_type
        uuid aggregate_id
        varchar event_type
        integer event_version
        jsonb payload
        varchar status
        integer retry_count
        timestamptz created_at
        timestamptz published_at
    }

    IDEMPOTENCY_RECORDS {
        uuid id PK
        varchar idempotency_key
        uuid user_id FK
        varchar endpoint
        integer response_status
        jsonb response_body
        timestamptz expires_at
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar ip_address
        text user_agent
        jsonb metadata
        timestamptz created_at
    }
```

---

## 2. Table Ownership & Boundaries

| Table | Owning Domain | Service Authority | Financial Authority | Description |
|---|---|:---:|:---:|---|
| `users` | Identity | Go Core | No | User accounts, credentials, and verification tiers |
| `wallets` | Wallets | Go Core | **Yes** | Authoritative wallet balances & tier ceilings |
| `transactions` | Ledger | Go Core | **Yes** | Financial transaction records (TopUp, Transfer, Payment, Refund) |
| `ledger_entries` | Accounting | Go Core | **Yes** | Append-only double-entry bookkeeping (Debits & Credits) |
| `kyc_verifications` | Compliance | Go Core | No | Identity card records (NIK) and review lifecycle |
| `merchants` | Commercial | Go Core | No | Registered businesses capable of receiving customer payments |
| `payments` | Orders | Go Core | **Yes** | Commercial payment orders and state machine |
| `refunds` | Orders | Go Core | **Yes** | Payment reversals and partial refund tracking |
| `risk_assessments` | Risk Engine | Java Platform | No | Deterministic risk scoring audits & signal logs |
| `fraud_cases` | Fraud Watch | Java Platform | No | Investigable fraud incidents and operator reviews |
| `reconciliation_runs` | Reconciliation | Java Platform | No | Batch audit runs against external provider logs |
| `reconciliation_items` | Reconciliation | Java Platform | No | Per-transaction reconciliation matching records |
| `notifications` | Messaging | Java Platform | No | Non-blocking user alerts (email, push, in-app) |
| `outbox_events` | Messaging | Go Core | Event Bus | Transactional outbox records for Kafka publishing |
| `idempotency_records` | Infrastructure | Go Core | Safety | Persistent replay protection for financial endpoints |
| `audit_logs` | Security | Go Core | Audit | Security trail of logins, IP addresses, and actions |

---

## 3. Critical Financial Constraints

```sql
-- Wallet balance cannot become negative or exceed tier limit
ALTER TABLE wallets ADD CONSTRAINT chk_wallet_balance_positive CHECK (balance >= 0);
ALTER TABLE wallets ADD CONSTRAINT chk_wallet_limit CHECK (balance <= max_balance_limit);

-- Transactions must have positive amounts
ALTER TABLE transactions ADD CONSTRAINT chk_tx_amount_positive CHECK (amount > 0);
ALTER TABLE transactions ADD CONSTRAINT chk_tx_fee_non_negative CHECK (fee_amount >= 0);

-- Double-entry ledger entries must be positive
ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_amount_positive CHECK (amount > 0);
ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_balance_after_positive CHECK (balance_after >= 0);

-- Risk scores must fall within 0 to 100
ALTER TABLE risk_assessments ADD CONSTRAINT chk_risk_score_bounds CHECK (risk_score >= 0 AND risk_score <= 100);
```

---

## 4. Cardinality & Relationship Matrix

| Source Table | Target Table | Cardinality | Join Column | Cascade Rule | Purpose |
|---|---|:---:|---|---|---|
| `users` | `wallets` | 1:1 | `wallets.user_id` | `ON DELETE CASCADE` | 1:1 user wallet mapping |
| `users` | `merchants` | 1:0..1 | `merchants.user_id` | `ON DELETE CASCADE` | User merchant profile |
| `users` | `kyc_verifications` | 1:0..1 | `kyc_verifications.user_id` | `ON DELETE CASCADE` | Tier verification submission |
| `wallets` | `transactions` | 1:N | `transactions.sender_wallet_id` | `RESTRICT` | Outgoing transfer records |
| `wallets` | `transactions` | 1:N | `transactions.receiver_wallet_id` | `RESTRICT` | Incoming transfer records |
| `transactions` | `ledger_entries` | 1:1..2 | `ledger_entries.transaction_id` | `RESTRICT` | Double-entry journal entries |
| `merchants` | `payments` | 1:N | `payments.merchant_id` | `RESTRICT` | Invoices created by merchant |
| `payments` | `refunds` | 1:N | `refunds.payment_id` | `RESTRICT` | Partial/full payment refunds |
| `transactions` | `risk_assessments` | 1:N | `risk_assessments.transaction_id` | `NO CASCADE` | Risk audit evaluations |
| `risk_assessments`| `fraud_cases` | 1:0..1 | `fraud_cases.risk_assessment_id` | `NO CASCADE` | Fraud case trigger link |
| `reconciliation_runs`| `reconciliation_items` | 1:N | `reconciliation_items.reconciliation_run_id` | `CASCADE` | Reconciliation batch items |
