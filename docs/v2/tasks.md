# Bastion V2 — Task Tracker

> **Author:** Agam Latiff  
> **Version:** 2.0  
> **Status:** Active  
> **Convention:** `[x]` completed, `[/]` in progress, `[ ]` not started  
> **Architecture:** Go Core + Java Platform  
> **Database:** PostgreSQL 16  
> **Cache:** Redis 7  
> **Messaging:** Kafka (Sprint 2.6+)  

---

# Sprint 2.1 — Foundation & Java Platform Setup

**Primary:** Go + Java

Establish the multi-service architecture, containerization, and inter-service communication baseline for Bastion V2.

### Project & Service Structure

* [ ] Reorganize project into multi-service workspace:
  ```text
  services/
  ├── core/        # Go (Gin, Clean Architecture)
  └── platform/    # Java (Spring Boot)
  ```
* [ ] Initialize Spring Boot project (`services/platform/`)
  * [ ] Configure Maven / Gradle dependencies
  * [ ] Configure PostgreSQL datasource & connection pooling
  * [ ] Configure Redis client
  * [ ] Configure application properties & environment bindings
* [ ] Docker & Local Infrastructure:
  * [ ] Update `docker-compose.yml` to include Go Core and Java Platform containers
  * [ ] Create multi-stage `Dockerfile` for Go Core
  * [ ] Create multi-stage `Dockerfile` for Java Platform

### Inter-Service Communication & Security

* [ ] Define internal REST API contracts (`/internal/v1/*`)
* [ ] Implement internal service authentication (API key / shared secret / HMAC)
* [ ] Standardize error response envelope across Go and Java
* [ ] Implement `request_id` propagation middleware in both services
* [ ] Implement health check endpoints (`/health`) in Go and Java

### Testing

* [ ] Spring Boot application context load test
* [ ] Go $\leftrightarrow$ Java internal HTTP ping test
* [ ] Docker Compose end-to-end service boot test

---

# Sprint 2.2 — Merchant & Payment Requests

**Primary:** Go

Introduce merchant accounts and payment request lifecycle into Go Core.

### Database

* [ ] Database migration: `merchants` table
* [ ] Database migration: `payments` table
* [ ] Indexes on `merchant_id`, `customer_id`, `reference`, `status`
* [ ] Foreign keys and CHECK constraints (`status IN ('pending', 'active', 'suspended')`)

### Domain Layer (Go)

* [ ] `domain/merchant.go` — `Merchant` entity, `CreateMerchantRequest`, `MerchantResponse`
* [ ] `domain/payment.go` — `Payment` entity, `CreatePaymentRequest`, `PaymentResponse`, status enums

### Repository Layer (Go)

* [ ] `MerchantRepository` interface + implementation:
  * [ ] `Create` — Insert merchant profile linked to `user_id`
  * [ ] `FindByID` — Query merchant by UUID
  * [ ] `FindByUserID` — Query merchant by user UUID
  * [ ] `UpdateStatus` — Update merchant status (`pending`, `active`, `suspended`)
* [ ] `PaymentRepository` interface + implementation:
  * [ ] `Create` — Insert payment request with unique `reference`
  * [ ] `FindByID` — Query payment by UUID
  * [ ] `FindByReference` — Query payment by reference code
  * [ ] `UpdateStatus` — Update payment lifecycle status

### Service Layer (Go)

* [ ] `MerchantService`:
  * [ ] Register merchant profile
  * [ ] Activate / suspend merchant account
  * [ ] Verify merchant status before accepting payments
* [ ] `PaymentService`:
  * [ ] Create payment request with amount, merchant ID, reference, and expiration timestamp
  * [ ] Validate active merchant status and positive amount
  * [ ] Check expiration on payment retrieval

### API Layer (Go)

```text
POST /api/v1/merchants
GET  /api/v1/merchants/me
POST /api/v1/merchants/:id/activate
POST /api/v1/merchants/:id/suspend

POST /api/v1/payments
GET  /api/v1/payments/:id
POST /api/v1/payments/:id/cancel
```

### Testing

* [ ] Merchant registration and activation flow
* [ ] Duplicate merchant prevention per user
* [ ] Suspended merchant blocked from creating payment requests
* [ ] Payment request generation with unique reference and expiration check

---

# Sprint 2.3 — Risk Assessment Engine

**Primary:** Java + Go Integration

Implement the deterministic Risk Engine in Java and integrate it synchronously into the Go payment flow.

### Database

* [ ] Database migration: `risk_assessments` table
* [ ] Indexes on `transaction_id`, `user_id`, and `created_at`
* [ ] CHECK constraints on `risk_score (0-100)` and `decision ('approve', 'monitor', 'review')`

### Java Risk Platform (`services/platform/`)

* [ ] Domain: `RiskAssessment`, `RiskDecision`, `RiskRule`, `RiskReason`
* [ ] Composable Rule Pipeline:
  * [ ] `AmountRule` — Flags high single-transaction amounts
  * [ ] `VelocityRule` — Evaluates transaction frequency against Redis counters
  * [ ] `TimeRule` — Evaluates unusual transaction hours
  * [ ] `RecipientRule` — Flags first-time / new recipient interactions
  * [ ] `HistoryRule` — Evaluates historical failure rates and KYC status
* [ ] `RiskEngineService` — Aggregates rule scores and outputs decision:
  * [ ] `0 – 30`: `APPROVE`
  * [ ] `31 – 70`: `MONITOR`
  * [ ] `71 – 100`: `REVIEW`
* [ ] Internal Controller: `POST /internal/v1/risk/assess`

### Go Core Integration

* [ ] Implement `RiskClient` in Go Core to call Java `/internal/v1/risk/assess`
* [ ] Integrate risk evaluation step before committing payment financial transactions
* [ ] Handle Java service timeouts and fallback behavior (block/pending rather than silent execution)

### Testing

* [ ] Low-risk transaction $\rightarrow$ `APPROVE` (Score $\le 30$)
* [ ] High-value transaction $\rightarrow$ `MONITOR` / `REVIEW`
* [ ] High velocity spike $\rightarrow$ `REVIEW`
* [ ] Multiple compounding risk factors scoring
* [ ] Graceful failure handling when Java Risk service is unreachable

---

# Sprint 2.4 — Fraud Detection & Case Management

**Primary:** Java

Implement transaction monitoring, velocity tracking, and fraud case management in Java.

### Database

* [ ] Database migration: `fraud_cases` table
* [ ] Indexes on `transaction_id`, `user_id`, and `status`
* [ ] CHECK constraints on `status IN ('open', 'under_review', 'confirmed', 'dismissed')`

### Java Fraud Service (`services/platform/`)

* [ ] Domain: `FraudCase`, `FraudStatus`, `FraudReason`
* [ ] Automated Case Creation:
  * [ ] Automatically trigger fraud cases when risk score $> 70$ or velocity threshold exceeded
  * [ ] Link case to `risk_assessment_id`, `transaction_id`, and `user_id`
* [ ] Fraud Case Lifecycle & State Machine:
  ```text
  OPEN ──► UNDER_REVIEW ──► CONFIRMED / DISMISSED
  ```
* [ ] Case Management APIs:
  ```text
  GET  /internal/v1/fraud/cases
  GET  /internal/v1/fraud/cases/:id
  POST /internal/v1/fraud/cases/:id/review
  POST /internal/v1/fraud/cases/:id/confirm
  POST /internal/v1/fraud/cases/:id/dismiss
  ```

### Testing

* [ ] High-risk transaction automatically spawns `OPEN` fraud case
* [ ] Operator workflow: `OPEN` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `CONFIRMED`
* [ ] Operator workflow: `OPEN` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `DISMISSED`
* [ ] Duplicate fraud case prevention for the same transaction

---

# Sprint 2.5 — Payment Lifecycle & Refund Engine

**Primary:** Go

Complete the payment state machine and implement the atomic refund engine in Go Core.

### Database

* [ ] Database migration: `refunds` table
* [ ] Indexes on `payment_id`, `transaction_id`, `status`
* [ ] CHECK constraints on `amount > 0` and `status IN ('pending', 'completed', 'failed')`

### Payment State Machine (Go)

```text
                  ┌────────────┐
                  │  PENDING   │
                  └─────┬──────┘
                        │
                 Risk evaluation
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
         AUTHORIZED             FAILED
              │
              ▼
          COMPLETED
              │
              ▼
           REFUNDED
```

* [ ] Enforce valid state transitions; reject invalid transitions (`COMPLETED` $\rightarrow$ `PENDING`, `REFUNDED` $\rightarrow$ `COMPLETED`)
* [ ] Atomic payment execution:
  * [ ] Lock customer wallet and merchant wallet with `SELECT ... FOR UPDATE` (ascending UUID order)
  * [ ] Validate customer balance and merchant wallet limit
  * [ ] Debit customer balance, credit merchant balance
  * [ ] Insert `transactions` record (`type = 'payment'`)
  * [ ] Insert `ledger_entries` (debit + credit)
  * [ ] Update `payments` status $\rightarrow$ `completed`

### Refund Engine (Go)

* [ ] `domain/refund.go` — `Refund` entity, `CreateRefundRequest`, `RefundResponse`
* [ ] `RefundRepository` — CRUD and aggregate query `GetTotalRefundedAmount(paymentID)`
* [ ] `RefundService`:
  * [ ] Validate original payment is in `completed` status
  * [ ] Support full and partial refunds
  * [ ] Prevent over-refund (`SUM(completed_refunds) + requested_amount <= payment.amount`)
  * [ ] Atomic financial reversal:
    * [ ] Lock merchant wallet and customer wallet (`SELECT ... FOR UPDATE`)
    * [ ] Debit merchant wallet, credit customer wallet
    * [ ] Insert `transactions` record (`type = 'refund'`)
    * [ ] Insert `ledger_entries` (debit merchant + credit customer)
    * [ ] Update payment status to `refunded` if fully refunded

### API Layer (Go)

```text
POST /api/v1/payments/:id/pay
POST /api/v1/payments/:id/refund
GET  /api/v1/refunds/:id
```

### Testing

* [ ] Full payment execution end-to-end
* [ ] Full refund execution (original payment marked `refunded`)
* [ ] Multiple partial refunds (e.g., Rp 1,000,000 $\rightarrow$ Rp 300,000 + Rp 200,000)
* [ ] Over-refund rejection (attempting to refund more than original payment amount)
* [ ] Concurrent refund race condition protection

---

# Sprint 2.6 — Event-Driven Architecture (Outbox + Kafka)

**Primary:** Go + Java

Introduce domain events and transactional outbox pattern to decouple asynchronous downstream processing.

### Database

* [ ] Database migration: `outbox_events` table
* [ ] Index on `(status, created_at)`

### Go Core (Producer & Outbox)

* [ ] Domain event model (`EventID`, `AggregateType`, `AggregateID`, `EventType`, `Payload`, `Timestamp`)
* [ ] Implement Transactional Outbox:
  * [ ] Write `outbox_events` record inside the **same PostgreSQL transaction** as financial mutations
* [ ] Background Outbox Worker:
  * [ ] Polls pending events from `outbox_events`
  * [ ] Publishes to Kafka topics
  * [ ] Marks status $\rightarrow$ `published` with `published_at` timestamp
  * [ ] Implements exponential backoff retry for failed publishing

### Kafka Infrastructure

* [ ] Add Kafka & Zookeeper / KRaft to `docker-compose.yml`
* [ ] Define topics:
  * [ ] `bastion.payments`
  * [ ] `bastion.transfers`
  * [ ] `bastion.kyc`

### Java Platform (Consumer)

* [ ] Configure Spring Kafka consumer
* [ ] Implement Consumer Idempotency:
  * [ ] Check against `processed_events` table / Redis before handling
* [ ] Implement event listeners for asynchronous risk re-assessment and fraud triggers

### Testing

* [ ] Outbox event created atomically with payment transaction
* [ ] Outbox publisher reliably delivers messages to Kafka
* [ ] Kafka consumer processes events idempotently (duplicate message produces single effect)
* [ ] Outbox worker recovers and retries when Kafka broker temporarily disconnects

---

# Sprint 2.7 — Financial Reconciliation & Notifications

**Primary:** Java

Implement batch reconciliation against external provider statements and asynchronous notification dispatch.

### Database

* [ ] Database migration: `reconciliation_runs` table
* [ ] Database migration: `reconciliation_items` table
* [ ] Database migration: `notifications` table

### Reconciliation Engine (`services/platform/`)

* [ ] Domain: `ReconciliationRun`, `ReconciliationItem`, Discrepancy Enums
* [ ] Workflow:
  ```text
  External Records ──► Ingest & Normalize ──► Match against Ledger ──► Discrepancy Report
  ```
* [ ] Matching Logic:
  * [ ] `MATCHED` — Exact match on reference and amount
  * [ ] `AMOUNT_MISMATCH` — Reference matches, amounts differ
  * [ ] `MISSING_INTERNAL` — Present in external statement, missing in Bastion ledger
  * [ ] `MISSING_EXTERNAL` — Present in Bastion ledger, missing in external statement
* [ ] Discrepancy summary & reporting API (`/internal/v1/reconciliation/*`)

### Notification Platform (`services/platform/`)

* [ ] Domain: `Notification`, Channels (`email`, `in_app`)
* [ ] Kafka event listener listening to `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `PAYMENT_REFUNDED`, `KYC_APPROVED`
* [ ] Asynchronous notification sender with retry mechanism
* [ ] Guarantee: Notification failure never impacts or rolls back financial state

### Testing

* [ ] Complete reconciliation run with 100% matched records
* [ ] Reconciliation run detecting `AMOUNT_MISMATCH` and `MISSING_INTERNAL`
* [ ] Notification listener successfully dispatches on Kafka payment events
* [ ] Simulated notification failure does not corrupt financial transactions

---

# Sprint 2.8 — Production Hardening & Observability

**Primary:** Go + Java

End-to-end stress testing, distributed tracing, metrics, and security audit.

### Observability & Tracing

* [ ] End-to-end trace ID propagation across Go, Java, PostgreSQL, Kafka, and Redis:
  ```text
  request_id ──► payment_id ──► transaction_id ──► event_id
  ```
* [ ] Structured JSON logging with unified log levels
* [ ] Prometheus metrics export (`payment_latency`, `risk_score_distribution`, `fraud_cases_total`)
* [ ] Health check and readiness probes

### Security Audit

* [ ] Internal service-to-service authentication enforcement
* [ ] Rate limiting on public Go APIs using Redis token bucket
* [ ] PII data masking in logs (passwords, card/NIK numbers)
* [ ] Secure environment variable injection and secret management

### Performance & Resilience Testing

* [ ] 100 concurrent payments stress test (verifying no double-charging or race conditions)
* [ ] 100 concurrent partial refunds stress test (verifying no over-refund)
* [ ] Failure injection tests:
  * [ ] Redis downtime handling
  * [ ] Java Risk engine timeout handling
  * [ ] Kafka broker temporary outage recovery
* [ ] Finalize documentation and update API specs in `openapi.yml`

---

# Sprint Dependency Graph

```text
Sprint 2.1: Foundation & Java Platform
                  │
                  ▼
Sprint 2.2: Merchant & Payment Requests
                  │
                  ▼
Sprint 2.3: Risk Assessment Engine
                  │
                  ▼
Sprint 2.4: Fraud Detection & Monitoring
                  │
                  ▼
Sprint 2.5: Payment Lifecycle & Refund Engine
                  │
                  ▼
Sprint 2.6: Event-Driven Architecture (Outbox + Kafka)
                  │
         ┌────────┴────────┐
         ▼                 ▼
Sprint 2.7: Recon & Notify
         │                 │
         └────────┬────────┘
                  ▼
Sprint 2.8: Production Hardening
```

---

# Go vs Java Responsibility Matrix

| Domain / Responsibility | Go Core | Java Platform | Notes |
|---|:---:|:---:|---|
| **User Authentication & KYC** | ✅ | ❌ | Auth, JWT, Redis Blacklist |
| **Wallets & Balances** | ✅ | ❌ | Authoritative balance mutations |
| **Top-up & P2P Transfers** | ✅ | ❌ | Core money movement |
| **Double-Entry Ledger** | ✅ | ❌ | Append-only financial truth |
| **Merchant Management** | ✅ | ❌ | Merchant profiles & wallets |
| **Payment Execution** | ✅ | ❌ | Debit/credit atomic transaction |
| **Refund Execution** | ✅ | ❌ | Ledger reversal & balance updates |
| **Risk Scoring & Rule Pipeline** | ❌ | ✅ | Composable rule engine ($0-100$) |
| **Fraud Case Management** | ❌ | ✅ | Investigative lifecycle & review |
| **Reconciliation Engine** | ❌ | ✅ | Batch ledger comparison & discrepancy reports |
| **Notification Dispatch** | ❌ | ✅ | Async email & in-app delivery |
| **Domain Event Outbox** | ✅ | ❌ | Transactional outbox in PostgreSQL |
| **Event Consumer & Workers** | ❌ | ✅ | Kafka async event processing |

---

# V2 Definition of Done

V2 is considered complete once this end-to-end flow is fully operational:

```text
                    CUSTOMER
                       │
                       ▼
                  Create Payment
                       │
                       ▼
                    GO CORE
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
           Payment          Risk Request
              │                 │
              │                 ▼
              │              JAVA
              │                 │
              │        ┌────────┼────────┐
              │        ▼        ▼        ▼
              │      Risk     Fraud    Rules
              │        │
              │        ▼
              │     Decision
              │        │
              └────────┘
                       │
                       ▼
                GO FINANCIAL TX
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
            Wallet Transaction Ledger
                       │
                       ▼
                  Outbox Event
                       │
                       ▼
                     Kafka
              ┌────────┼─────────┐
              ▼        ▼         ▼
            Fraud   Notification Recon
```
