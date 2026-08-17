# Bastion V2 — Technical Specification

> **Author:** Agam Latiff  
> **Version:** 2.0  
> **Status:** Draft  
> **Previous Version:** V1 — Digital Wallet Transaction Core  

---

## 1. Technical Objective

Bastion V2 extends the existing Go-based financial transaction core with a Java-based financial platform layer.

The architecture must preserve V1's financial correctness while introducing:

* Merchant payments
* Payment lifecycle
* Risk evaluation
* Fraud detection
* Refunds
* Reconciliation
* Notifications
* Domain events
* Asynchronous processing

The primary architectural principle is:

> **Go is authoritative for financial state and money movement. Java provides intelligence, workflows, and supporting financial operations.**

---

## 2. Architecture Overview

V2 uses a **modular service-oriented architecture**.

```text
                         ┌─────────────┐
                         │   Client    │
                         └──────┬──────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │    Go Core API   │
                     │      Gin         │
                     └────────┬─────────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
           Identity         Wallet          Payment
              │               │                │
              └───────────────┼────────────────┘
                              │
                              ▼
                         Ledger/Core
                              │
                              ▼
                    ┌──────────────────┐
                    │  Java Platform   │
                    │  Spring Boot     │
                    └────────┬─────────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
           Risk            Fraud        Reconciliation
```

The initial implementation remains relatively simple.

We do **not** immediately split every domain into independent microservices.

---

## 3. Service Architecture

V2 consists of two primary applications.

```text
services/
├── core/
│   └── Go
│
└── platform/
    └── Java
```

### 3.1 Go Core

Go remains the primary financial system.

Responsibilities:

```text
Go Core
├── Authentication
├── Users
├── KYC
├── Wallets
├── Top-up
├── P2P Transfer
├── Merchant Payment Execution
├── Refund Execution
├── Transactions
├── Ledger
└── Idempotency
```

Go owns all operations that directly mutate authoritative financial state.

---

### 3.2 Java Platform

Java handles higher-level financial logic.

```text
Java Platform
├── Risk Engine
├── Fraud Detection
├── Transaction Monitoring
├── Merchant Workflows
├── Reconciliation
├── Notification
└── Financial Workflow
```

Java must **not directly modify wallet balances or ledger records**.

Instead:

```text
Java
  │
  │ decision
  ▼
Go Core
  │
  │ financial mutation
  ▼
PostgreSQL
```

---

## 4. Technology Stack

### Go Core

| Component      | Technology                 |
| -------------- | -------------------------- |
| Language       | Go                         |
| HTTP           | Gin                        |
| Database       | PostgreSQL 16              |
| DB Driver      | pgx / pgxpool              |
| Cache          | Redis 7                    |
| Authentication | JWT                        |
| Architecture   | Clean Architecture         |
| API            | REST                       |
| Testing        | Go testing + race detector |
| Container      | Docker                     |

---

### Java Platform

| Component   | Technology      |
| ----------- | --------------- |
| Language    | Java            |
| Framework   | Spring Boot     |
| Persistence | Spring Data JPA |
| Database    | PostgreSQL      |
| Cache       | Redis           |
| API         | REST            |
| Testing     | JUnit           |
| Container   | Docker          |

Kafka is introduced later in Sprint 2.6 rather than being required from day one.

---

## 5. Communication Model

V2 uses two communication models.

### Synchronous

Used when an immediate decision is required.

```text
Go
 │
 │ HTTP
 ▼
Java Risk API
 │
 ▼
Risk Decision
 │
 ▼
Go
```

Example:

```http
POST /internal/v1/risk/assess
```

Response:

```json
{
  "risk_score": 72,
  "decision": "REVIEW",
  "reasons": [
    "HIGH_AMOUNT",
    "HIGH_VELOCITY"
  ]
}
```

---

### Asynchronous

Introduced in Sprint 2.6.

```text
Go
 │
 ▼
Message Broker
 │
 ├── Risk
 ├── Fraud
 ├── Notification
 └── Reconciliation
```

Asynchronous processing is used for operations that do not need to block the financial transaction.

---

## 6. Financial Source of Truth

PostgreSQL remains the authoritative source of financial state.

```text
Wallet Balance
       │
       ▼
PostgreSQL
       │
       ├── wallets
       ├── transactions
       └── ledger_entries
```

Redis is **not** the source of truth for financial balances.

Redis may be used for:

* Idempotency
* Caching
* Token blacklist
* Temporary risk data
* Rate limiting

---

## 7. Financial Transaction Boundary

All financial state mutations must execute inside appropriate database transactions.

Example payment:

```text
BEGIN
  │
  ├── Validate payment
  ├── Lock wallet
  ├── Validate balance
  ├── Validate payment state
  ├── Debit customer
  ├── Credit merchant
  ├── Create transaction
  ├── Create ledger entries
  └── COMMIT
```

If any step fails:

```text
ROLLBACK
```

The financial transaction must never leave a partially updated state.

---

## 8. Payment Architecture

Payment execution is owned by Go.

The high-level flow is:

```text
Client
  │
  ▼
Go Payment API
  │
  ├── Validate request
  ├── Validate payment status
  ├── Validate wallet
  │
  ▼
Java Risk Service
  │
  ├── APPROVE
  ├── MONITOR
  └── REVIEW
  │
  ▼
Go
  │
  ├── Lock wallet(s)
  ├── Execute financial mutation
  ├── Create transaction
  └── Create ledger
  │
  ▼
COMPLETED
```

The exact treatment of `MONITOR` and `REVIEW` should be finalized during implementation.

---

## 9. Payment State Machine

Payment state transitions must be explicitly controlled.

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

Invalid transitions must return an error.

For example:

```text
COMPLETED → PENDING
REFUNDED  → COMPLETED
FAILED    → REFUNDED
```

must not be allowed.

The payment state transition logic should be centralized rather than duplicated across handlers.

---

## 10. Risk Engine

The Risk Engine is implemented in Java.

### Input

```json
{
  "transaction_id": "uuid",
  "user_id": "uuid",
  "amount": 8500000,
  "receiver_id": "uuid"
}
```

### Processing

```text
Transaction
    │
    ▼
Risk Engine
    │
    ├── Amount Rule
    ├── Velocity Rule
    ├── User History Rule
    ├── Recipient Rule
    └── Time Rule
    │
    ▼
Risk Score
```

### Output

```json
{
  "risk_score": 78,
  "decision": "REVIEW",
  "reasons": [
    "HIGH_AMOUNT",
    "NEW_RECIPIENT"
  ]
}
```

The first implementation uses deterministic rules.

No machine learning is required for V2.

---

## 11. Risk Rule Architecture

Java should avoid hardcoding every rule inside one large service method.

Recommended structure:

```text
RiskEngine
    │
    ├── AmountRule
    ├── VelocityRule
    ├── TimeRule
    ├── RecipientRule
    └── HistoryRule
```

Each rule evaluates a transaction and contributes to the risk score.

Conceptually:

```text
RiskScore =
    AmountRisk
  + VelocityRisk
  + TimeRisk
  + RecipientRisk
  + HistoryRisk
```

This allows future rules to be added without rewriting the entire engine.

---

## 12. Fraud Detection

Fraud detection builds on the Risk Engine.

```text
Transaction
     │
     ▼
Risk Assessment
     │
     ▼
High Risk?
  │       │
 NO      YES
  │       │
  ▼       ▼
Continue Fraud Case
```

Fraud cases are stored separately from financial transactions.

A fraud investigation must never modify the historical transaction record.

---

## 13. Refund Architecture

Refunds are financial operations and therefore belong to Go's transaction core.

Java may participate in the workflow, but Go executes the actual money movement.

```text
Refund Request
      │
      ▼
Go
      │
      ├── Validate original payment
      ├── Validate refundable amount
      ├── Lock financial records
      ├── Debit merchant
      ├── Credit customer
      ├── Create refund transaction
      └── Create ledger entries
```

The original payment remains immutable.

---

## 14. Reconciliation Architecture

Reconciliation is primarily handled by Java.

```text
External Records
      │
      ▼
Java Reconciliation
      │
      ├── Normalize
      ├── Match
      ├── Detect discrepancy
      └── Generate result
```

Example:

```text
Internal Transaction
       │
       │ match
       ▼
External Transaction
       │
       ├── MATCH
       ├── AMOUNT_MISMATCH
       ├── MISSING_INTERNAL
       └── MISSING_EXTERNAL
```

Java produces reconciliation results.

It must not directly alter the historical financial ledger to hide discrepancies.

---

## 15. Event Architecture

Starting in Sprint 2.6, Bastion introduces domain events.

Example:

```json
{
  "event_id": "uuid",
  "event_type": "PAYMENT_COMPLETED",
  "occurred_at": "timestamp",
  "aggregate_id": "uuid",
  "payload": {}
}
```

Events must contain:

* Event ID
* Event type
* Aggregate ID
* Timestamp
* Payload
* Schema/version information

---

## 16. Event Idempotency

Consumers must tolerate duplicate events.

Example:

```text
PAYMENT_COMPLETED
      │
      ├── delivered once
      └── delivered again
```

The consumer must not send two notifications or create two fraud records.

A consumer may maintain:

```text
processed_events
```

or use an equivalent idempotency mechanism.

---

## 17. Event Delivery

The initial event architecture should prioritize reliability over complexity.

Recommended flow:

```text
Go Transaction
      │
      ▼
Database Transaction
      │
      ├── Financial State
      └── Outbox Event
              │
              ▼
          Publisher
              │
              ▼
           Kafka
```

The **transactional outbox pattern** should be used when asynchronous processing is introduced.

This prevents:

```text
DB COMMIT succeeded
Kafka publish failed
```

from causing the financial event to disappear.

---

## 18. Database Ownership

Services must have clear ownership.

### Go owns

```text
users
wallets
transactions
ledger_entries
kyc_verifications
payments
refunds
idempotency records
```

### Java owns

```text
risk_assessments
risk_rules
fraud_cases
reconciliation_runs
reconciliation_items
notifications
```

Java should not directly update:

```text
wallets.balance
ledger_entries
transactions
```

---

## 19. API Design

Public APIs remain exposed through the Go API layer.

Example:

```text
/api/v1/auth/*
/api/v1/wallet/*
/api/v1/payments/*
/api/v1/merchants/*
```

Java APIs are internal.

```text
/internal/v1/risk/*
/internal/v1/fraud/*
/internal/v1/reconciliation/*
```

Internal APIs must require service authentication.

---

## 20. Error Handling

Both services should use consistent error semantics.

Example:

```json
{
  "status": "error",
  "message": "Payment cannot be completed",
  "data": null,
  "error": {
    "code": "INSUFFICIENT_BALANCE"
  }
}
```

Financial errors should use stable machine-readable error codes.

Examples:

```text
INSUFFICIENT_BALANCE
PAYMENT_EXPIRED
PAYMENT_ALREADY_COMPLETED
REFUND_EXCEEDS_PAYMENT
RISK_REVIEW_REQUIRED
MERCHANT_SUSPENDED
DUPLICATE_REQUEST
```

---

## 21. Security

### Go

Responsible for:

* Authentication
* JWT validation
* User authorization
* Rate limiting
* Input validation
* Idempotency
* Public API protection

### Java

Responsible for:

* Internal service authentication
* Secure processing of risk data
* Access control for operator functions
* Sensitive data protection

Service-to-service communication must not rely solely on network location.

---

## 22. Observability

Every request and financial operation should have traceable identifiers.

```text
request_id
transaction_id
payment_id
event_id
user_id
```

Example:

```text
Request
  │
  ├── request_id
  ├── payment_id
  └── transaction_id
       │
       ├── Risk Assessment
       ├── Ledger
       ├── Event
       └── Notification
```

This allows a single payment to be traced across Go, Java, database, and messaging infrastructure.

---

## 23. Testing Strategy

### Go

Required tests:

* Unit tests
* Repository integration tests
* API tests
* Transaction tests
* Concurrent transfer tests
* Race detector
* Idempotency tests
* Deadlock tests

Example:

```text
100 concurrent transfers
        ↓
Expected:
No double spending
No negative balance
No duplicate transaction
No deadlock
```

---

### Java

Required tests:

* Unit tests
* Risk rule tests
* Risk engine tests
* API tests
* Integration tests
* Event consumer tests
* Duplicate event tests

Example:

```text
Transaction
   ↓
Risk Rules
   ↓
Expected score
   ↓
Expected decision
```

---

## 24. Failure Handling

V2 must explicitly handle partial failures.

### Java unavailable

If a risk assessment is mandatory:

```text
Go → Java
       X
       ↓
Payment does NOT silently execute.
```

The transaction should fail or enter an appropriate pending state.

### Notification unavailable

Financial transaction should still succeed.

```text
Payment
  ↓
COMMIT
  ↓
Notification
  ↓
FAIL
  ↓
Retry asynchronously
```

### Kafka unavailable

Financial database transaction must remain safe.

The outbox record remains available for later publishing.

---

## 25. Performance Requirements

Initial targets:

| Operation            | Target |
| -------------------- | -----: |
| Wallet read          | <100ms |
| Standard transaction | <300ms |
| Risk assessment      | <200ms |
| Internal API         | <200ms |
| Event processing     |    <2s |

These are engineering targets rather than hard SLA commitments.

The system must prioritize **financial correctness over raw throughput**.

---

## 26. Deployment

Development environment:

```text
Docker Compose
│
├── PostgreSQL
├── Redis
├── Go Core
├── Java Platform
└── Kafka
```

Kafka is added only from the event-driven sprint onward.

Production deployment can later evolve toward:

```text
                    Load Balancer
                         │
                  ┌──────┴──────┐
                  ▼             ▼
               Go Core       Go Core
                  │             │
                  └──────┬──────┘
                         │
                      Kafka
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
           Java        Java        Java
           Risk        Fraud       Recon
```

---

## 27. Architecture Principles

### Principle 1 — Financial truth stays in Go/PostgreSQL
No secondary service becomes the authority for wallet balances.

### Principle 2 — Java does not own money
Java can recommend, evaluate, orchestrate, and analyze. Go commits financial state.

### Principle 3 — Transactions are immutable
Historical financial records are not rewritten.

### Principle 4 — Events are supplementary
Events communicate what happened. They do not replace the financial database as the source of truth.

### Principle 5 — Start synchronous, evolve asynchronous
Don't introduce Kafka merely because V2 uses multiple languages.

### Principle 6 — Correctness before scale
Financial correctness is more important than maximizing throughput.

### Principle 7 — Services have explicit ownership
Avoid shared mutable domain ownership between Go and Java.

---

## 28. V2 Evolution Path

```text
Sprint 2.1
Foundation
    ↓
Sprint 2.2
Payment + Merchant
    ↓
Sprint 2.3
Risk
    ↓
Sprint 2.4
Fraud
    ↓
Sprint 2.5
Refund
    ↓
Sprint 2.6
Events + Kafka
    ↓
Sprint 2.7
Reconciliation
    ↓
Sprint 2.8
Production Hardening
```

---

## 29. Future Compatibility

The V2 architecture must allow future versions to introduce:

```text
V3
├── External Payment Providers
├── Bank Integration
├── Payouts
├── Payment Links
├── Subscriptions
├── Multi-Currency
└── Developer APIs
```

and potentially V4:

```text
V4
├── Advanced Fraud Detection
├── ML Risk Models
├── Automated Financial Operations
├── Intelligent Reconciliation
└── Predictive Analytics
```

V2 must not tightly couple itself to these future features.

---

## 30. Final Architecture Decision

The fundamental architecture decision for Bastion V2 is:

```text
                 ┌──────────────────────┐
                 │      BASTION V2      │
                 └──────────┬───────────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
       ┌─────▼─────┐                 ┌─────▼─────┐
       │  GO CORE  │                 │   JAVA    │
       │            │                 │ PLATFORM  │
       ├────────────┤                 ├───────────┤
       │ Wallet     │                 │ Risk      │
       │ Payment    │                 │ Fraud     │
       │ Transfer   │                 │ Merchant  │
       │ Ledger     │                 │ Workflow  │
       │ Refund     │                 │ Recon     │
       └─────┬──────┘                 └─────┬─────┘
             │                              │
             └──────────────┬───────────────┘
                            │
                         Events
                            │
                         Kafka
                            │
                     Async Processing
```

**Core rule:**

> **Go owns financial truth. Java owns financial intelligence.**
