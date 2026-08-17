# Bastion V2 — Product Requirements Document

> **Author:** Agam Latiff  
> **Version:** 2.0  
> **Status:** Draft  
> **Product:** Bastion  
> **Previous Version:** V1 — Digital Wallet Transaction Core  

---

## 1. Product Overview

Bastion V2 evolves Bastion from a **digital wallet transaction core** into an extensible **financial platform**.

Bastion V1 establishes the foundation for:

* User authentication
* KYC verification
* Wallet management
* Top-up
* P2P transfers
* Transaction history
* Ledger integrity
* Idempotency
* Concurrency safety
* Audit logging

V2 builds on that foundation by introducing capabilities around the transaction core:

* Merchant payments
* Payment lifecycle management
* Risk assessment
* Fraud detection
* Transaction monitoring
* Refunds
* Financial reconciliation
* Notifications
* Event-driven processing

The fundamental principle remains:

> **Go owns the movement and integrity of money. Java owns complex financial intelligence and workflows around money.**

---

## 2. Problem Statement

Bastion V1 solves the fundamental problem of securely moving money between wallets.

However, a realistic financial platform needs to answer additional questions:

* Who is the merchant receiving the payment?
* Is this transaction suspicious?
* Should a transaction be approved, monitored, or reviewed?
* What happens when a payment fails?
* Can a completed payment be refunded?
* How are internal transactions reconciled against external systems?
* How can other services react to financial events without tightly coupling themselves to the transaction core?
* How can the platform support increasingly complex financial workflows?

V2 addresses these problems without compromising the transaction integrity established in V1.

---

## 3. Product Vision

> **Build an extensible financial platform around a reliable transaction core.**

V1 answers:

> **“Can Bastion move money correctly?”**

V2 answers:

> **“Can Bastion operate financial transactions intelligently and reliably?”**

---

## 4. Goals

### 4.1 Primary Goals

#### G1 — Extend the wallet into a payment platform
Support transactions between users and merchants.

#### G2 — Introduce financial risk evaluation
Evaluate transactions before or around execution using configurable rules.

#### G3 — Detect suspicious transaction behavior
Identify abnormal transaction patterns and create fraud cases for investigation.

#### G4 — Introduce complete payment lifecycle management
Support states such as:

```text
PENDING
   ↓
AUTHORIZED
   ↓
COMPLETED
```

and failure/cancellation/refund flows.

#### G5 — Introduce reconciliation
Allow Bastion to compare internal financial records with external financial records.

#### G6 — Introduce asynchronous processing
Allow financial events to be consumed by independent services without tightly coupling them to the transaction core.

#### G7 — Demonstrate Go + Java engineering capability
Use Go and Java where each language provides a meaningful architectural responsibility.

---

## 5. Non-Goals

V2 will **not** attempt to become a real banking system.

The following are explicitly outside V2 scope:

* Real bank account integration
* Real-money settlement
* Credit card issuing
* Cryptocurrency
* Lending
* Investment products
* Full AML regulatory compliance
* Machine-learning fraud detection
* AI financial advisor
* Multi-country regulatory support

These can be considered for future versions.

---

## 6. Target Users

### 6.1 Wallet User

A user who:

* Owns a Bastion wallet
* Tops up funds
* Sends money
* Pays merchants
* Receives refunds
* Views transaction history

---

### 6.2 Merchant

A business that:

* Owns a merchant account
* Creates payment requests
* Receives customer payments
* Views payment history
* Requests refunds
* Tracks settlements

---

### 6.3 Financial Operator

An internal operator responsible for:

* Reviewing suspicious transactions
* Investigating fraud cases
* Reviewing reconciliation discrepancies
* Monitoring financial activity

---

## 7. V2 Core Domains

V2 consists of the following domains:

```text
                    BASTION V2
                        │
        ┌───────────────┼────────────────┐
        │               │                │
      Wallet          Payments          Risk
        │               │                │
        │           Merchant          Fraud
        │           Refunds          Monitoring
        │               │                │
        └───────────────┼────────────────┘
                        │
                  Financial Ops
                        │
              Reconciliation
                        │
                   Events
```

---

## 8. Functional Requirements

### 8.1 Merchant Management

Bastion must support merchant accounts.

#### Features

* Merchant registration
* Merchant profile
* Merchant status
* Merchant wallet
* Merchant identification
* Merchant transaction history

#### Merchant states

```text
PENDING
ACTIVE
SUSPENDED
```

Only active merchants may receive payments.

---

## 9. Payment Requests

A merchant must be able to create a payment request.

Example:

```text
Merchant
   │
   │ Create payment
   ▼
Payment Request
   │
   ├── amount
   ├── merchant
   ├── reference
   ├── expiration
   └── status
```

Payment requests must have a unique identifier.

### Requirements

* Create payment request
* Retrieve payment request
* Expire payment request
* Pay payment request
* Prevent payment after expiration
* Prevent duplicate payment

---

## 10. Payment Lifecycle

V2 introduces a formal payment state machine.

```text
             ┌───────────┐
             │  PENDING  │
             └─────┬─────┘
                   │
             risk evaluation
                   │
          ┌────────┴────────┐
          ▼                 ▼
     AUTHORIZED           FAILED
          │
          ▼
      COMPLETED
          │
          ▼
       REFUNDED
```

A payment must never transition arbitrarily between states.

Example:

```text
COMPLETED → PENDING
```

must be rejected.

---

## 11. Risk Assessment

Before a high-risk payment is completed, Bastion should evaluate the transaction.

The Risk Engine is implemented as a Java service.

### Initial risk signals

* Transaction amount
* Transaction frequency
* User transaction history
* Recipient history
* Unusual transaction time
* Repeated failed transactions
* New recipient
* Transaction velocity

The initial implementation will use deterministic rules rather than machine learning.

---

## 12. Risk Score

The Risk Engine produces a score between 0 and 100.

```text
0 ─────────────────────────────── 100
│              │             │
LOW          MONITOR        REVIEW
```

Example:

```text
0–30    → APPROVE
31–70   → MONITOR
71–100  → REVIEW
```

The exact thresholds should be configurable.

---

## 13. Fraud Detection

Transactions identified as suspicious may generate a fraud case.

Example:

```text
Transaction
     │
     ▼
Risk Engine
     │
     ▼
Risk Score = 85
     │
     ▼
Fraud Case
     │
     ├── reason
     ├── transaction
     ├── user
     ├── risk score
     └── status
```

Fraud cases may have states:

```text
OPEN
UNDER_REVIEW
CONFIRMED
DISMISSED
```

---

## 14. Refunds

Completed payments may be refunded.

V2 must support:

* Full refund
* Partial refund
* Refund reason
* Refund status
* Refund transaction record

A refund must create appropriate financial records.

The original transaction must remain immutable.

---

## 15. Reconciliation

Bastion must support reconciliation between internal and external transaction records.

Example:

```text
Bastion
Rp100,000
     │
     │ compare
     ▼
External Provider
Rp100,000
     │
     ▼
MATCH
```

Or:

```text
Bastion
Rp100,000

External
Rp95,000

     ↓

DISCREPANCY
```

### Requirements

* Create reconciliation run
* Import external transaction records
* Match transactions
* Identify unmatched records
* Identify amount discrepancies
* Track reconciliation status
* Generate reconciliation results

---

## 16. Notifications

Bastion should generate notifications for important financial events.

Examples:

* Payment completed
* Payment failed
* Payment refunded
* Suspicious transaction
* KYC approved
* Transfer completed

Notification delivery should not block the financial transaction.

---

## 17. Event-Driven Architecture

V2 introduces financial domain events.

Examples:

```text
TransactionCreated
TransactionCompleted
TransactionFailed

PaymentCreated
PaymentCompleted
PaymentFailed
RefundCreated

RiskAssessmentCompleted
FraudCaseCreated

KYCApproved
```

Events should be immutable.

Consumers must be designed to safely process duplicate events.

---

## 18. Go Responsibilities

Go remains responsible for the **financial transaction core**.

```text
Go
├── Authentication
├── Wallet
├── Balance
├── Top-up
├── Transfer
├── Payment execution
├── Ledger
├── Idempotency
└── Financial transaction integrity
```

Go is the authoritative component for financial state mutations.

### Principle

> **Go moves the money.**

---

## 19. Java Responsibilities

Java is responsible for **complex financial intelligence and workflows**.

```text
Java
├── Risk Engine
├── Fraud Detection
├── Transaction Monitoring
├── Merchant workflows
├── Reconciliation
├── Notification
└── Financial workflow orchestration
```

### Principle

> **Java decides what should happen around the money.**

Java must not directly mutate the authoritative wallet balance.

---

## 20. Service Communication

Initial V2 communication should use synchronous HTTP APIs.

```text
Go
 │
 │ Risk Assessment
 ▼
Java
 │
 ▼
Risk Decision
 │
 ▼
Go
```

Later, V2 will introduce asynchronous messaging.

```text
Go
 │
 ▼
Message Broker
 │
 ├── Java Risk
 ├── Notification
 └── Reconciliation
```

The message broker should **not** be introduced until the synchronous domain flows are stable.

---

## 21. Data Integrity Requirements

V1's financial invariants remain mandatory in V2.

### Balance integrity

```text
balance >= 0
```

### Ledger integrity

For a transfer:

```text
total debit = total credit
```

### Idempotency

Repeated requests must not create duplicate financial operations.

### Atomicity

Financial mutations must be atomic.

### Concurrency

Concurrent transactions must not cause:

* Double spending
* Lost updates
* Negative balances
* Deadlocks

### Immutability

Completed financial transactions and ledger records must not be modified to change historical truth.

---

## 22. Observability

V2 must provide:

* Structured logs
* Request IDs
* Transaction IDs
* Event IDs
* Health checks
* Metrics
* Error tracking

Important metrics include:

```text
payment_success_rate
payment_failure_rate
risk_review_rate
fraud_case_rate
transaction_latency
reconciliation_discrepancies
```

---

## 23. Security Requirements

V2 must preserve V1 security principles.

Requirements include:

* JWT authentication
* Password hashing
* Redis token blacklist
* Input validation
* Authorization
* Rate limiting
* Idempotency
* Internal service authentication
* Sensitive data protection
* Audit logging

Risk and fraud services must not expose sensitive internal APIs publicly.

---

## 24. High-Level Architecture

```text
                         CLIENT
                           │
                           ▼
                    ┌─────────────┐
                    │  Go / API   │
                    │    Core     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
           Wallet       Payment      Ledger
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    Risk Assessment
                           │
                           ▼
                  ┌─────────────────┐
                  │ Java Platform   │
                  │                 │
                  │ Risk            │
                  │ Fraud           │
                  │ Reconciliation  │
                  │ Workflow        │
                  └────────┬────────┘
                           │
                           ▼
                     Event System
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
             Notify     Monitor    Analytics
```

---

## 25. V2 Sprint Structure

We'll implement V2 in **8 sprints**.

### Sprint 2.1 — Foundation

* V2 architecture
* Java/Spring Boot service
* Service boundaries
* Internal API contracts
* Docker integration
* Service authentication
* V2 documentation

### Sprint 2.2 — Payment & Merchant

* Merchant
* Merchant wallet
* Payment request
* Payment execution
* Payment reference
* Payment history

### Sprint 2.3 — Risk Engine

* Risk service
* Risk rules
* Risk scoring
* Risk decision
* Go ↔ Java integration

### Sprint 2.4 — Fraud Detection

* Transaction monitoring
* Velocity rules
* Anomaly rules
* Fraud cases
* Review workflow

### Sprint 2.5 — Payment Lifecycle & Refund

* Payment state machine
* Failed payments
* Expiration
* Full refund
* Partial refund

### Sprint 2.6 — Event-Driven Architecture

* Domain events
* Message broker
* Producers
* Consumers
* Retry
* Dead-letter handling
* Event idempotency

### Sprint 2.7 — Reconciliation

* Reconciliation runs
* External transaction import
* Matching
* Discrepancy detection
* Reconciliation reports

### Sprint 2.8 — Production Hardening

* Load testing
* Observability
* Metrics
* Distributed tracing
* Security review
* Performance tuning
* Documentation

---

## 26. V2 Success Criteria

V2 is considered successful when:

1. Users can pay merchants using their Bastion wallet.
2. Payments have a controlled lifecycle.
3. Completed payments can be refunded.
4. Transactions can be evaluated by the Java Risk Engine.
5. Suspicious activity can generate fraud cases.
6. Financial events can be processed asynchronously.
7. Internal and external transactions can be reconciled.
8. V1 financial invariants remain intact.
9. Go remains authoritative for financial state.
10. Java provides meaningful financial intelligence/workflows.
11. The system can demonstrate concurrency and failure resilience.
12. The architecture provides a clear foundation for V3.

---

## 27. V2 → V3 Boundary

V2 intentionally leaves room for future expansion.

Potential V3 capabilities:

```text
External payment providers
Bank integrations
Payment links
Subscriptions
Payouts
Multi-currency
Developer API / SDK
Advanced merchant platform
Settlement
```

V2 should **not** implement these prematurely.

---

## 28. V2 Product Definition

The simplest definition is:

> **Bastion V1 is a reliable digital wallet transaction core.**

> **Bastion V2 is a financial platform built around that core, adding merchant payments, risk, fraud detection, refunds, reconciliation, and event-driven financial operations.**

And the architecture philosophy is:

```text
V1
↓
Correct money movement

V2
↓
Intelligent & reliable financial operations

V3
↓
External financial ecosystem

V4
↓
Intelligent financial infrastructure
```
