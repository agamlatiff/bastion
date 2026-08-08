# 🏗️ Bastion — System Architecture

> **Purpose**: System design, technology choices, design patterns, failure handling, and observability strategy
> **Convention**: `[CURRENT]` = implemented, `[PLANNED — Level N]` = committed, `[FUTURE]` = not committed

---

## 1. Current State

What actually exists and runs today:

```
┌──────────────────────────────────────────────────┐
│           Auth Service — Go/Gin (Port 8080)      │
│     Register | Login | Profile | Logout          │
│     Clean Architecture: Handler → Service → Repo │
└──────────┬────────────────────────┬──────────────┘
           │ SQL                    │ Cache
   ┌───────▼──────┐         ┌──────▼──────┐
   │ PostgreSQL 16│         │   Redis 7   │
   │ Port 5433    │         │  Port 6379  │
   │ ───────────  │         │  ─────────  │
   │ users        │         │  blacklist: │
   │ wallets      │         │  {token}    │
   └──────────────┘         └─────────────┘
       Docker Compose
```

**Services**: 1 (Auth Service — REST)
**Tables**: 2 (`users`, `wallets`)
**Redis Keys**: 1 pattern (`blacklist:{token}`)

---

## 2. Target State

What Bastion evolves toward across Levels 1–5:

```
┌──────────────────────────────────────────────────────────┐
│              React Dashboard (Port 3000)                  │
└────────────────────────┬─────────────────────────────────┘
                         │ REST / WebSocket
┌────────────────────────▼─────────────────────────────────┐
│            API Gateway — Go/Gin (Port 8080)               │
│  JWT Middleware | Rate Limiting | CORS | Request Router    │
└───────┬────────────────┬────────────────┬────────────────┘
        │ gRPC           │ gRPC           │ gRPC
        │ :50051         │ :50052         │ :50053
┌───────▼──────┐  ┌──────▼───────┐  ┌────▼──────────────┐
│ Auth Service │  │Wallet Service│  │Notification Svc   │
│ Identity+KYC │  │Wallet+Money  │  │ (Kafka Consumer)  │
│              │  │Movement+     │  │                   │
│              │  │Ledger        │  │ Store & push      │
└───────┬──────┘  └──────┬───────┘  └────┬──────────────┘
        │                │               │
        │         ┌──────▼───────────────▼────┐
        │         │          Kafka             │
        │         │  Topic: payment.events     │
        │         └───────────────────────────┘
        │                │
┌───────▼────────────────▼──────────────────────────────────┐
│                     Data Layer                             │
│   PostgreSQL 16                  Redis 7                   │
│   ─────────────                  ───────                   │
│   users, wallets                 blacklist:{token}         │
│   transactions                   idempotency:{key}         │
│   ledger_entries                 rate_limit:{ip}:{endpoint}│
│   kyc_verifications                                        │
│   notifications                                            │
│   audit_logs                                               │
└────────────────────────────────────────────────────────────┘
```

> ⚠️ This is the **target** architecture. It does not exist yet. The project evolves toward this across Levels 1–5.

---

## 3. Service Boundaries

| Service | Domains | Port | Level |
|---------|---------|------|-------|
| **Auth Service** | Identity + KYC | REST `:8080` → gRPC `:50051` | [CURRENT] REST, [PLANNED — Level 3] gRPC |
| **Wallet Service** | Wallet + Money Movement + Ledger | gRPC `:50052` | [PLANNED — Level 3] |
| **Notification Service** | Notifications (Kafka Consumer) | gRPC `:50053` | [PLANNED — Level 3] |
| **API Gateway** | Routing, JWT, Rate Limiting, WebSocket Hub | REST `:8080` | [PLANNED — Level 3] |

**Audit** stays within the relevant services — not a separate microservice.

**Why these boundaries?** See [ADR-005](file:///c:/Projects/bastion/context/decisions/005-service-boundaries.md).

---

## 4. Clean Architecture Pattern

Every service follows strict layered architecture:

```
┌─────────────────────────────────────────────────┐
│              1. Handler / Transport              │
│   (HTTP Gin / gRPC Protobuf / Kafka Consumer)   │
└────────────────────┬────────────────────────────┘
                     │ Calls
┌────────────────────▼────────────────────────────┐
│              2. Service / Business               │
│   (Domain Logic, Validations, Workflow)          │
└────────────────────┬────────────────────────────┘
                     │ Calls (via Interfaces)
┌────────────────────▼────────────────────────────┐
│              3. Repository / Storage             │
│   (SQL via pgxpool, Redis Operations)            │
└────────────────────┬────────────────────────────┘
                     │ Interacts
┌────────────────────▼────────────────────────────┐
│           4. Database & External Drivers         │
│           (PostgreSQL, Redis, Kafka)             │
└─────────────────────────────────────────────────┘
```

**Key rules**:
- DTOs (Data Transfer Objects) are passed **by value** — immutable, read-only copies
- Entities (database models) are passed **by reference** (`*`) — mutable, shared across layers
- Dependencies flow inward: Handler depends on Service, Service depends on Repository
- Repository is accessed via **interfaces** for testability

---

## 5. Design Patterns

### [CURRENT] JWT + Redis Blacklist
Stateless JWT for authentication. Redis stores blacklisted tokens with TTL matching remaining token lifespan.

### [PLANNED — Level 2] Deadlock Prevention
During P2P transfers, lock wallet rows using `SELECT FOR UPDATE` in **ascending UUID order** to prevent deadlock when two users transfer to each other simultaneously.

```go
firstID, secondID := senderWalletID, receiverWalletID
if firstID > secondID {
    firstID, secondID = secondID, firstID
}
```

### [PLANNED — Level 2] Idempotency Key
Prevent duplicate processing from client retries:
1. Request includes header `Idempotency-Key: "tx-uuid-12345"`
2. Check Redis key `idempotency:tx-uuid-12345`
   - FOUND → return cached response (skip business logic)
   - NOT FOUND → acquire lock, execute, cache result (24h TTL)

### [FUTURE] Transactional Outbox
Write events to `outbox_events` table in the **same SQL transaction** as business logic. A background worker polls and publishes to Kafka. Prevents dual-write inconsistency.

See [ADR-007](file:///c:/Projects/bastion/context/decisions/007-outbox-pattern-deferred.md) for why this is deferred.

---

## 6. Technology Choices

| Technology | Why for Bastion |
|------------|----------------|
| **Go** | Goroutines for concurrent request handling. Compiled binaries for Docker. Strong typing for financial logic safety. Standard language in fintech (Gojek, Xendit, Grab). |
| **Gin** | Lightweight HTTP framework. Built-in middleware chaining. `ShouldBindJSON` with validation tags. Good for learning HTTP fundamentals without heavy abstractions. |
| **PostgreSQL 16** | ACID compliance required for money movement. Row-level locking (`SELECT FOR UPDATE`) for concurrent balance mutations. CHECK constraints (`balance >= 0`) as safety net. |
| **Redis 7** | Sub-millisecond lookup for JWT blacklist checks on every authenticated request. Automatic TTL expiration for token lifecycle. Shared state across multiple server instances for idempotency and rate limiting. |
| **pgxpool** | Native PostgreSQL driver for Go. Connection pooling without ORM overhead. Prepared statements. Direct access to PostgreSQL-specific features. See [ADR-002](file:///c:/Projects/bastion/context/decisions/002-pgxpool-over-database-sql.md). |
| **gRPC + Protobuf** | Binary serialization over HTTP/2 for typed, fast inter-service calls. Strongly-typed contracts via `.proto` files. [PLANNED — Level 3] |
| **Apache Kafka** | Asynchronous event streaming to decouple services. Durable message log for replay. Consumer groups for scalability. [PLANNED — Level 3] |
| **Docker Compose** | Reproducible development environment. Single command to start all databases and services. |
| **React (Vite)** | Frontend dashboard. AI-assisted implementation. Not a primary learning objective. |

---

## 7. Communication Protocols

| Route | Protocol | Format | Port | State |
|-------|----------|--------|------|-------|
| Client ↔ Auth Service | REST | JSON | `8080` | [CURRENT] |
| Client ↔ Gateway | REST | JSON | `8080` | [PLANNED — Level 3] |
| Client ↔ Gateway | WebSocket | WS Frame | `8080` | [PLANNED — Level 3] |
| Gateway ↔ Auth | gRPC | Protobuf | `50051` | [PLANNED — Level 3] |
| Gateway ↔ Wallet | gRPC | Protobuf | `50052` | [PLANNED — Level 3] |
| Gateway ↔ Notification | gRPC | Protobuf | `50053` | [PLANNED — Level 3] |
| Wallet ↔ Kafka | TCP | Kafka Protocol | `9092` | [FUTURE] |

---

## 8. Failure Handling Strategy

What happens when infrastructure components fail:

| Failure | Impact | Strategy | Level |
|---------|--------|----------|-------|
| **PostgreSQL down** | All operations fail | Fast-fail with clear error. No fallback — financial data requires strong consistency. | [PLANNED — Level 4] |
| **Redis down** | JWT blacklist unavailable, idempotency checks fail | Fail-open for blacklist (accept tokens, log warning). Fail-closed for idempotency (reject to prevent duplicates). | [PLANNED — Level 4] |
| **Kafka down** | Events not published | Outbox pattern retries automatically. Events stay in `pending` state until Kafka recovers. | [FUTURE] |
| **Another service unavailable** | gRPC calls fail | Timeout + retry with exponential backoff. Return partial response or clear error to client. | [PLANNED — Level 4] |
| **Consumer crashes** | Events not processed | Kafka consumer group rebalances. Unprocessed messages are picked up by another consumer or on restart. | [FUTURE] |
| **Duplicate event delivery** | Risk of double-processing | Consumer-side idempotency check before applying side effects. | [FUTURE] |
| **Request timeout** | Client receives no response | Server-side context deadlines. Client retries with idempotency key. | [PLANNED — Level 4] |

---

## 9. Observability Strategy

Introduced progressively — each tool solves a problem that emerges at its level:

| Level | Tool | Problem It Solves |
|-------|------|-------------------|
| **Level 1 — Foundation** | Structured logging (`log/slog`) | "What happened?" — Replace `log.Printf` with JSON-structured logs that monitoring tools can parse |
| **Level 2 — Correctness** | Request IDs | "Which request caused this log line?" — Attach a unique ID to every HTTP request for traceability |
| **Level 3 — Distribution** | Correlation IDs | "How did this request flow across services?" — Propagate a shared ID from Gateway through gRPC calls to Kafka events |
| **Level 4 — Reliability** | Metrics (Prometheus) | "How is the system performing?" — Request rates, error rates, latencies, queue depths |
| **Level 5 — Production** | Distributed tracing (OpenTelemetry) | "Where is the bottleneck in a cross-service request?" — Visualize end-to-end request traces |
