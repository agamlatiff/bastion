# Bastion V2 — Task Tracker

> **Author:** Agam Latiff  
> **Version:** 2.0  
> **Status:** Active  
> **Convention:** `[x]` completed, `[/]` in progress, `[ ]` not started  
> **Architecture:** Go Core + Java Platform  
> **Database:** PostgreSQL 16  
> **Cache:** Redis 7  
> **Messaging:** Kafka (introduced later)  

---

# Level 1 — Payment Foundation

## Sprint 2.1 — V1 Completion & V2 Foundation

**Primary:** Go

Before entering V2 features, the V1 financial core must be rock solid.

### Go Core

* [ ] Complete P2P Transfer
  * [ ] `TransferRequest`
  * [ ] `LedgerEntry`
  * [ ] Wallet locking
  * [ ] Deadlock prevention
  * [ ] Balance validation
  * [ ] Receiver balance limit
  * [ ] Self-transfer prevention
  * [ ] Transaction creation
  * [ ] Ledger entries
* [ ] Redis idempotency
  * [ ] Transfer
  * [ ] Top-up
* [ ] Persistent idempotency records
* [ ] Audit logging
* [ ] Concurrent transfer tests
* [ ] 100-request stress test
* [ ] Race-condition validation
* [ ] Deadlock validation
* [ ] Duplicate-request validation

### Database

* [ ] `ledger_entries`
* [ ] `audit_logs`
* [ ] `idempotency_records`

### Testing

* [ ] A → B transfer
* [ ] B → A concurrent transfer
* [ ] Insufficient balance
* [ ] Receiver limit
* [ ] Duplicate request
* [ ] Concurrent duplicate request
* [ ] Negative balance prevention

### Definition of Done

```text
V1 Financial Core
      ↓
Atomic
      ↓
Idempotent
      ↓
Concurrency Safe
      ↓
Ready for V2
```

---

# Level 2 — Merchant & Payment

## Sprint 2.2 — Merchant Account

**Primary:** Go

### Database

* [ ] Create `merchants`
* [ ] Merchant status
* [ ] Merchant-user relationship
* [ ] Merchant indexes

### Domain

* [ ] `Merchant`
* [ ] `CreateMerchantRequest`
* [ ] `MerchantResponse`

### Repository

* [ ] `Create`
* [ ] `FindByID`
* [ ] `FindByUserID`
* [ ] `UpdateStatus`

### Service

* [ ] Merchant registration
* [ ] Merchant activation
* [ ] Merchant suspension
* [ ] Merchant authorization

### API

```text
POST /api/v1/merchants
GET  /api/v1/merchants/me
POST /api/v1/merchants/:id/activate
POST /api/v1/merchants/:id/suspend
```

### Testing

* [ ] Register merchant
* [ ] Duplicate merchant
* [ ] Activate merchant
* [ ] Suspend merchant
* [ ] Unauthorized merchant access

---

## Sprint 2.3 — Payment Engine

**Primary:** Go

### Database

* [ ] Create `payments`
* [ ] Payment indexes
* [ ] Payment status constraints

### Domain

* [ ] `Payment`
* [ ] `CreatePaymentRequest`
* [ ] `PaymentResponse`
* [ ] Payment status enum

### Service

* [ ] Create payment
* [ ] Validate merchant
* [ ] Validate customer
* [ ] Validate amount
* [ ] Validate wallet
* [ ] Payment expiration
* [ ] Payment state machine

### Payment State Machine

```text
PENDING
   │
   ▼
AUTHORIZED
   │
   ▼
COMPLETED
   │
   ▼
REFUNDED
```

Failure paths:

```text
PENDING → FAILED
PENDING → CANCELLED
```

### API

```text
POST /api/v1/payments
GET  /api/v1/payments/:id
POST /api/v1/payments/:id/cancel
```

### Testing

* [ ] Successful payment
* [ ] Insufficient balance
* [ ] Invalid merchant
* [ ] Expired payment
* [ ] Duplicate payment
* [ ] Invalid state transition
* [ ] Concurrent payment

---

# Level 3 — Java Platform

## Sprint 2.4 — Java/Spring Boot Foundation

**Primary:** Java

Now Java officially enters Bastion.

### Project

```text
services/
├── core/
│   └── Go
│
└── platform/
    └── Java
```

### Setup

* [ ] Initialize Spring Boot project
* [ ] Configure Maven/Gradle
* [ ] Configure PostgreSQL
* [ ] Configure Redis
* [ ] Configure environment variables
* [ ] Dockerfile
* [ ] Docker Compose integration

### Architecture

```text
Java
├── controller
├── service
├── domain
├── repository
├── config
└── exception
```

### Internal API

```text
POST /internal/v1/risk/assess
```

### Security

* [ ] Internal service authentication
* [ ] Request validation
* [ ] Error handling
* [ ] Request ID propagation

### Testing

* [ ] Spring context test
* [ ] Controller test
* [ ] Service test
* [ ] Repository test
* [ ] Internal API test

---

# Level 4 — Risk Intelligence

## Sprint 2.5 — Risk Engine

**Primary:** Java

This is the first major reason Java exists in V2.

### Database

* [ ] `risk_assessments`
* [ ] Risk indexes

### Domain

* [ ] `RiskAssessment`
* [ ] `RiskDecision`
* [ ] `RiskReason`

### Rule Engine

* [ ] `AmountRule`
* [ ] `VelocityRule`
* [ ] `TimeRule`
* [ ] `RecipientRule`
* [ ] `HistoryRule`

Architecture:

```text
RiskEngine
    │
    ├── AmountRule
    ├── VelocityRule
    ├── TimeRule
    ├── RecipientRule
    └── HistoryRule
```

### Scoring

```text
0–30   → APPROVE
31–70  → MONITOR
71–100 → REVIEW
```

Thresholds should remain configurable.

### API

```text
POST /internal/v1/risk/assess
```

### Go Integration

Payment flow becomes:

```text
Client
  │
  ▼
Go Payment
  │
  ▼
Java Risk
  │
  ├── APPROVE
  ├── MONITOR
  └── REVIEW
  │
  ▼
Go Financial Transaction
```

### Testing

* [ ] Low-risk transaction
* [ ] High-value transaction
* [ ] High velocity
* [ ] New recipient
* [ ] Multiple risk factors
* [ ] Risk score boundary
* [ ] Java unavailable

---

# Level 5 — Fraud Detection

## Sprint 2.6 — Fraud Monitoring

**Primary:** Java

### Database

* [ ] `fraud_cases`
* [ ] Fraud indexes

### Domain

* [ ] `FraudCase`
* [ ] `FraudStatus`
* [ ] `FraudReason`

### Service

* [ ] Create fraud case
* [ ] Assign case
* [ ] Review case
* [ ] Confirm fraud
* [ ] Dismiss fraud

### State Machine

```text
OPEN
 │
 ▼
UNDER_REVIEW
 │
 ├───────────────┐
 ▼               ▼
CONFIRMED      DISMISSED
```

### API

```text
GET  /internal/v1/fraud/cases
GET  /internal/v1/fraud/cases/:id
POST /internal/v1/fraud/cases/:id/review
POST /internal/v1/fraud/cases/:id/confirm
POST /internal/v1/fraud/cases/:id/dismiss
```

### Testing

* [ ] High-risk transaction creates case
* [ ] Case review
* [ ] Confirm fraud
* [ ] Dismiss false positive
* [ ] Duplicate fraud event

---

# Level 6 — Refund & Reversal

## Sprint 2.7 — Refund Engine

**Primary:** Go

### Database

* [ ] `refunds`
* [ ] Refund indexes

### Domain

* [ ] `Refund`
* [ ] `CreateRefundRequest`
* [ ] `RefundResponse`

### Service

* [ ] Validate payment
* [ ] Validate refundable amount
* [ ] Support partial refund
* [ ] Prevent over-refund
* [ ] Execute atomic wallet mutation
* [ ] Create refund transaction
* [ ] Create ledger entries

### API

```text
POST /api/v1/payments/:id/refund
GET  /api/v1/refunds/:id
```

### Example

```text
Payment
Rp1.000.000

Refund
Rp300.000

Remaining
Rp700.000
```

### Testing

* [ ] Full refund
* [ ] Partial refund
* [ ] Multiple partial refunds
* [ ] Over-refund blocked
* [ ] Refund failed
* [ ] Concurrent refund
* [ ] Duplicate refund request

---

# Level 7 — Event-Driven Architecture

## Sprint 2.8 — Outbox + Kafka

**Primary:** Go + Java

This sprint changes how the two systems communicate.

### Database

* [ ] `outbox_events`
* [ ] Outbox indexes

### Go

* [ ] Domain event model
* [ ] Outbox repository
* [ ] Write event in same transaction
* [ ] Outbox publisher
* [ ] Retry mechanism
* [ ] Failed event handling

### Events

Initial events:

```text
PAYMENT_CREATED
PAYMENT_COMPLETED
PAYMENT_FAILED
PAYMENT_REFUNDED
TRANSFER_COMPLETED
KYC_APPROVED
```

### Kafka

* [ ] Add Kafka to Docker Compose
* [ ] Create topics
* [ ] Configure producer
* [ ] Configure consumer
* [ ] Consumer retry
* [ ] Consumer idempotency

### Java

* [ ] Kafka consumer
* [ ] Risk event consumer
* [ ] Fraud event consumer
* [ ] Notification consumer

Architecture:

```text
                     Go
                      │
                PostgreSQL
                      │
                 outbox_events
                      │
                      ▼
                    Kafka
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
        Risk        Fraud      Notification
        Java         Java         Java
```

---

# Level 8 — Notification

## Sprint 2.9 — Notification Platform

**Primary:** Java

### Database

* [ ] `notifications`

### Events

Listen to:

```text
PAYMENT_COMPLETED
PAYMENT_FAILED
PAYMENT_REFUNDED
TRANSFER_COMPLETED
KYC_APPROVED
```

### Channels

V2 initial implementation:

* [ ] In-app
* [ ] Email

Push notifications can remain future work.

### Service

```text
NotificationService
       │
       ├── EmailNotification
       └── InAppNotification
```

### Reliability

* [ ] Retry failed notifications
* [ ] Duplicate event protection
* [ ] Delivery status
* [ ] Failed notification handling

### Important

Notification failure must **never rollback financial transactions**.

---

# Level 9 — Reconciliation

## Sprint 2.10 — Financial Reconciliation

**Primary:** Java

This is another major Java responsibility.

### Database

* [ ] `reconciliation_runs`
* [ ] `reconciliation_items`

### Workflow

```text
External Records
       │
       ▼
Normalize
       │
       ▼
Match
       │
       ├── MATCHED
       ├── AMOUNT_MISMATCH
       ├── MISSING_INTERNAL
       └── MISSING_EXTERNAL
```

### Service

* [ ] Create reconciliation run
* [ ] Import external records
* [ ] Match transactions
* [ ] Calculate discrepancy
* [ ] Generate reconciliation report

### Testing

* [ ] All records matched
* [ ] Missing internal
* [ ] Missing external
* [ ] Amount mismatch
* [ ] Duplicate external reference
* [ ] Large reconciliation batch

---

# Level 10 — Production Hardening

## Sprint 2.11 — Observability & Security

**Primary:** Go + Java

### Observability

* [ ] Request ID
* [ ] Transaction ID
* [ ] Payment ID
* [ ] Event ID
* [ ] Structured logging
* [ ] Error correlation

Example:

```text
request_id
    │
    ├── payment_id
    │
    ├── transaction_id
    │
    ├── risk_assessment_id
    │
    └── event_id
```

### Security

* [ ] Internal service authentication
* [ ] API rate limiting
* [ ] Input validation
* [ ] Sensitive-data masking
* [ ] Secret management
* [ ] CORS configuration
* [ ] Security headers

### Testing

* [ ] Authentication tests
* [ ] Authorization tests
* [ ] Rate-limit tests
* [ ] Invalid payload tests
* [ ] Service authentication tests

---

# Level 11 — Performance & Reliability

## Sprint 2.12 — Load & Failure Testing

**Primary:** Go + Java

### Go

* [ ] Concurrent transfers
* [ ] Concurrent payments
* [ ] Concurrent refunds
* [ ] Idempotency under load
* [ ] Database lock testing

### Java

* [ ] Risk engine load test
* [ ] Fraud processing load test
* [ ] Kafka consumer load test
* [ ] Notification throughput test

### Failure Scenarios

* [ ] PostgreSQL unavailable
* [ ] Redis unavailable
* [ ] Java unavailable
* [ ] Kafka unavailable
* [ ] Kafka duplicate event
* [ ] Notification failure
* [ ] Risk service timeout

---

# Sprint Dependency

This ordering is critical to avoid implementing Java components prematurely before the Go transaction foundation is ready.

```text
2.1 V1 Completion
       │
       ▼
2.2 Merchant
       │
       ▼
2.3 Payment
       │
       ├──────────────┐
       ▼              ▼
2.4 Java Foundation
       │
       ▼
2.5 Risk
       │
       ▼
2.6 Fraud
       
2.3 Payment
       │
       ▼
2.7 Refund
       
2.5 / 2.6 / 2.7
       │
       ▼
2.8 Kafka + Events
       │
       ├─────────────┬─────────────┐
       ▼             ▼             ▼
     2.9           2.10          Future
 Notification   Reconciliation
       │             │
       └──────┬──────┘
              ▼
          2.11 Security
              │
              ▼
          2.12 Load Test
```

---

# Go vs Java — Final Responsibility

To maintain crystal-clear separation during development:

| Feature                  |   Go  |  Java |
| ------------------------ | :---: | :---: |
| Auth                     |   ✅   |       |
| User                     |   ✅   |       |
| Wallet                   |   ✅   |       |
| Top-up                   |   ✅   |       |
| P2P Transfer             |   ✅   |       |
| Ledger                   |   ✅   |       |
| Merchant                 |   ✅   |       |
| Payment execution        |   ✅   |       |
| Refund                   |   ✅   |       |
| Idempotency              |   ✅   |       |
| Risk assessment          |       |   ✅   |
| Risk rules               |       |   ✅   |
| Fraud detection          |       |   ✅   |
| Fraud case               |       |   ✅   |
| Notification             |       |   ✅   |
| Reconciliation           |       |   ✅   |
| Kafka consumer           |       |   ✅   |
| Financial event creation |   ✅   |       |
| Financial state mutation | **✅** | **❌** |

When implementing a feature and questioning:

> **"Does this belong in Go or Java?"**

Apply this simple rule:

**Does this code determine or mutate money balances/records? → Go.**

**Does this code evaluate, analyze, orchestrate workflows, or react to events? → Java.**

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
