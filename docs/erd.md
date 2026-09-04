# Bastion — Database Contract & Entity-Relationship Design (ERD)

## Version 0.1 — Microservices Database Baseline

**Status:** Approved Baseline V0.1  
**Architecture:** Microservices with Database-per-Service Pattern  
**Primary Database:** PostgreSQL 16+  
**Event Backbone:** Transactional Outbox Pattern (PostgreSQL + Kafka)  
**Monetary Representation:** `BIGINT` (Minor currency units / cents), ISO 4217 Currency (`CHAR(3)`)

---

## Table of Contents

1. [ERD Global Bastion V0.1](#1-erd-global-bastion-v01)
2. [Database Ownership per Service](#2-database-ownership-per-service)
3. [Identity Service — `identity_db`](#3-identity-service--identity_db)
4. [Customer Service — `customer_db`](#4-customer-service--customer_db)
5. [KYC Service — `kyc_db`](#5-kyc-service--kyc_db)
6. [Wallet Service — `wallet_db`](#6-wallet-service--wallet_db)
7. [Wallet Balance History](#7-wallet-balance-history)
8. [Wallet Outbox](#8-wallet-outbox)
9. [Transaction Service — `transaction_db`](#9-transaction-service--transaction_db)
10. [Transaction State History](#10-transaction-state-history)
11. [Transaction Outbox](#11-transaction-outbox)
12. [Ledger Service — `ledger_db`](#12-ledger-service--ledger_db)
13. [Ledger Transactions](#13-ledger-transactions)
14. [Ledger Entries](#14-ledger-entries)
15. [Ledger Invariant & Posting Atomicity](#15-ledger-invariant--posting-atomicity)
16. [Ledger Balance Projection](#16-ledger-balance-projection)
17. [Ledger Outbox](#17-ledger-outbox)
18. [Reconciliation Worker](#18-reconciliation-worker)
19. [Relationship Antar-Service](#19-relationship-antar-service)
20. [Financial Flow V0.1 (P2P Transfer Lifecycle)](#20-financial-flow-v01-p2p-transfer-lifecycle)
21. [Top-up Accounting Flow](#21-top-up-accounting-flow)
22. [Transfer Accounting Flow](#22-transfer-accounting-flow)
23. [Fee Accounting Flow](#23-fee-accounting-flow)
24. [Reversal & Compensating Transactions](#24-reversal--compensating-transactions)
25. [Final Platform Database Map](#25-final-platform-database-map)
26. [Keputusan yang Dikunci untuk V0.1](#26-keputusan-yang-dikunci-untuk-v01)

---

# 1. ERD Global Bastion V0.1

```text
                              ┌─────────────────────┐
                              │      CUSTOMER       │
                              ├─────────────────────┤
                              │ PK customer_id      │
                              │ email               │
                              │ status              │
                              │ created_at          │
                              │ updated_at          │
                              └──────────┬──────────┘
                                         │
                         customer_id     │ 1:N
                                         │
                              ┌──────────▼──────────┐
                              │       WALLET        │
                              ├─────────────────────┤
                              │ PK wallet_id        │
                              │ customer_id*        │
                              │ currency            │
                              │ status              │
                              │ balance             │
                              │ max_balance_limit   │
                              │ created_at          │
                              │ updated_at          │
                              └──────────┬──────────┘
                                         │
                              wallet_id  │ 1:1
                                         │
                              ┌──────────▼──────────┐
                              │   LEDGER ACCOUNT    │
                              ├─────────────────────┤
                              │ PK account_id       │
                              │ account_type        │
                              │ owner_reference     │
                              │ currency            │
                              │ status              │
                              │ created_at          │
                              └──────────┬──────────┘
                                         │
                              account_id │ 1:N
                                         │
                              ┌──────────▼──────────┐
                              │    LEDGER ENTRY     │
                              ├─────────────────────┤
                              │ PK entry_id         │
                              │ ledger_tx_id*       │
                              │ account_id*         │
                              │ entry_type          │
                              │ amount              │
                              │ currency            │
                              │ created_at          │
                              └──────────▲──────────┘
                                         │
                                         │ N:1
                              ┌──────────┴──────────┐
                              │ LEDGER TRANSACTION  │
                              ├─────────────────────┤
                              │ PK ledger_tx_id     │
                              │ reference           │
                              │ type                │
                              │ status              │
                              │ currency            │
                              │ created_at          │
                              └─────────────────────┘


       ┌───────────────────────┐
       │      TRANSACTION      │
       ├───────────────────────┤
       │ PK transaction_id     │
       │ idempotency_key       │
       │ sender_wallet_id*     │
       │ receiver_wallet_id*   │
       │ amount                │
       │ fee_amount            │
       │ currency              │
       │ type                  │
       │ status                │
       │ description           │
       │ created_at            │
       │ updated_at            │
       └───────────────────────┘

* Cross-Service Reference:
  Application-level reference, BUKAN PostgreSQL Foreign Key lintas database.
```

> **Catatan Penting:** Diagram di atas adalah **logical ERD**. Pada implementasi microservices, referensi seperti `customer_id` di Wallet DB atau `wallet_id` di Transaction DB **tidak menggunakan PostgreSQL Foreign Key fisik**.

---

# 2. Database Ownership per Service

Setiap domain bisnis memiliki isolasi database penuh (*Database-per-Service Pattern*):

| Service | Database | Owner Domain |
| :--- | :--- | :--- |
| **Identity Service** | `identity_db` | Autentikasi, Kredensial, Sesi & Keamanan |
| **Customer Service** | `customer_db` | Profil Customer, Kontak, & Metadata |
| **KYC Service** | `kyc_db` | Verifikasi Identitas, Dokumen & Review |
| **Wallet Service** | `wallet_db` | Dompet Pengguna & Proyeksi Saldo Terkini |
| **Transaction Service** | `transaction_db` | Lifecycle Transaksi Bisnis & Idempotensi |
| **Ledger Service** | `ledger_db` | Sumber Kebenaran Finansial (*Accounting Truth*) |

> **API Gateway** tidak memiliki database bisnis (*stateless* / hanya Redis untuk rate limiting).

---

# 3. Identity Service — `identity_db`

Identity Service bertanggung jawab atas kredensial dan sesi otentikasi pengguna, tidak menyimpan domain profil wallet/keuangan.

### Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret_encrypted TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_status_chk
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'LOCKED', 'CLOSED'))
);

CREATE UNIQUE INDEX users_email_uq
    ON users (LOWER(email));
```

### Sessions

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    refresh_token_hash TEXT NOT NULL,

    device_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_user_idx
    ON sessions(user_id);

CREATE INDEX sessions_expires_idx
    ON sessions(expires_at);
```

### Roles & Permissions

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,

    PRIMARY KEY (user_id, role_id),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```

### Security Audit

```sql
CREATE TABLE security_audits (
    id UUID PRIMARY KEY,

    user_id UUID,
    action VARCHAR(100) NOT NULL,

    request_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX security_audits_user_idx
    ON security_audits(user_id);

CREATE INDEX security_audits_created_idx
    ON security_audits(created_at DESC);
```

---

# 4. Customer Service — `customer_db`

Customer Service adalah owner dari data profil dan metadata pelanggan.

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY,

    identity_user_id UUID NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    display_name VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT customers_status_chk
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED'))
);
```

### Customer Metadata

```sql
CREATE TABLE customer_metadata (
    customer_id UUID PRIMARY KEY,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE
);
```

> **Isolasi Lintas Database:**  
> Tidak ada foreign key fisik antara:  
> `customers.identity_user_id` $\rightarrow$ `identity_db.users.id`  
> Relasi dijamin di level aplikasi / event-driven consumer.

---

# 5. KYC Service — `kyc_db`

```sql
CREATE TABLE kyc_profiles (
    id UUID PRIMARY KEY,

    customer_id UUID NOT NULL UNIQUE,

    status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',

    provider VARCHAR(50),
    provider_reference VARCHAR(255),

    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT kyc_status_chk
        CHECK (
            status IN (
                'NOT_STARTED',
                'PENDING',
                'UNDER_REVIEW',
                'VERIFIED',
                'REJECTED'
            )
        )
);
```

### KYC Reviews

```sql
CREATE TABLE kyc_reviews (
    id UUID PRIMARY KEY,

    kyc_profile_id UUID NOT NULL,

    reviewer_id UUID,
    decision VARCHAR(30) NOT NULL,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (kyc_profile_id)
        REFERENCES kyc_profiles(id)
);
```

> `reviewer_id` merujuk secara logis ke entitas user/admin di Identity Service (bukan database FK).

---

# 6. Wallet Service — `wallet_db`

Wallet Service mengelola status wallet dan proyeksi saldo untuk konsumsi aplikasi/pengguna dengan latensi rendah.

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY,

    customer_id UUID NOT NULL,

    currency CHAR(3) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    balance BIGINT NOT NULL DEFAULT 0,

    max_balance_limit BIGINT NOT NULL,

    version BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT wallets_balance_chk
        CHECK (balance >= 0),

    CONSTRAINT wallets_max_balance_chk
        CHECK (max_balance_limit >= 0),

    CONSTRAINT wallets_balance_limit_chk
        CHECK (balance <= max_balance_limit),

    CONSTRAINT wallets_status_chk
        CHECK (
            status IN ('ACTIVE', 'FROZEN', 'CLOSED')
        )
);

CREATE INDEX wallets_customer_idx
    ON wallets(customer_id);

CREATE INDEX wallets_status_idx
    ON wallets(status);
```

### Wallet Multi-Currency Uniqueness

Satu customer hanya boleh memiliki satu dompet aktif per mata uang:

```sql
CREATE UNIQUE INDEX wallets_customer_currency_uq
    ON wallets(customer_id, currency)
    WHERE status <> 'CLOSED';
```

---

# 7. Wallet Balance History

Untuk audit operasional dan tracing proyeksi balance lokal:

```sql
CREATE TABLE wallet_balance_snapshots (
    id UUID PRIMARY KEY,

    wallet_id UUID NOT NULL,

    balance BIGINT NOT NULL,

    source_type VARCHAR(50) NOT NULL,
    source_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (wallet_id)
        REFERENCES wallets(id)
);

CREATE INDEX wallet_snapshots_wallet_created_idx
    ON wallet_balance_snapshots(wallet_id, created_at DESC);
```

> **Peringatan:** Tabel ini **bukan ledger**. Sumber kebenaran finansial mutlak tetap berada di `ledger_db`.

---

# 8. Wallet Outbox

Untuk menjamin *reliable event publishing* ke Kafka (Transactional Outbox Pattern):

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,

    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,

    event_type VARCHAR(150) NOT NULL,
    event_version INT NOT NULL DEFAULT 1,

    payload JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX outbox_unpublished_idx
    ON outbox_events(created_at)
    WHERE published_at IS NULL;
```

---

# 9. Transaction Service — `transaction_db`

Transaction Service melacak **transaksi bisnis**, bukan baris akuntansi double-entry.

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,

    idempotency_key VARCHAR(255) NOT NULL,
    request_hash CHAR(64) NOT NULL,

    sender_wallet_id UUID,
    receiver_wallet_id UUID,

    amount BIGINT NOT NULL,
    fee_amount BIGINT NOT NULL DEFAULT 0,

    currency CHAR(3) NOT NULL,

    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,

    description VARCHAR(500),

    failure_code VARCHAR(100),
    failure_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT transactions_amount_chk
        CHECK (amount > 0),

    CONSTRAINT transactions_fee_chk
        CHECK (fee_amount >= 0),

    CONSTRAINT transactions_type_chk
        CHECK (
            type IN (
                'TOPUP',
                'TRANSFER',
                'WITHDRAWAL',
                'REFUND',
                'REVERSAL'
            )
        ),

    CONSTRAINT transactions_status_chk
        CHECK (
            status IN (
                'CREATED',
                'PROCESSING',
                'COMPLETED',
                'FAILED',
                'REVERSED'
            )
        )
);
```

### Idempotency Enforcement

```sql
CREATE UNIQUE INDEX transactions_idempotency_uq
    ON transactions(idempotency_key);
```

> Kolom `request_hash` (SHA-256) menjamin jika ada request dengan *idempotency key yang sama* tetapi *payload berbeda*, sistem langsung menolak dengan `409 Conflict`.

### Query Indexes

```sql
CREATE INDEX transactions_sender_created_idx
    ON transactions(sender_wallet_id, created_at DESC, id);

CREATE INDEX transactions_receiver_created_idx
    ON transactions(receiver_wallet_id, created_at DESC, id);

CREATE INDEX transactions_status_idx
    ON transactions(status);
```

---

# 10. Transaction State History

Lifecycle state transition transaksi diaudit secara presisi:

```sql
CREATE TABLE transaction_status_history (
    id UUID PRIMARY KEY,

    transaction_id UUID NOT NULL,

    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,

    reason VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
);

CREATE INDEX transaction_status_history_tx_idx
    ON transaction_status_history(transaction_id, created_at);
```

---

# 11. Transaction Outbox

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,

    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,

    event_type VARCHAR(150) NOT NULL,
    event_version INT NOT NULL DEFAULT 1,

    payload JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX transaction_outbox_unpublished_idx
    ON outbox_events(created_at)
    WHERE published_at IS NULL;
```

---

# 12. Ledger Service — `ledger_db`

**Database paling sakral di Bastion.** Tidak boleh bergantung pada `wallets.balance`. Semua mutasi uang adalah *immutable journal entry*.

### Ledger Accounts (Chart of Accounts)

```sql
CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY,

    account_code VARCHAR(100) NOT NULL UNIQUE,

    account_type VARCHAR(30) NOT NULL,

    owner_type VARCHAR(50),
    owner_id UUID,

    currency CHAR(3) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ledger_accounts_type_chk
        CHECK (
            account_type IN (
                'ASSET',
                'LIABILITY',
                'EQUITY',
                'REVENUE',
                'EXPENSE'
            )
        ),

    CONSTRAINT ledger_accounts_status_chk
        CHECK (
            status IN ('ACTIVE', 'FROZEN', 'CLOSED')
        )
);
```

*Contoh Akun Standar:*
* `PLATFORM_CASH_IDR` (ASSET)
* `USER_WALLET_<WALLET_ID>_IDR` (LIABILITY)
* `PLATFORM_FEE_IDR` (REVENUE)

---

# 13. Ledger Transactions

Mewakili sebuah kelompok jurnal pembukuan akuntansi yang atomik.

```sql
CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY,

    reference VARCHAR(255) NOT NULL UNIQUE,

    external_transaction_id UUID,

    type VARCHAR(50) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'POSTED',

    currency CHAR(3) NOT NULL,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ledger_tx_type_chk
        CHECK (
            type IN (
                'TOPUP',
                'TRANSFER',
                'FEE',
                'REFUND',
                'REVERSAL',
                'ADJUSTMENT',
                'SETTLEMENT'
            )
        ),

    CONSTRAINT ledger_tx_status_chk
        CHECK (
            status IN ('PENDING', 'POSTED', 'REVERSED')
        )
);

CREATE INDEX ledger_transactions_external_idx
    ON ledger_transactions(external_transaction_id);
```

---

# 14. Ledger Entries

Setiap transaksi ledger terdiri dari minimal 2 entri (*double-entry bookkeeping*):

```sql
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,

    ledger_transaction_id UUID NOT NULL,

    account_id UUID NOT NULL,

    entry_type VARCHAR(10) NOT NULL,

    amount BIGINT NOT NULL,

    currency CHAR(3) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ledger_entries_amount_chk
        CHECK (amount > 0),

    CONSTRAINT ledger_entries_type_chk
        CHECK (
            entry_type IN ('DEBIT', 'CREDIT')
        ),

    FOREIGN KEY (ledger_transaction_id)
        REFERENCES ledger_transactions(id),

    FOREIGN KEY (account_id)
        REFERENCES ledger_accounts(id)
);

CREATE INDEX ledger_entries_transaction_idx
    ON ledger_entries(ledger_transaction_id);

CREATE INDEX ledger_entries_account_created_idx
    ON ledger_entries(account_id, created_at DESC);
```

---

# 15. Ledger Invariant & Posting Atomicity

Invarian mutlak akuntansi perbankan:

$$\sum \text{DEBIT} = \sum \text{CREDIT}$$

Karena batasan ini membutuhkan agregasi antar-baris (cross-row aggregation) yang tidak dapat divalidasi oleh `CHECK constraint` tabel tunggal, maka posting entri ledger **wajib** dilakukan dalam satu database transaction tertutup:

```text
BEGIN TRANSACTION;

-- 1. Insert Header
INSERT INTO ledger_transactions (...) VALUES (...);

-- 2. Insert Entries (Double-Entry Lines)
INSERT INTO ledger_entries (..., entry_type, amount) VALUES (..., 'DEBIT', 100000);
INSERT INTO ledger_entries (..., entry_type, amount) VALUES (..., 'CREDIT', 100000);

-- 3. Application Invariant Check:
IF (SUM(DEBIT) != SUM(CREDIT)) THEN
    ROLLBACK; -- Gagal total, jangan pernah partial write!
END IF;

COMMIT;
```

---

# 16. Ledger Balance Projection

Pada V0.1, **saldo asli dihitung langsung dari jurnal entri (single source of truth)**:

```sql
SELECT
    SUM(
        CASE
            WHEN entry_type = 'DEBIT' THEN -amount
            ELSE amount
        END
    ) AS calculated_balance
FROM ledger_entries
WHERE account_id = $1;
```

Untuk kebutuhan pembacaan cepat pada skala produksi, disediakan tabel proyeksi materialisasi:

```sql
CREATE TABLE account_balances (
    account_id UUID PRIMARY KEY,

    balance BIGINT NOT NULL DEFAULT 0,

    version BIGINT NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (account_id)
        REFERENCES ledger_accounts(id),

    CONSTRAINT account_balances_balance_chk
        CHECK (balance >= 0)
);
```

> **Ingat:** `account_balances` adalah proyeksi baca (*read projection*). Jika terjadi deviasi, rekalkulasi `ledger_entries` adalah penentu kebenaran mutlak.

---

# 17. Ledger Outbox

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,

    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,

    event_type VARCHAR(150) NOT NULL,
    event_version INT NOT NULL DEFAULT 1,

    payload JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX ledger_outbox_unpublished_idx
    ON outbox_events(created_at)
    WHERE published_at IS NULL;
```

---

# 18. Reconciliation Worker

Untuk V0.1, rekonsiliasi berjalan sebagai modul background worker di dalam Ledger Service:

```sql
CREATE TABLE reconciliation_runs (
    id UUID PRIMARY KEY,

    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,

    status VARCHAR(30) NOT NULL,

    accounts_checked BIGINT NOT NULL DEFAULT 0,
    mismatches_found BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reconciliation_mismatches (
    id UUID PRIMARY KEY,

    reconciliation_run_id UUID NOT NULL,

    account_id UUID NOT NULL,

    expected_balance BIGINT NOT NULL,
    actual_balance BIGINT NOT NULL,

    difference BIGINT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,

    FOREIGN KEY (reconciliation_run_id)
        REFERENCES reconciliation_runs(id)
);
```

---

# 19. Relationship Antar-Service

Bastion menolak arsitektur monolit database terdistribusi. Tidak diperbolehkan adanya Foreign Key fisik lintas service:

```text
-- TIDAK DIPERBOLEHKAN (ANTI-PATTERN):
ALTER TABLE transaction_db.transactions
    ADD CONSTRAINT fk_wallet FOREIGN KEY (sender_wallet_id)
    REFERENCES wallet_db.wallets(id);
```

Sebagai gantinya, relasi dikelola secara asinkron via Event-Driven Architecture:

```text
Transaction Service
       │
       │ (1) Request validation via gRPC / Internal API
       ▼
Wallet Service ────► Kafka (Topic: wallet.events)
                           │
                           ▼
                     Ledger Service
```

---

# 20. Financial Flow V0.1 (P2P Transfer Lifecycle)

Skenario: Customer A mentransfer Rp100.000 ke Customer B.

```text
[1. Transaction Service]
    ├── Insert transaction (ID: TX-001, status: 'PROCESSING')
    └── Insert outbox event: TransactionCreated

[2. Ledger Service]
    ├── Menangkap event / request transfer
    ├── Membuka DB Transaction:
    │     ├── Insert ledger_transactions (status: 'POSTED', ref: 'TX-001')
    │     ├── Insert ledger_entries (USER_A, 'DEBIT', 100000)
    │     └── Insert ledger_entries (USER_B, 'CREDIT', 100000)
    ├── Validasi sum(debit) == sum(credit) -> COMMIT
    └── Insert outbox event: LedgerTransactionPosted

[3. Wallet Service]
    ├── Menangkap LedgerTransactionPosted
    ├── Memperbarui proyeksi saldo (Optimistic Lock):
    │     ├── Wallet A balance -= 100000
    │     └── Wallet B balance += 100000
    └── Snapshot tercatat di wallet_balance_snapshots

[4. Transaction Service]
    └── Menangkap LedgerTransactionPosted -> Status diupdate menjadi 'COMPLETED'
```

---

# 21. Top-up Accounting Flow

Dalam double-entry perbankan, uang tidak pernah tercipta dari ketiadaan (*out of thin air*).

```text
1. DEBIT  : PLATFORM_CASH_IDR       100.000  (Asset platform bertambah)
2. CREDIT : USER_WALLET_A_IDR       100.000  (Kewajiban/Liability platform kepada user bertambah)

Total Invariant:
Debit (100.000) == Credit (100.000) [BALANCED]
```

---

# 22. Transfer Accounting Flow

Pemindahan nilai murni antar-nasabah tanpa memengaruhi kas riil platform:

```text
1. DEBIT  : USER_WALLET_A_IDR       100.000  (Liability kepada User A berkurang)
2. CREDIT : USER_WALLET_B_IDR       100.000  (Liability kepada User B bertambah)

Total Invariant:
Debit (100.000) == Credit (100.000) [BALANCED]
```

---

# 23. Fee Accounting Flow

Skenario: Transfer Rp100.000 dengan biaya admin platform Rp2.000:

```text
1. DEBIT  : USER_WALLET_A_IDR       102.000  (Total dana ditarik dari User A)
2. CREDIT : USER_WALLET_B_IDR       100.000  (Dana bersih diterima User B)
3. CREDIT : PLATFORM_FEE_IDR          2.000  (Pendapatan/Revenue platform)

Total Invariant:
Debit (102.000) == Credit (100.000 + 2.000) [BALANCED]
```

---

# 24. Reversal & Compensating Transactions

Ledger bersifat **immutable** (tidak ada perintah `UPDATE` atau `DELETE` pada tabel `ledger_entries`):

```text
Original Transaction (TX-001):
  DEBIT  : USER_A  100.000
  CREDIT : USER_B  100.000

Jika terjadi kegagalan/sengketa/pembatalan:
Diterbitkan Transaksi Pembalik / Reversal (REV-001):
  DEBIT  : USER_B  100.000
  CREDIT : USER_A  100.000
```

---

# 25. Final Platform Database Map

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                             BASTION PLATFORM                              │
└───────────────────────────────────────────────────────────────────────────┘

 Java Spring Boot (Identity & Security)        Go (High-Performance Engine)
 ──────────────────────────────────────        ────────────────────────────

         ┌──────────────┐                             ┌──────────────┐
         │ Identity DB  │                             │  Wallet DB   │
         │              │                             │              │
         │ users        │                             │ wallets      │
         │ sessions     │                             │ snapshots    │
         │ roles        │                             │ outbox       │
         │ user_roles   │                             └──────┬───────┘
         │ audits       │                                    │
         └──────────────┘                                    │ events
                                                             ▼
         ┌──────────────┐                               ┌─────────┐
         │ Customer DB  │                               │  Kafka  │
         │              │                               └────┬────┘
         │ customers    │                                    │
         │ metadata     │                    ┌───────────────┴───────────────┐
         └──────────────┘                    │                               │
                                             ▼                               ▼
         ┌──────────────┐         ┌────────────────────┐          ┌────────────────────┐
         │   KYC DB     │         │ Transaction DB     │          │ Ledger DB          │
         │              │         │                    │          │                    │
         │ kyc_profiles │         │ transactions       │          │ ledger_accounts    │
         │ kyc_reviews  │         │ status_history     │          │ ledger_transactions│
         └──────────────┘         │ outbox             │          │ ledger_entries     │
                                  └────────────────────┘          │ account_balances   │
                                                                  │ reconciliation     │
                                                                  │ outbox             │
                                                                  └────────────────────┘
```

---

# 26. Keputusan yang Dikunci untuk V0.1

1. **Ledger adalah Single Financial Source of Truth**: Seluruh validasi saldo mutlak bersumber dari `ledger_entries`.
2. **Wallet Balance adalah Read Projection**: Nilai `balance` di Wallet DB adalah hasil proyeksi untuk latensi rendah, bukan otoritas tunggal akuntansi.
3. **Transaction $\neq$ Ledger Transaction**: Transaksi bisnis melacak interaksi pengguna dan status pembayaran; Ledger transaksi melacak pembukuan akuntansi debit/kredit yang seimbang.
4. **Zero Cross-Service PostgreSQL Foreign Keys**: Batasan integritas data lintas domain dijamin melalui *eventual consistency* dan *distributed saga*, bukan database lock.
5. **Database Ownership Penuh per Layanan**: Setiap microservice mengelola skema dan databasenya sendiri. Layanan lain dilarang membaca/menulis langsung ke DB lain.
6. **Representasi Moneter Wajib `BIGINT`**: Seluruh nilai uang disimpan dalam unit terkecil (sen/rupiah murni tanpa floating point) untuk mencegah galat presisi pecahan desimal.
7. **Mata Uang Melekat (`ISO 4217`)**: Kolom nominal selalu didampingi oleh kolom `currency CHAR(3)`.
8. **Ledger Immutable**: Tidak ada operasi `UPDATE` maupun `DELETE` terhadap baris jurnal ledger yang telah tercatat.
9. **Kompensasi Melalui Reversal**: Koreksi kesalahan transaksi dilakukan dengan membuat entri pembalik debit-kredit baru.
10. **Idempotensi Wajib di Semua Mutasi**: Request mutasi wajib menyertakan `idempotency_key` dan `request_hash` untuk mencegah *double spending* saat network retry.
11. **Transactional Outbox Pattern**: Seluruh publikasi event domain ke Kafka wajib melalui tabel `outbox_events` di dalam transaksi DB lokal untuk menjamin konsistensi *at-least-once*.
12. **Redis Bukan Penentu Kebenaran Finansial**: Redis hanya digunakan sebagai distributed lock sementara dan cache; hilangnya data di Redis tidak boleh merusak kebenaran saldo.
