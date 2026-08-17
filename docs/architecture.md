# Bastion — System Architecture Overview

> **Author:** Agam Latiff  
> **Platform:** Bastion Financial Infrastructure  
> **Language Stack:** Go (Transaction Core) & Java / Spring Boot (Financial Platform)  
> **Storage:** PostgreSQL 16, Redis 7, Apache Kafka  

---

## 1. Executive Summary

**Bastion** is a modern, production-grade financial platform engineered around a strict separation of concerns:

1. **Go Core (`services/core`)**: The authoritative financial engine responsible for sub-millisecond transaction execution, ACID atomicity, row-level locking concurrency safety, wallet balance mutations, and double-entry ledger integrity.
2. **Java Platform (`services/platform`)**: The financial intelligence and workflow orchestration engine responsible for risk assessment, deterministic rule pipelines, fraud velocity monitoring, batch financial reconciliation, and asynchronous domain event handling.

### The Golden Rule of Architecture

> **"Go owns the movement and integrity of money. Java owns complex financial intelligence and workflows around money."**

---

## 2. High-Level System Architecture

```text
                                 ┌──────────────────┐
                                 │   HTTP Clients   │
                                 │ (Web / Mobile)   │
                                 └────────┬─────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          GO TRANSACTION CORE           │
                      │               (Gin HTTP)               │
                      │               Port: 8080               │
                      ├────────────────────────────────────────┤
                      │  • Identity & Authentication (JWT)     │
                      │  • KYC Verification Engine             │
                      │  • Wallet & Balance Operations         │
                      │  • P2P Transfers & Locking             │
                      │  • Merchant Accounts & Payment Orders  │
                      │  • Refund Execution & Ledger Reversals │
                      │  • Transactional Outbox Publisher      │
                      └──────┬────────────┬─────────────┬──────┘
                             │            │             │
              Synchronous    │            │             │
             Risk Assessment │            │             │
                             ▼            ▼             ▼
                 ┌──────────────────┐ ┌────────┐ ┌─────────────┐
                 │  JAVA PLATFORM   │ │ Redis  │ │ PostgreSQL  │
                 │  (Spring Boot)   │ │ Cache  │ │  (DB Pool)  │
                 │    Port: 8081    │ └────────┘ └─────────────┘
                 ├──────────────────┤
                 │ • Risk Engine    │
                 │ • Fraud Watch    │
                 │ • Reconciliation │
                 │ • Notification   │
                 └────────┬─────────┘
                          │
                          │ Async Domain Events
                          ▼
                 ┌──────────────────┐
                 │   Apache Kafka   │
                 │  (Message Bus)   │
                 └──────────────────┘
```

---

## 3. Service Boundaries & Responsibilities

| Responsibility Area | Owning Service | Technology | Primary Operations |
|---|---|---|---|
| **User Identity & Auth** | Go Core | Gin, JWT, bcrypt, Redis | Registration, Login, Profile, JWT Blacklist revocation |
| **KYC Tiering** | Go Core | PostgreSQL Transactions | KTP submission, Document verification, Tier 1 $\rightarrow$ Tier 2 upgrade |
| **Wallets & Balances** | Go Core | `pgxpool`, Row Locks | Balance checks, Top-ups, Tier limit checks (`balance <= limit`) |
| **Money Movement** | Go Core | `SELECT ... FOR UPDATE` | P2P transfers, Merchant payments, Double-entry ledger generation |
| **Payment Orders** | Go Core | State Machine | Payment requests, Expiration checks, Order lifecycle transitions |
| **Refund Engine** | Go Core | PostgreSQL Transactions | Partial & full refunds, Over-refund guard (`SUM(refunds) <= payment`) |
| **Risk Scoring Engine** | Java Platform | Spring Boot, Rules Pipeline | 0–100 risk scoring (`APPROVE`, `MONITOR`, `REVIEW`), Multi-rule evaluations |
| **Fraud Management** | Java Platform | Spring Data JPA, Redis | Transaction anomaly detection, Velocity counters, Fraud case lifecycle |
| **Reconciliation** | Java Platform | Spring Batch / Workflows | Ingesting external provider logs, Ledger matching, Discrepancy reports |
| **Notification Engine** | Java Platform | Kafka Consumer, Async mail | Dispatching in-app alerts and emails without blocking payments |
| **Transactional Outbox** | Go Core $\rightarrow$ Kafka | DB Poller / Worker | Atomically writing domain events with financial commits to prevent lost events |

---

## 4. Financial Integrity & Concurrency Design

Bastion guarantees complete financial correctness through six engineering pillars:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                       FINANCIAL INTEGRITY PILLARS                         │
├───────────────────┬───────────────────┬───────────────────┬───────────────┤
│   NON-NEGATIVE    │   DOUBLE-ENTRY    │  DEADLOCK-FREE    │ TRANSACTIONAL │
│     BALANCES      │    BOOKKEEPING    │     LOCKING       │    OUTBOX     │
│                   │                   │                   │               │
│ CHECK(balance>=0) │ Total Debit =     │ Sort wallet UUIDs │ Financial TX  │
│ enforced at DB &  │ Total Credit for  │ ascending before  │ & Outbox event│
│ Application layer │ every transfer    │ SELECT FOR UPDATE │ in same BEGIN │
└───────────────────┴───────────────────┴───────────────────┴───────────────┘
```

### 4.1 Deadlock-Free Row-Level Locking
When transferring funds between Wallet A and Wallet B:
1. Sort `wallet_a.id` and `wallet_b.id` lexicographically (ascending UUID order).
2. Acquire locks sequentially using `SELECT * FROM wallets WHERE id = $1 FOR UPDATE`.
3. Ensures concurrent reverse transfers ($A \rightarrow B$ and $B \rightarrow A$) never deadlock.

### 4.2 Double-Entry Accounting
Every balance mutation records an immutable entry in the `ledger_entries` table:
* **Top-Up**: 1 Credit entry.
* **P2P Transfer**: 1 Debit entry (Sender) + 1 Credit entry (Receiver).
* **Payment**: 1 Debit entry (Customer) + 1 Credit entry (Merchant).
* **Refund**: 1 Debit entry (Merchant) + 1 Credit entry (Customer).

### 4.3 Idempotency Strategy
* **Redis Fast Path**: `idempotency:{key}` with 24-hour TTL prevents immediate duplicate submissions.
* **PostgreSQL Persistent Path**: `idempotency_records` table guarantees permanent replay protection and historical auditability.

---

## 5. Dual Communication Paradigm

### 5.1 Synchronous Flow (Real-Time Gating)
Used when an immediate decision is required prior to financial mutation:

```text
Client ──► Go Core ──► POST /internal/v1/risk/assess ──► Java Risk Engine
                           (Risk Score: 0-100)
Client ◄── Go Core ◄── HTTP 200 { decision: "APPROVE" } ◄──┘
```

* **APPROVE (0–30)**: Payment proceeds to atomic execution immediately.
* **MONITOR (31–70)**: Payment proceeds; event logged for post-transaction analysis.
* **REVIEW (71–100)**: Payment is held in `PENDING` state; a `fraud_cases` record is created for manual review.

### 5.2 Asynchronous Flow (Event-Driven Streaming)
Used for non-blocking downstream operations via Transactional Outbox and Kafka:

```text
PostgreSQL BEGIN
  ├── Mutate Wallets
  ├── Insert Transactions & Ledger
  └── Insert outbox_events (Status: 'pending')
PostgreSQL COMMIT
       │
       ▼
Outbox Background Poller ──► Publish ──► Apache Kafka
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
       Java Risk Consumer             Java Fraud Consumer            Java Notification
      (Async Re-Assessment)          (Velocity & Monitoring)         (Email / In-App)
```

---

## 6. Payment & Order Lifecycle State Machine

```text
                            ┌─────────────┐
                            │   PENDING   │ (Created by Merchant)
                            └──────┬──────┘
                                   │
                           Risk Evaluation
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
           ┌──────────────┐                  ┌─────────────┐
           │  AUTHORIZED  │                  │   FAILED    │ (Rejected / Timeout)
           └──────┬───────┘                  └─────────────┘
                  │
          Atomic Execution
                  │
                  ▼
           ┌──────────────┐
           │  COMPLETED   │ (Debited Customer, Credited Merchant)
           └──────┬───────┘
                  │
          Merchant Refund
                  │
                  ▼
           ┌──────────────┐
           │   REFUNDED   │ (Reversed via Ledger)
           └──────────────┘
```

---

## 7. Technology Stack

| Layer | Component | Version | Role |
|---|---|---|---|
| **Core Service** | Go | 1.21+ | REST APIs, Gin Framework, Concurrency, ACID mutations |
| **Platform Service** | Java | 21 / Spring Boot 3.x | Enterprise domain modeling, Risk rules, Reconciliation |
| **Primary Database** | PostgreSQL | 16 | Relational store, ACID transactions, `pgcrypto`, `TIMESTAMPTZ` |
| **Cache & In-Memory** | Redis | 7 | JWT revocation blacklist, Rate limiting, Velocity counters |
| **Message Broker** | Apache Kafka | 3.x | Decoupled asynchronous event streaming |
| **Infrastructure** | Docker Compose | 3.8+ | Containerized local development & integration testing |
