# 🏰 Bastion — Project Identity

> **What**: A simulated digital wallet system
> **Why**: Portfolio-oriented engineering project with deep learning objectives
> **Who**: Built by Agam Latiff

---

## 1. What Is Bastion?

Bastion is a simulated digital wallet backend system designed as a portfolio and learning project.

It is **not** a production fintech product. It is **not** competing with real financial platforms.

Bastion exists to demonstrate and deeply learn backend engineering through a realistic, financially-themed domain — one that naturally introduces problems like concurrency, data consistency, distributed communication, failure handling, and observability.

---

## 2. Learning Objectives

Bastion provides hands-on experience with:

| Category | Skills |
|----------|--------|
| **Backend** | Go, Gin framework, REST API design, service architecture |
| **Database** | PostgreSQL, ACID transactions, row-level locking, schema design |
| **Caching** | Redis, TTL-based expiration, distributed state sharing |
| **Messaging** | Apache Kafka, event-driven architecture, consumer groups |
| **Distribution** | Microservices, gRPC, Protocol Buffers, service boundaries |
| **Concurrency** | Race conditions, deadlock prevention, idempotency |
| **Reliability** | Failure handling, retries, timeouts, graceful degradation |
| **Security** | JWT authentication, bcrypt hashing, rate limiting |
| **Observability** | Structured logging, request IDs, correlation IDs, tracing |
| **Infrastructure** | Docker, Docker Compose, containerized development |
| **Testing** | Unit tests, mocking, table-driven tests, load testing |

Every technology and architectural decision in Bastion has a reason. Complexity is not added merely to look impressive.

---

## 3. Development Philosophy

### Progressive Sophistication

Bastion does not attempt to use all technologies from day one. The project becomes more sophisticated in stages:

| Level | Focus | Technologies Introduced |
|-------|-------|------------------------|
| **Level 1 — Foundation** | Build a working backend with auth, wallet, and transactions | Go, Gin, PostgreSQL, Redis, Docker |
| **Level 2 — Correctness** | Ensure data integrity under concurrent load | Database transactions, locking, idempotency, audit logging |
| **Level 3 — Distribution** | Split into microservices with async communication | gRPC, Kafka, service boundaries, API Gateway |
| **Level 4 — Reliability** | Handle failures gracefully | Retries, timeouts, circuit patterns, duplicate event handling |
| **Level 5 — Production Engineering** | Observe and optimize the running system | Structured logging, metrics, distributed tracing, load testing |

Each level solves real problems that emerge naturally from the previous level's limitations.

### Intentional Scope

- The product scope is deliberately small (digital wallet with transfers)
- The engineering depth is deliberately deep (concurrency, ACID, event-driven)
- The frontend is not a primary learning objective — AI can assist heavily
- Microservices are introduced because they create meaningful problems, not because they look impressive

---

## 4. Portfolio Positioning

Bastion demonstrates that I can:

- Design backend systems with clear architectural reasoning
- Implement services that handle concurrent database operations safely
- Reason about distributed system challenges (consistency, failures, retries)
- Design reliable APIs with proper error handling and idempotency
- Think about failure modes and graceful degradation
- Test and observe running systems
- Explain *why* decisions were made, not just *what* was built

**Example of the reasoning Bastion demonstrates:**

> ❌ Weak: "I used Redis"
>
> ✅ Strong: "I used Redis for JWT blacklisting because token expiration must be checked on every authenticated request. Redis provides sub-millisecond lookups with automatic TTL expiration, and when multiple server instances are running, they all need to share the same blacklist state."

---

## 5. What Bastion Is NOT

- **Not a production fintech product** — it simulates financial flows for learning purposes
- **Not feature-novelty** — a well-engineered standard payment platform beats a poorly-built "unique" one
- **Not "as many microservices as possible"** — service boundaries are chosen deliberately
- **Not frontend-heavy** — the UI should look polished but implementation complexity lives in the backend
