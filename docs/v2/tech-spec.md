# Bastion V2 — Technical Specification

> **Version:** 2.0
> **Status:** Draft
> **Product:** Bastion

---

## 1. Technical Goals

Bastion V2 retains the V1 modular monolith architecture while improving:

- Security
- Transaction correctness
- Concurrency safety
- Idempotency
- Error handling
- Testing
- Observability
- Operational reliability

The architecture should remain simple enough for a single service while establishing patterns that can support future V3 decomposition.

---

## 2. Technology Stack

### Application

- Go
- Gin
- pgx / pgxpool
- Redis client (`go-redis/v9`)
- JWT library (`golang-jwt/jwt/v5`)
- bcrypt (`golang.org/x/crypto/bcrypt`)

### Infrastructure

- PostgreSQL 16
- Redis 7
- Docker
- Docker Compose for local development

### Development

- Go test
- Go vet
- golangci-lint
- GitHub Actions

---

## 3. Architecture

Bastion V2 remains a modular monolith.

```text
                    HTTP Client
                        │
                        ▼
                  Gin Router
                        │
              ┌─────────┴─────────┐
              │                   │
        Middleware            Middleware
              │                   │
              └─────────┬─────────┘
                        ▼
                    Handler
                        │
                        ▼
                     Service
                        │
              ┌─────────┼─────────┐
              │         │         │
              ▼         ▼         ▼
         Repository   Redis    External
              │                   │
              ▼                   │
          PostgreSQL              │
```

- Business rules belong in services.
- Persistence belongs in repositories.
- HTTP concerns belong in handlers/middleware.

---

## 4. Package Responsibilities

```text
services/auth/
├── cmd/
│   └── main.go
│
└── internal/
    ├── config/
    ├── domain/
    ├── dto/
    ├── handler/
    ├── middleware/
    ├── repository/
    ├── service/
    ├── auth/
    ├── errors/
    └── observability/
```

### domain

Core business entities.

Examples:

- `User`
- `Wallet`
- `Transaction`
- `LedgerEntry`
- `KYCVerification`

Domain models must not be used blindly as API responses.

### dto

External API request and response models.

Examples:

- `RegisterRequest`
- `LoginRequest`
- `UserResponse`
- `WalletResponse`
- `TopUpRequest`
- `TransferRequest`
- `TransactionResponse`
- `KYCResponse`
- `ErrorResponse`

DTOs prevent persistence-only fields from leaking into API responses.

### handler

Responsible for:

- HTTP request parsing
- Request validation
- Authentication context extraction
- Service invocation
- HTTP response mapping

Handlers must not contain financial business logic.

### service

Responsible for:

- Business rules
- Authorization decisions where appropriate
- Transaction orchestration
- Idempotency behavior
- Domain error generation

### repository

Responsible for:

- SQL
- PostgreSQL transactions
- Row locking
- Persistence
- Query composition

Repositories must not decide HTTP status codes.

---

## 5. Dependency Injection

Application startup should construct dependencies explicitly.

```text
Config
 ↓
Database
 ↓
Redis
 ↓
Repositories
 ↓
Services
 ↓
Handlers
 ↓
Router
```

`main.go` should remain the composition root.

Future refactoring may move construction into an application bootstrap package, but V2 does not require a major dependency injection framework.

---

## 6. Authentication

### 6.1 Password hashing

bcrypt must use an explicit configured cost.

Example configuration:

```text
BCRYPT_COST=12
```

Password hashes must never be returned through an API response.

---

## 7. JWT

JWT must use a typed claim structure.

Required claims:

- `sub`
- `jti`
- `iat`
- `exp`

Optional application claims may include role/tier where appropriate.

The signing algorithm must be explicitly validated.

If Bastion uses HS256:

```text
expected algorithm = HS256
```

Other signing algorithms must be rejected.

---

## 8. JWT Revocation

JWT revocation uses Redis.

Key:

```text
auth:revoked:{jti}
```

Value:

```text
1
```

TTL:

```text
token_expiration - current_time
```

The authentication middleware checks revocation before allowing authenticated access.

Redis failure policy must be explicitly defined.

For security-sensitive authentication paths, failure to verify revocation should fail closed unless an explicitly documented availability policy is adopted.

---

## 9. Authorization

V2 introduces RBAC.

Initial roles:

```text
USER
KYC_REVIEWER
ADMIN
```

Middleware:

```text
AuthMiddleware
       ↓
RequireRole(...)
```

Example:

```text
POST /kyc/review
        ↓
AuthMiddleware
        ↓
RequireRole(KYC_REVIEWER, ADMIN)
        ↓
Handler
```

Authentication proves identity.
Authorization proves permission.

---

## 10. Rate Limiting

Redis-backed rate limiting applies to sensitive endpoints.

Initial targets:

- `POST /auth/register`
- `POST /auth/login`

Key format:

```text
rate-limit:{operation}:{ip}
```

Optional authenticated dimensions may be added:

```text
rate-limit:{operation}:{user_id}
```

The rate limiter must have deterministic expiration.

---

## 11. Wallet Concurrency

Wallet mutations are concurrency-sensitive.

PostgreSQL is the authority for wallet state.

The application must not rely on:

```text
read balance
→ validate
→ update
```

without proper synchronization.

---

## 12. Atomic Top-Up

Top-up must execute inside a database transaction.

Conceptual flow:

```text
BEGIN
  │
  ├── validate wallet
  │
  ├── atomically increase balance
  │
  ├── create transaction
  │
  ├── create ledger entry
  │
  └── COMMIT
```

The balance limit must be checked atomically.

Conceptual SQL:

```sql
UPDATE wallets
SET balance = balance + $1,
    updated_at = NOW()
WHERE id = $2
  AND status = 'ACTIVE'
  AND balance + $1 <= max_balance_limit
RETURNING id, balance;
```

If no row is returned, the operation must fail without creating a financial transaction.

---

## 13. Transfer Transaction

Transfer must use one PostgreSQL transaction.

Flow:

```text
BEGIN
    │
    ├── Resolve sender wallet
    ├── Resolve receiver wallet
    │
    ├── Lock both wallets
    │
    ├── Lock in deterministic ID order
    │
    ├── Validate balances/status
    │
    ├── Debit sender
    ├── Credit receiver
    │
    ├── Create transaction
    ├── Create sender ledger entry
    ├── Create receiver ledger entry
    │
    └── COMMIT
```

Wallets must be locked using deterministic ordering to reduce deadlock risk.

---

## 14. Financial Transaction Boundary

A successful financial operation must atomically persist:

- Wallet mutation
- Transaction
- Ledger entries

No component may commit only one of these independently.

---

## 15. Transaction Status

Transactions should have an explicit lifecycle.

Recommended states:

```text
PENDING
COMPLETED
FAILED
```

For V2, synchronous wallet operations may normally transition:

```text
PENDING → COMPLETED
```

or:

```text
PENDING → FAILED
```

The exact persisted behavior must remain consistent with database constraints and transaction semantics.

---

## 16. Idempotency

Idempotency applies to financial mutation endpoints.

Initial endpoints:

- `POST /wallet/top-up`
- `POST /wallet/transfer`

Required request header:

```text
Idempotency-Key
```

Key namespace:

```text
idempotency:{user_id}:{operation}:{key}
```

### 16.1 Idempotency lifecycle

```text
Request
  │
  ▼
Validate key
  │
  ▼
Check existing operation
  │
  ├── Found → return existing result
  │
  └── Not found
          │
          ▼
      Begin DB transaction
          │
          ▼
      Perform operation
          │
          ▼
      Persist transaction + idempotency relation
          │
          ▼
        COMMIT
```

PostgreSQL remains the source of truth.

Redis is an optimization layer.

---

## 17. Idempotency Database Design

Financial transactions should store the idempotency key and user ownership.

The uniqueness boundary must prevent collisions across users.

Conceptual uniqueness:

```sql
UNIQUE(user_id, operation, idempotency_key)
```

This allows:

```text
User A + transfer + abc
User B + transfer + abc
```

to coexist.

But prevents:

```text
User A + transfer + abc
User A + transfer + abc
```

from creating two financial operations.

---

## 18. Idempotency Conflict

If the same idempotency key is reused with a materially different request payload, the API must return:

```text
409 Conflict
```

Example error:

```json
{
  "code": "IDEMPOTENCY_CONFLICT",
  "message": "Idempotency key has already been used with a different request"
}
```

Where practical, a request fingerprint/hash should be stored to detect payload mismatch.

---

## 19. Ledger

Ledger entries are append-oriented.

Entry types:

```text
DEBIT
CREDIT
```

Transfer:

```text
Sender   DEBIT
Receiver CREDIT
```

Top-up:

```text
Wallet CREDIT
```

Every ledger entry belongs to a transaction.

Foreign keys must prevent orphan entries.

---

## 20. Ledger Invariants

For every completed transfer:

```text
sender debit amount = transfer amount
receiver credit amount = transfer amount
```

Therefore:

```text
total debit = total credit
```

For top-up:

```text
credit amount = top-up amount
```

Application and database constraints should cooperate to preserve these invariants.

---

## 21. Error Architecture

V2 introduces typed domain errors.

Example:

```go
var (
    ErrUserNotFound        = errors.New("user not found")
    ErrInvalidCredentials  = errors.New("invalid credentials")
    ErrWalletNotFound      = errors.New("wallet not found")
    ErrInsufficientFunds   = errors.New("insufficient funds")
    ErrWalletLimitExceeded = errors.New("wallet limit exceeded")
    ErrInvalidAmount       = errors.New("invalid amount")
    ErrSelfTransfer        = errors.New("self transfer is not allowed")
    ErrIdempotencyConflict = errors.New("idempotency conflict")
    ErrKYCNotFound         = errors.New("kyc not found")
    ErrUnauthorized        = errors.New("unauthorized")
)
```

HTTP handlers map these errors to stable API error codes.

Internal infrastructure errors must not be exposed directly.

---

## 22. API Error Format

Standard format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message"
}
```

Optional metadata may be added later.

Internal errors should map to:

```text
INTERNAL_ERROR
```

without exposing SQL, Redis, filesystem, or stack-trace details.

---

## 23. Database Transactions

Repository methods that perform multiple financial mutations must receive or create a transaction boundary.

The transfer transaction must include:

- Wallet updates
- Transaction insert
- Ledger inserts

The top-up transaction must include:

- Wallet update
- Transaction insert
- Ledger insert

Rollback must occur for any failure.

---

## 24. Database Constraints

Important constraints include:

```text
users.email                            UNIQUE
wallets.user_id                        UNIQUE
transactions.idempotency scope         UNIQUE
kyc_verifications.user_id              UNIQUE
kyc_verifications.id_card_number       UNIQUE
```

Additional financial constraints:

```text
wallet.balance          >= 0
wallet.max_balance_limit >= 0
transaction.amount       > 0
ledger.amount            > 0
```

Where PostgreSQL constraints can enforce invariants safely, they should be used.

---

## 25. Indexing

Indexes must support:

- User email lookup
- Wallet user lookup
- Transaction user lookup
- Transaction wallet lookup
- Idempotency lookup
- Ledger transaction lookup
- Ledger wallet lookup
- KYC status filtering
- Audit log user lookup
- Audit log timestamp lookup

Indexes must be reviewed against actual query patterns.

---

## 26. Sensitive Data

Sensitive data must be minimized.

Passwords:

- Hashed
- Never returned

KYC identifiers:

- Restricted access

Future production implementation should consider encryption at rest and deterministic hashing for sensitive uniqueness checks where necessary.

---

## 27. DTO Mapping

Persistence/domain models must not be serialized directly when they contain internal fields.

Example:

```text
User
├── ID
├── Email
├── PasswordHash    ← internal only
├── Role
├── Tier
└── ...

UserResponse
├── ID
├── Email
├── Role
├── Tier
└── ...
```

`PasswordHash` must never exist in `UserResponse`.

---

## 28. Audit Logging

Audit logging should use structured events.

Example:

```text
AUTH_LOGIN_SUCCESS
AUTH_LOGIN_FAILED
AUTH_LOGOUT

KYC_SUBMITTED
KYC_APPROVED
KYC_REJECTED

WALLET_TOPUP
WALLET_TRANSFER
WALLET_TRANSFER_FAILED
```

Audit records should contain:

- `id`
- `user_id`
- `action`
- `request_id`
- `ip_address`
- `user_agent`
- `metadata`
- `created_at`

Audit logs are append-oriented.

---

## 29. Request ID

Every incoming request should receive a request ID.

If a trusted request ID is supplied, the application may reuse it subject to validation.

Otherwise:

```text
generate UUID
```

The request ID should appear in:

- Response header
- Structured logs
- Audit metadata where applicable
- Error logs

---

## 30. Logging

Logs should be structured.

Recommended fields:

```text
timestamp
level
service
request_id
user_id
operation
duration_ms
status
error_code
```

Sensitive information must not be logged.

Never log:

- Passwords
- Password hashes
- JWTs
- KYC secrets
- Full sensitive request bodies

---

## 31. Metrics

Initial metrics:

```text
http_requests_total
http_request_duration
http_errors_total

auth_login_success_total
auth_login_failure_total

wallet_topup_total
wallet_transfer_total
wallet_transfer_failure_total

database_operation_duration
redis_operation_duration
```

Metrics implementation may use a standard Prometheus-compatible approach.

---

## 32. Health Checks

Two endpoints:

```text
GET /health/live
GET /health/ready
```

Liveness verifies the process is running.

Readiness verifies required dependencies are available.

---

## 33. Graceful Shutdown

On shutdown signal:

```text
stop accepting new requests
        ↓
wait for active requests
        ↓
close HTTP server
        ↓
close Redis
        ↓
close PostgreSQL
        ↓
exit
```

Shutdown must have a configurable timeout.

---

## 34. Testing Architecture

### Unit

Use mocks/fakes for external dependencies where appropriate.

Test:

- Business rules
- Validation
- Error mapping
- JWT
- Authorization
- Idempotency decisions

### Integration

Use real PostgreSQL and Redis.

Test:

- SQL behavior
- Transactions
- Row locks
- Constraints
- Redis TTL
- Repository behavior

### API

Test:

```text
HTTP request
→ middleware
→ handler
→ service
→ repository
```

for critical workflows.

---

## 35. Concurrency Tests

Required scenarios:

```text
100 concurrent top-ups
100 concurrent transfers
100 duplicate requests
```

Expected properties:

- No negative balance
- No duplicate transaction
- No duplicate ledger
- No wallet limit bypass
- No lost update
- No inconsistent final balance

---

## 36. CI Pipeline

Every pull request should execute:

- `gofmt`
- `go vet`
- `golangci-lint`
- Unit tests
- Integration tests
- Build

Docker build should also be validated.

---

## 37. Docker

Production-oriented image requirements:

- Multi-stage build
- Minimal runtime image
- Non-root user
- No hardcoded secrets
- Healthcheck
- Environment-based configuration

Docker Compose remains primarily a local-development tool.

---

## 38. Configuration

Required configuration categories:

- Application
- Database
- Redis
- JWT
- Password hashing
- Rate limiting
- HTTP server
- Observability

Startup must fail fast when required configuration is missing or invalid.

---

## 39. Migration Strategy

Database migrations must be:

- Versioned
- Ordered
- Repeatable through migration tooling
- Applied before application startup in deployment
- Backward-compatible where required during rolling deployments

V2 schema changes must not silently modify existing V1 data.

---

## 40. Backward Compatibility

Non-breaking V1 endpoints should remain compatible unless explicitly documented.

Breaking changes require:

- API versioning decision
- OpenAPI update
- Migration notes
- Client impact documentation

---

## 41. Security Principles

V2 follows:

- Least privilege
- Fail safely
- Defense in depth
- Database-enforced invariants
- Never trust client state
- Never expose internal models

Financial correctness must not depend solely on application-level validation.

---

## 42. V2 Technical Definition of Done

The implementation is technically complete when:

- Application compiles
- Unit tests pass
- Integration tests pass
- Concurrency tests pass
- Linter passes
- `go vet` passes
- Docker build succeeds
- Database migrations succeed
- JWT validation is hardened
- RBAC works
- Rate limiting works
- Financial operations are atomic
- Idempotency is enforced
- Ledger invariants hold
- API errors are standardized
- Health checks work
- Graceful shutdown works
- Structured logs exist
- Documentation matches implementation
