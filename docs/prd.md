# Bastion — Product Requirements Document (PRD)

## Version 0.1 — Project Baseline

**Status:** Draft / Baseline
**Product:** Bastion
**Version:** 0.1
**Primary Architecture:** Polyglot Microservices
**Backend:** Go + Java Spring Boot
**Primary Database:** PostgreSQL
**Event Backbone:** Kafka-compatible event streaming
**Cache / Distributed Coordination:** Redis

---

# 1. Product Overview

## 1.1 Product Name

**Bastion**

## 1.2 Product Positioning

Bastion adalah **API-first financial infrastructure platform** yang menyediakan financial core untuk aplikasi yang membutuhkan:

* digital wallet
* account balance
* money movement
* transaction processing
* double-entry ledger
* transaction history
* financial auditability

Bastion bukan aplikasi wallet consumer pada tahap awal.

Bastion ditujukan sebagai **financial backend infrastructure untuk developer dan perusahaan**.

### Product statement

> **Bastion provides the financial core for applications that need to move and account for money safely.**

### Core principle

> **No money is created or lost. Every monetary movement must be explainable through the ledger.**

---

# 2. Problem Statement

Membangun sistem keuangan sendiri terlihat sederhana:

```text
user A
   ↓
transfer Rp100.000
   ↓
user B
```

Namun secara engineering, sistem tersebut harus menangani:

* concurrent requests
* double spending
* duplicate requests
* idempotency
* transaction consistency
* balance consistency
* ledger
* audit trail
* retries
* failures
* reconciliation
* authentication
* authorization
* fraud/risk
* external payment providers
* observability

Kesalahan kecil dapat menyebabkan:

```text
Balance user A = -Rp100.000
```

atau lebih buruk:

```text
User A: -Rp100.000

User B: +Rp100.000

Ledger: tidak balance
```

Bastion dibuat untuk mengabstraksikan kompleksitas tersebut menjadi financial infrastructure yang dapat digunakan melalui API.

---

# 3. Vision

Membangun **developer-first financial infrastructure** yang membuat aplikasi dapat mengimplementasikan money movement tanpa harus membangun financial core dari nol.

Dalam jangka panjang Bastion dapat berkembang menjadi infrastructure layer untuk:

```text
Applications
     ↓
Bastion
     ↓
Identity
Wallet
Transaction
Ledger
Risk
Payment
Settlement
Compliance
Reporting
```

---

# 4. Target Users

## 4.1 Primary User — Developers

Developer yang membangun:

* fintech
* marketplace
* payment platform
* SaaS dengan wallet
* gaming platform
* creator platform
* internal corporate wallet
* loyalty/reward system
* embedded finance application

Mereka membutuhkan API untuk:

```text
Create customer
Create wallet
Credit money
Debit money
Transfer money
Get balance
Get transaction history
```

tanpa membangun ledger dan transaction engine sendiri.

---

## 4.2 Secondary User — Engineering / Platform Team

Membutuhkan:

* reliability
* auditability
* observability
* reconciliation
* predictable APIs
* event-driven integration
* security

---

## 4.3 Future User — Operations / Finance / Compliance

Pada versi berikutnya:

* finance operator
* compliance officer
* risk analyst
* support team
* auditor

Mereka membutuhkan dashboard dan tooling untuk:

* transaction investigation
* reconciliation
* dispute handling
* audit
* KYC review
* risk review

---

# 5. Product Goals

## V1 Goals

Bastion V1 harus mampu menyediakan financial core dengan enam kemampuan utama:

### 1. Identity

User dapat:

* register
* login
* refresh session
* enable 2FA
* manage security credentials

### 2. Wallet

User dapat:

* memiliki wallet
* melihat balance
* melihat currency
* memiliki wallet status

### 3. Money Movement

Sistem dapat:

* credit wallet
* transfer antar-wallet
* validate balance
* prevent negative balance
* prevent duplicate transactions

### 4. Ledger

Setiap monetary movement harus menghasilkan immutable ledger entries.

Contoh:

```text
Transfer Rp100.000

Account A
DEBIT  Rp100.000

Account B
CREDIT Rp100.000
```

### 5. Transaction

Setiap money movement memiliki lifecycle yang jelas.

Contoh:

```text
CREATED
   ↓
PROCESSING
   ↓
COMPLETED
```

atau:

```text
PROCESSING
   ↓
FAILED
```

### 6. Transaction History

Customer dapat melihat:

* transaction ID
* type
* amount
* fee
* status
* sender
* receiver
* timestamp

---

# 6. Non-Goals V1

Fitur berikut **secara sengaja tidak menjadi scope V1**:

* crypto
* blockchain
* bank account integration
* debit/credit card issuing
* international settlement
* multi-country compliance
* AI fraud detection
* advanced fraud engine
* complex KYC provider integrations
* mobile application
* consumer-facing wallet application
* merchant acquiring
* lending
* investment
* complex FX

Alasannya:

> Bastion harus membuktikan financial core terlebih dahulu sebelum memperluas surface area.

---

# 7. Product Scope

## V1 Functional Scope

```text
Identity
   │
   ▼
Customer
   │
   ▼
Wallet
   │
   ▼
Transaction
   │
   ▼
Ledger
   │
   ▼
Transaction History
```

### Core domain

```text
Customer
   │
   └── Wallet
          │
          ├── Balance
          │
          └── Transactions
                     │
                     └── Ledger Entries
```

---

# 8. Core Domain Model

## 8.1 Customer

Representasi user/customer yang menggunakan Bastion.

Minimal:

```text
Customer
- id
- email
- status
- created_at
- updated_at
```

Status awal:

```text
ACTIVE
SUSPENDED
CLOSED
```

---

# 8.2 Wallet

Wallet adalah container untuk monetary balance.

Minimal:

```text
Wallet
- id
- customer_id
- currency
- status
- balance
- max_balance_limit
- created_at
- updated_at
```

Wallet status:

```text
ACTIVE
FROZEN
CLOSED
```

### Important rule

Wallet balance **bukan source of truth accounting**.

Balance adalah current/materialized state.

Source of truth:

```text
Ledger
```

---

# 8.3 Ledger Account

Bastion menggunakan accounting account abstraction.

Contoh:

```text
USER_WALLET_A
USER_WALLET_B
PLATFORM_CASH
PLATFORM_FEE
```

---

# 8.4 Ledger Transaction

Ledger transaction merepresentasikan satu atomic accounting event.

Contoh:

```text
Transaction:
TX-123

Entries:

DEBIT  PLATFORM_CASH    100000
CREDIT USER_WALLET_A    100000
```

atau transfer:

```text
DEBIT  USER_WALLET_A    100000
CREDIT USER_WALLET_B    100000
```

---

# 8.5 Ledger Entry

Ledger entry bersifat **append-only**.

Minimal:

```text
LedgerEntry
- id
- ledger_transaction_id
- account_id
- entry_type
- amount
- currency
- created_at
```

Entry type:

```text
DEBIT
CREDIT
```

### Ledger invariant

Untuk setiap transaction:

```text
SUM(DEBIT) == SUM(CREDIT)
```

Untuk setiap currency:

```text
total debit = total credit
```

---

# 9. Money Model

Bastion tidak menggunakan floating point untuk monetary values.

Amount harus menggunakan integer minor units.

Untuk IDR:

```text
Rp100.000
```

direpresentasikan sebagai:

```text
100000
```

Database menggunakan:

```text
BIGINT
```

---

## 9.1 Currency

V1 minimal mendukung:

```text
IDR
```

Namun domain model harus dirancang agar dapat berkembang menjadi:

```text
USD
EUR
SGD
...
```

---

## 9.2 Currency Rule

Transfer hanya boleh terjadi jika:

```text
sender.currency == receiver.currency
```

Cross-currency transaction bukan scope V1.

---

# 10. Transaction Model

Transaction adalah lifecycle dari money movement.

Minimal:

```text
Transaction
- id
- idempotency_key
- type
- sender_account_id
- receiver_account_id
- amount
- fee_amount
- currency
- status
- description
- created_at
- updated_at
```

---

# 11. Transaction Types

V1:

```text
TOPUP
TRANSFER
```

Future:

```text
WITHDRAWAL
REFUND
REVERSAL
FEE
SETTLEMENT
```

---

# 12. Transaction State Machine

Transaction lifecycle harus eksplisit.

```text
CREATED
   │
   ▼
PROCESSING
   │
   ├──────────────► FAILED
   │
   ▼
COMPLETED
```

Untuk reversal:

```text
COMPLETED
   │
   ▼
REVERSAL_REQUESTED
   │
   ▼
REVERSED
```

Completed transaction **tidak boleh diedit**.

Ledger entry **tidak boleh diedit atau dihapus**.

Jika terjadi koreksi:

> Create compensating/reversal transaction.

---

# 13. Idempotency

Semua endpoint yang menyebabkan monetary state change wajib mendukung idempotency.

Contoh:

```http
POST /v1/transfers

Idempotency-Key: abc-123
```

Request pertama:

```text
SUCCESS
TX-001
```

Request kedua dengan key yang sama:

```text
TX-001
```

Tidak boleh menghasilkan transaction baru.

---

## 13.1 Idempotency Rule

Idempotency key harus terikat dengan request payload.

Contoh:

```text
Idempotency-Key: abc-123
amount: 100000
receiver: B
```

Kemudian request:

```text
Idempotency-Key: abc-123
amount: 500000
receiver: C
```

harus ditolak.

Reason:

```text
IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST
```

---

# 14. Transfer Flow

Contoh transfer:

```text
Client
  │
  ▼
API Gateway
  │
  ▼
Transaction Service
  │
  ├── Validate sender
  ├── Validate receiver
  ├── Validate currency
  ├── Validate balance
  ├── Validate limits
  ├── Check idempotency
  │
  ▼
Ledger Service
  │
  ├── DEBIT sender
  └── CREDIT receiver
  │
  ▼
Wallet projection
  │
  ▼
Transaction COMPLETED
```

---

# 15. Financial Invariants

Ini adalah bagian paling penting dari Bastion.

## Rule 1 — No Negative Balance

Wallet tidak boleh memiliki:

```text
balance < 0
```

---

## Rule 2 — No Money Creation

Transfer tidak boleh membuat money baru.

Untuk transfer:

```text
sender debit = receiver credit
```

---

## Rule 3 — Double Entry

Setiap financial transaction harus memiliki minimal:

```text
1 DEBIT
1 CREDIT
```

---

## Rule 4 — Immutable Ledger

Ledger:

```text
INSERT only
```

Tidak boleh:

```text
UPDATE
DELETE
```

---

## Rule 5 — Atomicity

Money movement harus atomic.

Tidak boleh terjadi:

```text
Debit sender
    ↓
service crash
    ↓
credit receiver tidak terjadi
```

---

## Rule 6 — Idempotency

Retry request tidak boleh menghasilkan duplicate money movement.

---

## Rule 7 — Reconciliation

System harus dapat menghitung:

```text
Expected Balance
=
Initial Balance
+
Credits
-
Debits
```

dan membandingkannya dengan materialized wallet balance.

---

# 16. Architecture

Bastion menggunakan polyglot microservices.

Namun:

> **Service boundary ditentukan oleh business capability, bukan oleh programming language.**

---

# 17. Initial Microservices

## 17.1 API Gateway

Responsibilities:

* authentication forwarding
* request routing
* rate limiting
* request ID
* API versioning
* external API boundary

Technology:

```text
Go
```

---

## 17.2 Identity Service

Technology:

```text
Java
Spring Boot
```

Responsibilities:

* registration
* login
* password
* JWT
* refresh token
* 2FA
* session/device management
* authentication security

Database:

```text
identity_db
```

---

# 17.3 Customer Service

Technology:

```text
Java
Spring Boot
```

Responsibilities:

* customer profile
* customer status
* customer metadata
* customer lifecycle

Database:

```text
customer_db
```

---

# 17.4 Wallet Service

Technology:

```text
Go
```

Responsibilities:

* wallet creation
* wallet status
* balance projection
* wallet limits
* wallet queries

Database:

```text
wallet_db
```

Wallet Service tidak menjadi accounting authority.

---

# 17.5 Transaction Service

Technology:

```text
Go
```

Responsibilities:

* transfer lifecycle
* transaction state machine
* idempotency
* transaction orchestration
* transaction query

Database:

```text
transaction_db
```

---

# 17.6 Ledger Service

Technology:

```text
Go
```

Responsibilities:

* ledger accounts
* ledger transactions
* ledger entries
* double-entry validation
* immutable accounting
* balance calculation
* reconciliation support

Database:

```text
ledger_db
```

Ledger Service adalah:

> **financial source of truth.**

---

# 17.7 KYC Service

Technology:

```text
Java
Spring Boot
```

Responsibilities:

* KYC status
* verification workflow
* reviewer workflow
* compliance state

Database:

```text
kyc_db
```

KYC provider integration dapat ditambahkan kemudian.

---

# 18. Service Dependency

Logical architecture:

```text
                    ┌──────────────────┐
                    │   API Gateway    │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        Identity        Customer        Transaction
        Service         Service           Service
                                            │
                                  ┌─────────┴─────────┐
                                  ▼                   ▼
                             Wallet Service      Ledger Service
                                  │                   │
                                  └─────────┬─────────┘
                                            │
                                         Kafka
                                            │
                                            ▼
                                       Consumers
```

KYC berjalan sebagai independent domain service.

---

# 19. Database Ownership

Setiap service memiliki database/schema ownership sendiri.

Rule:

> Service A tidak boleh membaca langsung database Service B.

Contoh:

```text
Transaction Service
        X
        │
        X
wallet_db
```

Sebaliknya:

```text
Transaction Service
        │
       API
        │
        ▼
Wallet Service
```

atau:

```text
Transaction Service
        │
      Event
        │
        ▼
Wallet Service
```

---

# 20. Communication

## Synchronous

Gunakan:

```text
REST
gRPC
```

Untuk request yang membutuhkan immediate response.

---

## Asynchronous

Gunakan:

```text
Kafka-compatible event streaming
```

Contoh:

```text
TransactionCompleted
WalletCredited
WalletDebited
KYCVerified
TransactionFailed
```

---

# 21. Event Model

Event minimal:

```text
TransactionCreated
TransactionProcessing
TransactionCompleted
TransactionFailed

WalletCreated
WalletCredited
WalletDebited
WalletFrozen

KYCSubmitted
KYCVerified
KYCRejected
```

Event harus memiliki metadata:

```text
event_id
event_type
aggregate_id
timestamp
version
correlation_id
```

---

# 22. Outbox Pattern

Untuk menghindari kondisi:

```text
DB commit sukses
Kafka publish gagal
```

service yang menghasilkan financial event harus menggunakan:

```text
Transactional Outbox
```

Flow:

```text
DB Transaction
   │
   ├── update domain state
   └── insert outbox event
            │
            ▼
        COMMIT
            │
            ▼
      Outbox Worker
            │
            ▼
          Kafka
```

---

# 23. Consistency Model

Bastion menggunakan:

### Strong consistency

Untuk:

* ledger
* financial transaction
* balance validation
* idempotency

### Eventual consistency

Untuk:

* projections
* analytics
* notifications
* reporting
* search

Prinsip:

> Financial truth must be strongly consistent; derived data may be eventually consistent.

---

# 24. API Principles

API menggunakan:

```text
/v1/...
```

Contoh:

```http
POST /v1/customers
POST /v1/wallets
GET  /v1/wallets/{wallet_id}
GET  /v1/wallets/{wallet_id}/balance

POST /v1/transfers
GET  /v1/transactions/{transaction_id}
GET  /v1/transactions

POST /v1/topups
```

---

# 25. API Error Model

Semua API menggunakan structured error.

Contoh:

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient wallet balance",
    "request_id": "req_123"
  }
}
```

Error code harus machine-readable.

Contoh:

```text
INVALID_REQUEST
UNAUTHORIZED
FORBIDDEN
WALLET_NOT_FOUND
WALLET_FROZEN
INSUFFICIENT_BALANCE
CURRENCY_MISMATCH
DUPLICATE_REQUEST
IDEMPOTENCY_KEY_REUSED
TRANSACTION_NOT_FOUND
TRANSACTION_FAILED
```

---

# 26. Security Requirements

## Authentication

* short-lived access token
* refresh token rotation
* secure password hashing
* optional/required 2FA depending on policy

## Authorization

Role-based access:

```text
CUSTOMER
ADMIN
KYC_REVIEWER
OPERATIONS
```

---

## Sensitive Operations

Require additional security controls for:

* transfer
* withdrawal
* PIN changes
* security changes
* admin actions

---

# 27. Rate Limiting

Rate limiting diterapkan pada:

```text
login
register
refresh
2FA
PIN verification
money movement
```

Rate limit harus fail-safe untuk security-sensitive endpoints.

---

# 28. Audit Logging

Audit event minimal:

```text
LOGIN
LOGOUT
LOGIN_FAILED
2FA_ENABLED
2FA_DISABLED

PIN_CHANGED
PASSWORD_CHANGED

WALLET_CREATED
WALLET_FROZEN

TRANSFER_CREATED
TRANSFER_COMPLETED
TRANSFER_FAILED

KYC_SUBMITTED
KYC_REVIEWED
```

Audit record harus immutable.

---

# 29. Observability

Setiap service wajib memiliki:

### Logs

Structured JSON.

Minimal:

```text
timestamp
level
service
request_id
correlation_id
trace_id
user_id
transaction_id
message
```

### Metrics

Minimal:

```text
http_requests_total
http_request_duration
transaction_success_total
transaction_failed_total
ledger_entries_total
wallet_balance_mismatch_total
kafka_event_lag
db_connection_pool
redis_errors
```

### Tracing

Gunakan:

```text
OpenTelemetry
```

Trace harus dapat mengikuti:

```text
Gateway
   ↓
Transaction Service
   ↓
Wallet Service
   ↓
Ledger Service
   ↓
Kafka
```

---

# 30. Health Checks

Setiap service memiliki:

```text
/livez
/readyz
```

`livez`:

> process masih hidup.

`readyz`:

> service siap menerima traffic dan dependency penting tersedia.

---

# 31. Reconciliation

Bastion harus memiliki reconciliation process.

Contoh:

```text
Ledger calculated balance
          │
          ▼
      Rp500.000

Wallet projection
          │
          ▼
      Rp500.000
```

Jika:

```text
Ledger = Rp500.000
Wallet = Rp450.000
```

system harus menghasilkan:

```text
RECONCILIATION_MISMATCH
```

dan alert.

---

# 32. Failure Handling

System harus menangani:

* database timeout
* Redis failure
* Kafka failure
* service timeout
* duplicate request
* network retry
* consumer retry
* consumer crash
* partial downstream failure

Tidak boleh mengandalkan distributed lock sebagai satu-satunya correctness mechanism.

Correctness harus berasal dari:

```text
Database transaction
+
constraints
+
idempotency
+
ledger invariants
```

---

# 33. Distributed Lock

Redis distributed lock boleh digunakan sebagai optimization/coordination mechanism.

Namun:

> Redis lock bukan source of truth untuk financial correctness.

Financial correctness tetap harus dijamin oleh database dan ledger.

---

# 34. Data Integrity

Database harus menggunakan constraint sebanyak mungkin.

Contoh:

```text
balance >= 0
amount > 0
fee >= 0
currency valid
ledger entry type valid
transaction status valid
unique idempotency key
foreign key integrity
```

---

# 35. Performance Goals

V1 target:

### API

Target:

```text
p95 < 300ms
```

untuk normal synchronous API calls.

### Financial transaction

Target:

```text
p95 < 500ms
```

untuk internal transaction processing dalam kondisi normal.

### Availability

Initial target:

```text
99.9%
```

Untuk production financial APIs.

Target ini dapat dinaikkan setelah architecture dan operational maturity meningkat.

---

# 36. Scalability

Bastion harus dirancang agar service dapat di-scale independently.

Contoh:

```text
Transaction Service
instances: 10

Identity Service
instances: 3

Ledger Service
instances: 5
```

Database scaling akan menjadi concern terpisah.

---

# 37. Deployment

Development:

```text
Docker Compose
```

Production target:

```text
Kubernetes
```

Infrastructure:

```text
PostgreSQL
Redis
Kafka
OpenTelemetry
Prometheus
Grafana
```

Exact infrastructure provider belum ditentukan pada V0.1.

---

# 38. Repository Structure

Monorepo dapat digunakan pada fase awal.

Contoh:

```text
bastion/
│
├── services/
│   ├── gateway/
│   ├── identity/
│   ├── customer/
│   ├── wallet/
│   ├── transaction/
│   ├── ledger/
│   └── kyc/
│
├── libs/
│   ├── contracts/
│   ├── observability/
│   └── common/
│
├── infrastructure/
│   ├── postgres/
│   ├── redis/
│   ├── kafka/
│   └── docker/
│
├── api/
│   └── openapi/
│
└── docs/
    ├── prd/
    ├── architecture/
    └── adr/
```

Shared libraries tidak boleh mengandung business logic yang membuat service menjadi tightly coupled.

---

# 39. Testing Strategy

## Unit Test

Semua domain logic.

Terutama:

* money calculations
* transaction state machine
* ledger balancing
* idempotency
* limits

---

## Integration Test

Test dengan real dependencies atau containerized dependencies:

```text
PostgreSQL
Redis
Kafka
```

---

## Contract Test

Untuk:

```text
REST APIs
gRPC
Events
```

---

## End-to-End Test

Minimal flow:

```text
Register
   ↓
KYC
   ↓
Create Wallet
   ↓
Topup
   ↓
Transfer
   ↓
Check Balance
   ↓
Check Ledger
   ↓
Check Transaction
```

---

# 40. Critical Test Scenarios

Bastion tidak dianggap production-ready jika skenario berikut gagal.

### Concurrent transfer

```text
Balance = 100.000

Request A = transfer 80.000
Request B = transfer 80.000
```

Expected:

```text
Only one succeeds.
```

---

### Duplicate request

```text
Same Idempotency-Key
100 identical requests
```

Expected:

```text
One transaction.
```

---

### Same key, different payload

Expected:

```text
Reject request.
```

---

### Database failure

Tidak boleh terjadi:

```text
sender debited
receiver not credited
```

---

### Kafka failure

Financial transaction tetap memiliki authoritative state.

Event dapat dipublish ulang melalui outbox.

---

### Service restart

Transaction tidak boleh menghasilkan duplicate money movement setelah restart.

---

# 41. Product UX

Bastion V1 bukan consumer app.

Primary interface:

```text
API
```

Secondary interface:

```text
Developer Dashboard
```

Dashboard minimal:

* API keys
* customers
* wallets
* transactions
* ledger inspection
* webhook/event logs
* system status

Dashboard kompleks bukan scope awal.

---

# 42. Developer Experience

Bastion harus terasa seperti infrastructure product.

Developer harus dapat:

```text
Create account
       ↓
Get API key
       ↓
Create customer
       ↓
Create wallet
       ↓
Move money
       ↓
Inspect transaction
```

dengan dokumentasi yang jelas.

---

# 43. API Documentation

Wajib tersedia:

```text
OpenAPI
```

Dokumentasi harus menjelaskan:

* endpoint
* request
* response
* errors
* authentication
* idempotency
* rate limits
* webhooks/events

---

# 44. Developer Sandbox

V1 sebaiknya memiliki environment:

```text
Sandbox
Production
```

Sandbox dapat menggunakan simulated money.

Contoh:

```text
POST /sandbox/topups
```

Tidak terhubung ke real financial institutions.

---

# 45. Real Money Boundary

V0.1/V1 harus secara eksplisit membedakan:

```text
Simulated money
```

dan

```text
Real money
```

Integrasi dengan bank/payment provider hanya dilakukan setelah financial core stabil.

---

# 46. Compliance

V1 belum mendefinisikan full regulatory compliance untuk negara tertentu.

Namun architecture harus mendukung:

* audit trail
* immutable financial records
* customer identity
* KYC state
* transaction history
* operational review

Regulatory requirements akan menjadi workstream terpisah ketika Bastion mulai memindahkan real money.

---

# 47. Business Model — Future

Belum menjadi requirement V1.

Kemungkinan model:

### Usage based

```text
per transaction
```

### Platform fee

```text
monthly + transaction fee
```

### Enterprise

```text
custom pricing
```

### Infrastructure API

```text
pay-as-you-go
```

---

# 48. Success Metrics

Technical:

```text
0 unexplained balance mismatch
0 duplicate successful financial transactions
0 negative wallet balance
100% ledgered monetary transactions
```

Product:

```text
Developer can integrate core wallet flow in < 1 day
```

Reliability:

```text
99.9% API availability
```

Operational:

```text
All financial transactions auditable
```

---

# 49. V1 Definition of Done

Bastion V1 dianggap selesai apabila:

### Identity

* [ ] Register
* [ ] Login
* [ ] Refresh token
* [ ] 2FA
* [ ] RBAC

### Customer

* [ ] Create customer
* [ ] Customer status
* [ ] Customer lookup

### Wallet

* [ ] Create wallet
* [ ] Get wallet
* [ ] Get balance
* [ ] Freeze wallet
* [ ] Wallet limits

### Transaction

* [ ] Transfer
* [ ] Transaction state machine
* [ ] Idempotency
* [ ] Transaction history

### Ledger

* [ ] Ledger accounts
* [ ] Double-entry transactions
* [ ] Immutable entries
* [ ] Ledger balance calculation
* [ ] Reconciliation

### Infrastructure

* [ ] PostgreSQL
* [ ] Redis
* [ ] Kafka
* [ ] Outbox
* [ ] OpenTelemetry
* [ ] Metrics
* [ ] Structured logs

### Quality

* [ ] Unit tests
* [ ] Integration tests
* [ ] Contract tests
* [ ] E2E tests
* [ ] Concurrency tests
* [ ] Failure tests

### Documentation

* [ ] OpenAPI
* [ ] Architecture documentation
* [ ] ADRs
* [ ] Local development guide
* [ ] Sandbox guide

---

# 50. V1 Development Priority

Prioritas harus mengikuti urutan berikut:

```text
P0 — Financial correctness
        ↓
P1 — Transaction reliability
        ↓
P2 — Security
        ↓
P3 — Developer experience
        ↓
P4 — Observability
        ↓
P5 — Scale
        ↓
P6 — Additional financial features
```

Jangan membalik urutan ini.

Contoh:

> Jangan membangun fancy dashboard sebelum ledger correctness selesai.

---

# 51. Initial Engineering Roadmap

## Phase 0 — Foundation

```text
PRD
Architecture
ADR
Repository structure
Service boundaries
API contracts
Domain model
```

---

## Phase 1 — Identity

```text
Spring Boot
Identity Service
JWT
Refresh token
2FA
RBAC
```

---

## Phase 2 — Customer + Wallet

```text
Customer Service
Wallet Service
Wallet lifecycle
Balance projection
Limits
```

---

## Phase 3 — Ledger

```text
Ledger Service
Ledger Account
Ledger Transaction
Ledger Entry
Double-entry invariant
Immutable ledger
```

Ini adalah **milestone paling penting**.

---

## Phase 4 — Transaction Engine

```text
Transaction Service
Idempotency
Transfer
State machine
Outbox
Kafka
```

---

## Phase 5 — Reconciliation

```text
Ledger balance
Wallet projection
Reconciliation worker
Mismatch detection
Alerting
```

---

## Phase 6 — KYC

```text
KYC Service
Spring Boot
KYC workflow
Reviewer role
Customer verification state
```

---

## Phase 7 — Production Hardening

```text
Security hardening
Load testing
Chaos/failure testing
Observability
Deployment
Backup
Recovery
Operational runbooks
```

---

# 52. Architecture Decision Principles

Setiap architecture decision Bastion harus mengikuti prinsip:

### Principle 1

**Ledger is the source of truth.**

### Principle 2

**Database constraints enforce financial invariants.**

### Principle 3

**Idempotency is mandatory for state-changing financial APIs.**

### Principle 4

**Completed financial transactions are immutable.**

### Principle 5

**Corrections happen through compensating transactions.**

### Principle 6

**Redis is not the financial source of truth.**

### Principle 7

**Events are integration mechanisms, not accounting truth.**

### Principle 8

**Every service owns its data.**

### Principle 9

**Business boundaries determine service boundaries.**

### Principle 10

**Prefer simple architecture until scale requires complexity.**

---

# 53. Open Decisions

Keputusan berikut sengaja belum dikunci pada V0.1:

* API Gateway technology final
* Kafka vs Redpanda
* REST vs gRPC boundaries
* Kubernetes provider
* cloud provider
* exact authentication architecture
* API key model
* webhook architecture
* payment provider
* real-money settlement
* regulatory jurisdiction
* pricing
* multi-currency expansion
* multi-region deployment
* disaster recovery target

Keputusan tersebut akan dibuat melalui ADR ketika dibutuhkan.

---

# 54. Risks

## Risk 1 — Overengineering

Microservices dapat menjadi terlalu kompleks.

Mitigation:

```text
5–7 services initially
```

bukan puluhan service.

---

## Risk 2 — Incorrect Financial Model

Balance-first architecture dapat menghasilkan accounting inconsistency.

Mitigation:

```text
Ledger-first design
```

---

## Risk 3 — Distributed Transaction Complexity

Microservices membuat atomic transaction lebih sulit.

Mitigation:

```text
Bounded contexts
+
local transactions
+
idempotency
+
outbox
+
events
```

---

## Risk 4 — Premature Payment Integration

Integrasi bank/payment provider terlalu awal dapat memperbesar complexity.

Mitigation:

```text
Build simulated financial core first.
```

---

## Risk 5 — Polyglot Complexity

Go + Java dapat meningkatkan operational complexity.

Mitigation:

```text
Shared engineering standards
Shared API contracts
Shared observability
Shared CI/CD
```

---

# 55. Product Boundary

Bastion V1 secara konseptual adalah:

```text
              BASTION
┌─────────────────────────────────────┐
│                                     │
│  Identity                           │
│      ↓                              │
│  Customer                           │
│      ↓                              │
│  Wallet                             │
│      ↓                              │
│  Transaction                        │
│      ↓                              │
│  Ledger                             │
│      ↓                              │
│  Reconciliation                     │
│                                     │
└─────────────────────────────────────┘
```

Bukan:

```text
Bastion
├── Bank
├── Card
├── Crypto
├── Lending
├── Investment
├── AI Fraud
├── KYC Provider
├── Mobile App
└── Everything
```

---

# 56. North Star

Jika satu hal harus menjadi identitas Bastion, maka:

> **Bastion makes money movement correct, traceable, and developer-friendly.**

Developer seharusnya tidak perlu memikirkan:

```text
"Apakah balance bisa double spend?"
"Kalau request di-retry gimana?"
"Kalau service crash setelah debit gimana?"
"Ledger-nya balance gak?"
"Transaction ini sebenarnya sudah berhasil belum?"
```

Bastion harus menjawab semua itu melalui financial core-nya.

---

# 57. Final V0.1 Scope

Untuk baseline proyek, kita commit terhadap:

```text
Bastion
│
├── API-first
├── Financial infrastructure
├── Polyglot microservices
│
├── Java / Spring Boot
│   ├── Identity
│   ├── Customer
│   └── KYC
│
├── Go
│   ├── Gateway
│   ├── Wallet
│   ├── Transaction
│   └── Ledger
│
├── PostgreSQL
├── Redis
├── Kafka
├── OpenTelemetry
│
└── Core financial model
    ├── Customer
    ├── Wallet
    ├── Transaction
    ├── Ledger Account
    └── Ledger Entry
```

**V0.1 objective:**

> Build a correct financial core before building a large financial platform.
