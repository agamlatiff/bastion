# 🗺️ Bastion — Development Levels Overview

> **Principle**: Progressive sophistication. Each level solves problems that emerge from the previous level's limitations.

---

## Level Map

| Level | Focus | Key Technologies | Observability |
|-------|-------|-------------------|---------------|
| [**1 — Foundation**](file:///c:/Projects/bastion/context/levels/1-foundation.md) | Working backend with auth, wallet, transactions | Go, Gin, PostgreSQL, Redis, Docker | Structured logging |
| [**2 — Correctness**](file:///c:/Projects/bastion/context/levels/2-correctness.md) | Data integrity under concurrent load | DB transactions, locking, idempotency | Request IDs |
| [**3 — Distribution**](file:///c:/Projects/bastion/context/levels/3-distribution.md) | Split into services with async communication | gRPC, Kafka, API Gateway | Correlation IDs |
| [**4 — Reliability**](file:///c:/Projects/bastion/context/levels/4-reliability.md) | Handle failures gracefully | Retries, timeouts, graceful degradation | Metrics |
| [**5 — Production**](file:///c:/Projects/bastion/context/levels/5-production.md) | Observe, test, and harden the system | OpenTelemetry, k6, frontend dashboard | Distributed tracing |

---

## Current Progress

```
Level 1 — Foundation
  Sprint 1.1 — Infrastructure & Auth Service    [COMPLETED]
  Sprint 1.2 — Wallet & Transactions            [IN PROGRESS]
  Sprint 1.3 — KYC & Profile Enhancement        [ ]

Level 2 — Correctness                            [ ]
Level 3 — Distribution                           [ ]
Level 4 — Reliability                            [ ]
Level 5 — Production Engineering                 [ ]
```

---

## Progression Philosophy

Each level introduces complexity **because the previous level created a real problem**:

1. **Foundation** builds a working system — but it can't handle concurrent transfers safely
2. **Correctness** adds locking and idempotency — but everything runs in one service
3. **Distribution** splits into microservices — but failures cascade between services
4. **Reliability** adds failure handling — but we can't see what's happening inside the system
5. **Production** adds observability and testing — proving the system works under load
