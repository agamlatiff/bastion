# Bastion V2 — Current Architecture Audit

## Package Map

| Package | Responsibility |
|---|---|
| `internal/auth` | User registration, login, JWT generation, password hashing, token revocation |
| `internal/wallet` | Wallet balance, top-up, transfer, transaction history, ledger entries |
| `internal/kyc` | KYC submission, review, approval/rejection by admin |
| `internal/audit` | Audit log recording for sensitive operations |
| `internal/platform/config` | Environment variable loading and app configuration |
| `internal/platform/middleware` | Auth, RBAC, rate limiting, logging, metrics |
| `internal/platform/security` | JWT signing/verification, password hashing utilities |

**Note:** `platform` has no database table. It owns cross-cutting infrastructure concerns shared by all other packages.

---

## Request Flow (Current Reality)

```text
HTTP Request
     ↓
Gin Router (cmd/main.go)
     ↓
Middleware chain:
  - RequestID
  - Recovery
  - Security Headers
  - Logger
  - Metrics
  - Rate Limiter
  - Auth (JWT validation)
  - RBAC (role check)
     ↓
Handler (parse request, validate DTO, call service)
     ↓
Service (business rules, idempotency check via Redis)
     ↓
Repository (SQL queries inside DB transaction)
     ↓
PostgreSQL
```

**Redis** is used as a side-channel from `service.go` directly for:
- Idempotency key locking
- JWT revocation check
- Rate limiting counters

---

## Problems Found

### P1: wallet package owns 3 domains
- `internal/wallet/` contains Wallet, Transaction, and Ledger logic all in one package.
- `repository.go` is 307 lines because it handles queries for all three domains.
- `service_test.go` is 497 lines because it tests all three domains together.
- **Impact:** Hard to read, hard to extend, hard to test in isolation.

### P2: Redis imported directly in service.go
- `internal/wallet/service.go` imports `github.com/redis/go-redis/v9` directly.
- Business logic should not know about infrastructure (Redis, PostgreSQL) directly.
- **Impact:** If Redis is replaced or removed, we must modify business logic files.

### P3: Pagination default logic in wrong layer
- The default `limit = 20` logic exists inside a handler or service, not in the domain.
- Pagination defaults are a business rule, not an HTTP concern.
- **Impact:** If this endpoint is called from a background job (non-HTTP), pagination defaults won't apply.

---

## Refactoring Plan

### Sprint 20: Split wallet into domain packages
- Separate `wallet`, `transaction`, `ledger` into their own packages under `internal/`.
- Each package owns its own `domain.go`, `repository.go`, `service.go`.

### Sprint 21: Clean up handler/service boundary
- Move all business logic out of handlers.
- Handlers should only: parse request → call service → return response.

### Sprint 22: Move Redis to infrastructure layer
- Create an `internal/platform/cache` or `internal/idempotency` package.
- Service receives a cache interface, not a Redis client directly.
