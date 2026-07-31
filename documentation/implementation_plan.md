# 🏰 Bastion — Implementation Plan
### Payment Processing Platform | Portfolio Project

---

## 📌 Table of Contents
1. [The Big Picture (Zoom Out)](#zoom-out)
2. [Why This Project](#why)
3. [Tech Stack](#tech-stack)
4. [Career Roadmap](#career)
5. [Phase Overview](#phases)
6. [Current Status](#status)

---

## 🔭 The Big Picture (Zoom Out) {#zoom-out}

### What is Bastion?
Bastion is a **production-grade payment processing platform** — a backend system that handles digital wallets, peer-to-peer money transfers, transaction ledgers, and real-time notifications.

Think of it as the backend powering **GoPay**, **OVO**, or **Dana** — built by you, from scratch, with real engineering practices.

### End-to-End User Journey
```
1. User registers → wallet auto-created with Rp0 balance
2. User tops up wallet → balance increases
3. User sends Rp50,000 to a friend
   ├── System locks both wallets  (prevents race condition)
   ├── Deducts sender atomically  (ACID transaction)
   ├── Credits receiver atomically
   ├── Records immutable ledger entries  (double-entry bookkeeping)
   ├── Publishes event to Kafka
   └── Friend receives real-time push notification
4. User views paginated transaction history
5. User logs out → JWT blacklisted in Redis
```

---

## 🎯 Why This Project {#why}

### The Difference Between Bastion and a CRUD App

```
What most junior devs build:        What Bastion teaches you:
─────────────────────────────────   ──────────────────────────────────────
POST /users → INSERT into DB        Race condition prevention
GET  /users → SELECT from DB        Idempotency keys (no duplicate payments)
PUT  /users → UPDATE in DB          Double-entry bookkeeping
DELETE /users → DELETE from DB      Event-driven architecture (Kafka)
                                    Microservices + gRPC
                                    Redis caching & token blacklisting
                                    WebSocket real-time updates
                                    Horizontal scalability by design
```

### Why Bastion Gets You Hired

Every company listed below builds exactly what Bastion is:

| Company | Domain |
|---|---|
| Gojek / GoPay | Digital wallet, transfers |
| Xendit | Payment infrastructure |
| Dana | Digital wallet |
| OVO | Digital payments |
| Grab Pay | Super app payments |
| Stripe | Payment processing |
| Sea Money | Fintech platform |

---

## 🛠️ Tech Stack {#tech-stack}

| Layer | Technology | Why |
|---|---|---|
| Language | **Go 1.21+** | Fast, compiled, excellent concurrency, industry standard for fintech |
| HTTP Framework | **Gin** | Most popular Go HTTP framework |
| Database | **PostgreSQL 16** | ACID compliance — critical for money |
| Cache | **Redis 7** | Sub-millisecond reads, idempotency, token blacklist |
| Event Streaming | **Kafka** | Async processing, guaranteed delivery |
| Service Comms | **gRPC + Protobuf** | Typed, fast, binary — better than REST internally |
| Auth | **JWT (HS256)** | Stateless authentication |
| Password | **bcrypt (cost=12)** | Slow by design — resists brute force |
| DB Driver | **pgx/v5** | Fastest PostgreSQL driver for Go |
| Frontend | **React + TypeScript** | Type-safe, industry standard |
| Real-time | **WebSocket** | Push notifications to browser |
| Containers | **Docker + Compose** | One command to run everything |

---

## 🎓 Career Roadmap {#career}

### Phase → Hirability Progression

```
After Phase 1 → Can apply for junior Go backend roles
After Phase 2 → Can discuss fintech engineering in interviews
After Phase 3 → Understands microservices (top 20% of applicants)
After Phase 4 → Understands event-driven systems (top 10% of applicants)
After Phase 5 → Full-stack, production-ready portfolio (top 1-5%)
```

### Interview Questions Each Phase Prepares You For

| Phase | Interview Question You Can Answer |
|---|---|
| Phase 1 | "How does JWT authentication work?" |
| Phase 1 | "How do you store passwords securely?" |
| Phase 2 | "How do you prevent double-spending?" |
| Phase 2 | "What happens if a payment request is retried?" |
| Phase 2 | "How do you ensure atomic wallet updates?" |
| Phase 3 | "Why gRPC for internal services instead of REST?" |
| Phase 3 | "What is an API Gateway and why use one?" |
| Phase 4 | "What happens if the notification service crashes?" |
| Phase 4 | "How do you guarantee event delivery?" |
| Phase 5 | "How do you prevent API abuse?" |
| Phase 5 | "How do you trace a request across microservices?" |
| All | "How would you scale this to 1 million users?" |

### 4-Year Plan to Singapore

```
Months 1–6   → Build Bastion (this project)
Month 4–6    → Apply to Indonesian Go engineer roles
Year 1–2     → Junior Go engineer (Xendit, Gojek, Traveloka, Dana, OVO)
Year 2–3     → Mid-level, lead features, understand production at scale
Year 3–4     → Senior engineer, start targeting Singapore companies
Year 4+      → Singapore → Grab, Sea, Stripe, GovTech, DBS
```

---

## 📚 Phase Overview {#phases}

### Phase 1 — Auth Service
**Week 1–2** | Go + PostgreSQL + Redis + JWT

Build the authentication foundation. Learn Go fundamentals by building real code.

**Key problems solved:**
- How to hash passwords safely (bcrypt)
- How JWT tokens work and how to validate them
- How to blacklist tokens on logout (Redis)
- Parameterized SQL queries (no SQL injection)

👉 [Full Phase 1 Guide →](./phase_1_auth.md)

---

### Phase 2 — Wallet & Transactions
**Week 3–4** | ACID, Race Conditions, Idempotency, Ledger

The financial core of Bastion. This is where real engineering begins.

**Key problems solved:**
- Race conditions during concurrent transfers (SELECT FOR UPDATE)
- Duplicate payment requests (idempotency keys)
- Atomic money movement (database transactions)
- Complete audit trail (double-entry bookkeeping)

👉 [Full Phase 2 Guide →](./phase_2_wallet.md)

---

### Phase 3 — Microservices & gRPC
**Week 5–6** | Protocol Buffers, gRPC, API Gateway

Split the monolith. Learn how real companies structure their backends.

**Key problems solved:**
- Service communication with typed contracts (protobuf)
- API Gateway as single entry point
- Service-to-service authentication
- Docker multi-service networking

👉 [Full Phase 3 Guide →](./phase_3_grpc.md)

---

### Phase 4 — Kafka Event Streaming
**Week 7–8** | Kafka, Async Processing, WebSocket

Add the nervous system. Events flow asynchronously between services.

**Key problems solved:**
- Decoupling services (publisher doesn't know about consumers)
- Guaranteed event delivery (Kafka offset management)
- Real-time browser notifications (WebSocket)
- Idempotent consumers (duplicate event safety)

👉 [Full Phase 4 Guide →](./phase_4_kafka.md)

---

### Phase 5 — Frontend & Production Polish
**Week 9–10** | React, TypeScript, Observability, Load Testing

A beautiful frontend and production-grade finishing touches.

**Key things added:**
- React + TypeScript dashboard
- Real-time notifications via WebSocket
- Structured logging + request correlation IDs
- Rate limiting, health checks, graceful shutdown
- Load test results (proves the system works under pressure)

👉 [Full Phase 5 Guide →](./phase_5_frontend.md)

---

## 📍 Current Status {#status}

| Phase | Status | Notes |
|---|---|---|
| ✅ Environment Setup | Done | Docker + Go installed, project folder created |
| 🔄 Phase 1 — Auth | In Progress | Writing code step by step |
| ⏳ Phase 2 — Wallet | Not Started | Starts after Phase 1 checklist complete |
| ⏳ Phase 3 — gRPC | Not Started | — |
| ⏳ Phase 4 — Kafka | Not Started | — |
| ⏳ Phase 5 — Frontend | Not Started | — |
