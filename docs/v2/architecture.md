# Bastion V2 — System Architecture

> **Version:** 2.0
> **Status:** Draft

---

## 1. Architecture Goals

Bastion V2 remains a modular monolith.

The goal is to improve:

- Security
- Financial correctness
- Concurrency handling
- Idempotency
- Testability
- Observability
- Operational reliability

V2 intentionally avoids premature microservice architecture.

---

## 2. High-Level Architecture

```text
                         ┌───────────────┐
                         │    Client     │
                         └───────┬───────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │    Bastion API    │
                       │       Go          │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │    Middleware     │
                       ├───────────────────┤
                       │ Request ID        │
                       │ Recovery          │
                       │ Logging           │
                       │ Rate Limiting     │
                       │ Authentication    │
                       │ Authorization     │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │     Handlers      │
                       └─────────┬─────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │     Services      │
                       ├───────────────────┤
                       │ Auth              │
                       │ Wallet            │
                       │ Transaction       │
                       │ KYC               │
                       └─────────┬─────────┘
                                 │
                       ┌─────────┴─────────┐
                       │                   │
                       ▼                   ▼
              ┌────────────────┐   ┌───────────────┐
              │  Repositories  │   │     Redis     │
              └───────┬────────┘   ├───────────────┤
                      │            │ JWT Revocation │
                      ▼            │ Rate Limiting  │
              ┌────────────────┐   │ Idempotency    │
              │   PostgreSQL   │   └───────────────┘
              └────────────────┘
```

---

## 3. Architectural Style

Bastion V2 uses:

```text
Modular Monolith
+
Layered Architecture
+
Repository Pattern
+
Service Layer
```

The application is one deployable unit, but internally separated by responsibility.

---

## 4. Module Boundaries

```text
Auth
Wallet
Transaction
KYC
Audit
Observability
```

Dependency direction:

```text
Handler
   ↓
Service
   ↓
Repository
   ↓
Database
```

Modules should not directly access another module's database tables unless the access is explicitly defined through a repository/service boundary.

---

## 5. Project Structure

```text
services/auth/
│
├── cmd/
│   └── main.go
│
├── internal/
│   │
│   ├── config/
│   │
│   ├── domain/
│   │   ├── user.go
│   │   ├── wallet.go
│   │   ├── transaction.go
│   │   ├── ledger.go
│   │   └── kyc.go
│   │
│   ├── dto/
│   │   ├── auth.go
│   │   ├── wallet.go
│   │   ├── transaction.go
│   │   └── kyc.go
│   │
│   ├── handler/
│   │   ├── auth_handler.go
│   │   ├── wallet_handler.go
│   │   ├── transaction_handler.go
│   │   └── kyc_handler.go
│   │
│   ├── middleware/
│   │   ├── auth.go
│   │   ├── role.go
│   │   ├── rate_limit.go
│   │   ├── request_id.go
│   │   └── recovery.go
│   │
│   ├── service/
│   │   ├── auth_service.go
│   │   ├── wallet_service.go
│   │   ├── transaction_service.go
│   │   └── kyc_service.go
│   │
│   ├── repository/
│   │   ├── user_repository.go
│   │   ├── wallet_repository.go
│   │   ├── transaction_repository.go
│   │   ├── ledger_repository.go
│   │   ├── kyc_repository.go
│   │   └── audit_repository.go
│   │
│   ├── errors/
│   │   └── errors.go
│   │
│   └── observability/
│       ├── logger.go
│       └── metrics.go
│
└── migrations/
```

---

## 6. Handler Layer

Handlers are responsible for HTTP concerns only.

Responsibilities:

- Parse request
- Validate DTO
- Read authentication context
- Call service
- Map service errors
- Return HTTP response

Handlers must not:

- Execute SQL
- Modify wallet balances
- Implement transfer rules
- Generate ledger entries
- Decide financial authorization

---

## 7. Service Layer

Services contain business logic.

Example:

```text
WalletService.Transfer()
```

Responsible for:

```text
validate amount
validate sender
validate receiver
validate wallet state
validate balance
enforce idempotency
execute financial operation
```

The service should not know whether the caller is HTTP, CLI, or another internal process.

---

## 8. Repository Layer

Repositories own persistence operations.

Example:

```text
WalletRepository
TransactionRepository
LedgerRepository
```

Responsibilities:

- SQL
- Transactions
- Row locks
- Constraints
- Query optimization

Repositories must not return HTTP status codes.

---

## 9. Authentication Architecture

```text
Login
  ↓
Validate credentials
  ↓
bcrypt compare
  ↓
Generate JWT
  ↓
Return token
```

JWT contains:

```text
sub
jti
iat
exp
```

---

## 10. Authorization Architecture

```text
Request
  ↓
JWT validation
  ↓
User identity
  ↓
Role extraction
  ↓
RequireRole(...)
  ↓
Handler
```

Roles:

```text
USER
KYC_REVIEWER
ADMIN
```

Example:

```text
POST /admin/kyc/:id/approve
            ↓
RequireRole(KYC_REVIEWER, ADMIN)
```

---

## 11. Redis Architecture

Redis is an infrastructure dependency.

It is responsible for:

```text
JWT revocation
Rate limiting
Idempotency optimization
```

Redis must never be treated as the authoritative source for:

```text
wallet balance
transaction completion
ledger history
```

PostgreSQL remains authoritative.

---

## 12. Wallet Architecture

Wallet operations are divided into:

```text
Read
Mutation
```

Reads:

```text
GET /wallet
```

Mutations:

```text
POST /wallet/top-up
POST /wallet/transfer
```

Mutations always execute inside a PostgreSQL transaction.

---

## 13. Top-Up Flow

```text
HTTP
 ↓
Auth
 ↓
Validation
 ↓
Idempotency
 ↓
WalletService.TopUp()
 ↓
BEGIN
 ↓
Atomic wallet update
 ↓
Create transaction
 ↓
Create ledger entry
 ↓
COMMIT
 ↓
Response
```

Atomic wallet update:

```sql
UPDATE wallets
SET balance = balance + $1
WHERE id = $2
  AND status = 'ACTIVE'
  AND balance + $1 <= max_balance_limit
RETURNING id, balance;
```

---

## 14. Transfer Flow

```text
HTTP
 ↓
Auth
 ↓
Validation
 ↓
Idempotency
 ↓
WalletService.Transfer()
 ↓
BEGIN
 ↓
Lock wallets
 ↓
Lock using deterministic wallet ID ordering
 ↓
Validate state
 ↓
Validate balance
 ↓
Debit sender
 ↓
Credit receiver
 ↓
Create transaction
 ↓
Create ledger entries
 ↓
COMMIT
 ↓
Response
```

---

## 15. Concurrency Control

Wallet mutations must not follow an unsafe pattern:

```text
read balance
↓
validate
↓
update balance
```

without synchronization.

Instead:

```text
BEGIN
↓
LOCK
↓
VALIDATE
↓
UPDATE
↓
COMMIT
```

For transfers, wallet locks must use deterministic ordering.

---

## 16. Idempotency Architecture

```text
Request
   ↓
Read Idempotency-Key
   ↓
Check existing operation
   │
   ├── Existing + same fingerprint
   │       ↓
   │    Return existing result
   │
   ├── Existing + different fingerprint
   │       ↓
   │    409 Conflict
   │
   └── Not found
           ↓
       Execute operation
           ↓
       Persist result
```

PostgreSQL is the final authority.

Redis may be used as a fast lookup layer.

---

## 17. Financial Atomicity

Financial operations must guarantee:

```text
Wallet State
+
Transaction
+
Ledger
```

are committed together.

Never:

```text
Update wallet
COMMIT

Create transaction
COMMIT

Create ledger
COMMIT
```

Instead:

```text
BEGIN

Update wallet
Create transaction
Create ledger

COMMIT
```

---

## 18. Error Architecture

Domain errors are defined centrally.

Example:

```go
var (
    ErrInvalidAmount       = errors.New("invalid amount")
    ErrInsufficientFunds   = errors.New("insufficient funds")
    ErrWalletLimitExceeded = errors.New("wallet limit exceeded")
    ErrIdempotencyConflict = errors.New("idempotency conflict")
)
```

Handlers map these to API error codes.

Infrastructure details remain hidden from clients.

---

## 19. Observability

Every request receives a request ID.

```text
Request
 ↓
Request ID
 ↓
Logger
 ↓
Service
 ↓
Repository
```

Structured logs should contain:

```text
timestamp
level
request_id
user_id
operation
duration_ms
status
error_code
```

Sensitive information must never be logged.

---

## 20. Metrics

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

---

## 21. Health Architecture

```text
/health/live
```

Checks application process health.

```text
/health/ready
```

Checks required dependencies.

Example:

```text
Readiness
 ├── PostgreSQL
 └── Redis
```

The exact dependency policy may be adjusted depending on whether Redis is considered mandatory for each deployment mode.

---

## 22. Graceful Shutdown

Shutdown sequence:

```text
SIGTERM
   ↓
Stop accepting requests
   ↓
Wait for active requests
   ↓
Close HTTP server
   ↓
Close Redis
   ↓
Close PostgreSQL
   ↓
Exit
```

Shutdown timeout must be configurable.

---

## 23. Testing Architecture

### Unit

Test:

- Services
- Validation
- JWT
- Authorization
- Error mapping
- Idempotency rules

### Integration

Use real:

- PostgreSQL
- Redis

Test:

- Transactions
- Constraints
- Locks
- Repository behavior
- Redis TTL

### API

Test:

```text
HTTP
→ Middleware
→ Handler
→ Service
→ Repository
```

---

## 24. Concurrency Tests

Required scenarios:

```text
100 concurrent top-ups
100 concurrent transfers
100 duplicate requests
```

Assertions:

```text
balance >= 0
balance <= max_balance_limit
no duplicate transaction
no duplicate ledger
no lost update
```

---

## 25. Deployment Architecture

V2 target:

```text
                 Internet
                    │
                    ▼
              ┌───────────┐
              │   Bastion │
              │    API    │
              └─────┬─────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    PostgreSQL              Redis
```

Initially this can run using Docker Compose.

Production deployment can later move to:

```text
Load Balancer
      ↓
Bastion API × N
      ↓
PostgreSQL
      +
Redis
```

without changing the core application architecture.

---

## 26. V2 Architectural Principles

1. PostgreSQL is the financial source of truth.
2. Redis is an infrastructure accelerator.
3. Financial mutations are atomic.
4. Idempotency is mandatory for financial retries.
5. Database constraints enforce important invariants.
6. Handlers remain thin.
7. Services contain business rules.
8. Repositories contain persistence logic.
9. Sensitive data never enters logs unnecessarily.
10. Microservices are intentionally deferred.
