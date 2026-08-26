# Bastion V2 — Full Task Breakdown

**Goal:** Transform Bastion V1 into a more **secure, correct, testable, and production-ready** financial backend without a total architecture rewrite.

> **Convention:** `[x]` completed, `[/]` in progress, `[ ]` not started

---

## Sprint 0 — V2 Foundation & Baseline

### 0.1 Repository baseline

* [x] Review all V1 endpoints and behavior
* [x] Document known bugs from V1
* [x] Freeze V1 behavior that remains valid
* [x] Create V2 branch
* [x] Create V2 changelog
* [x] Mark breaking vs non-breaking changes


### 0.2 Development tooling

* [x] Standardize Go version
* [x] Configure `gofmt`
* [x] Configure `go vet`
* [x] Add `golangci-lint`
* [x] Add Makefile commands
* [x] Add local development commands
* [x] Add test command
* [x] Add migration command

### 0.3 Configuration

* [x] Centralize environment configuration
* [x] Validate required environment variables 
* [x] Separate development/test configuration 
* [x] Remove hardcoded secrets                
* [x] Define JWT configuration
* [x] Define Redis configuration
* [x] Define PostgreSQL configuration


**Deliverable:** V2 development baseline.

---

## Sprint 1 — Security Hardening

### 1.1 User/API data isolation

* [x] Create `UserResponse` DTO
* [x] Ensure `PasswordHash` never appears in JSON
* [x] Review all user-related responses
* [x] Separate domain models from API DTOs
* [x] Add response mapping layer
* [x] Add regression test for password hash leakage

Acceptance criteria:

```text
GET /profile must NEVER return:
{
  "password_hash": "..."
}
```

---

### 1.2 Password security

* [x] Make bcrypt cost explicit
* [x] Centralize password hashing
* [x] Centralize password comparison
* [x] Validate password requirements
* [x] Prevent obviously invalid passwords
* [x] Add password hashing tests
* [x] Add wrong-password tests

---

### 1.3 JWT hardening

* [ ] Define typed JWT claims
* [ ] Add `sub`
* [ ] Add `jti`
* [ ] Add `iat`
* [ ] Add `exp`
* [ ] Validate signing algorithm explicitly
* [ ] Validate token expiration
* [ ] Validate required claims
* [ ] Reject malformed claims
* [ ] Reject invalid signing method
* [ ] Add JWT unit tests
* [ ] Add expired-token tests
* [ ] Add malformed-token tests

Target:

```text
JWT
├── sub
├── jti
├── iat
└── exp
```

---

### 1.4 Token revocation

* [ ] Change blacklist design from raw JWT to `jti`
* [ ] Store revoked JTI in Redis
* [ ] TTL blacklist entry based on token expiration
* [ ] Check revocation in auth middleware
* [ ] Add logout test
* [ ] Add revoked-token test
* [ ] Add expired blacklist cleanup behavior

---

### 1.5 Authentication abuse protection

* [ ] Add login rate limiting
* [ ] Add registration rate limiting
* [ ] Define rate-limit policy
* [ ] Define Redis key structure
* [ ] Return consistent rate-limit error
* [ ] Add rate-limit tests

Example:

```text
rate-limit:login:{ip}
rate-limit:register:{ip}
```

---

## Sprint 2 — Authorization & KYC Security

### 2.1 RBAC

* [ ] Define application roles
* [ ] Define role hierarchy/permissions
* [ ] Add role to authenticated context
* [ ] Create authorization middleware
* [ ] Create `RequireRole`
* [ ] Add unauthorized tests
* [ ] Add forbidden tests

Initial roles:

```text
USER
ADMIN
KYC_REVIEWER
```

---

### 2.2 KYC authorization

* [ ] Protect KYC review endpoint
* [ ] Require reviewer/admin permission
* [ ] Prevent normal users from reviewing KYC
* [ ] Validate KYC state transition
* [ ] Prevent double approval
* [ ] Prevent invalid rejection
* [ ] Add audit event for KYC review
* [ ] Add authorization tests

State machine:

```text
PENDING
  ├── APPROVED
  └── REJECTED
```

---

### 2.3 KYC data protection

* [ ] Review sensitive KYC fields
* [ ] Minimize KYC data returned through API
* [ ] Avoid exposing sensitive identifiers
* [ ] Design future encryption strategy
* [ ] Add authorization around KYC retrieval
* [ ] Add KYC access audit logging

---

## Sprint 3 — Financial Correctness

> This is the **core sprint** of V2.

### 3.1 Wallet invariants

Define:

```text
balance >= 0
balance <= max_balance_limit
```

* [ ] Define wallet invariants
* [ ] Enforce balance constraints
* [ ] Enforce max balance atomically
* [ ] Add DB constraints where appropriate
* [ ] Add negative balance protection
* [ ] Add invariant tests

---

### 3.2 Atomic Top-Up

Current problem:

```text
SELECT balance
      ↓
check limit
      ↓
UPDATE
```

V2 target:

```text
Atomic DB operation
```

Tasks:

* [ ] Move limit validation into DB transaction
* [ ] Lock wallet where necessary
* [ ] Perform atomic balance update
* [ ] Insert transaction record
* [ ] Insert ledger entry
* [ ] Commit as one transaction
* [ ] Rollback on failure
* [ ] Test max balance
* [ ] Test concurrent top-ups

Acceptance:

```text
Concurrent top-ups MUST NOT exceed wallet limit.
```

---

## Sprint 4 — Transfer Correctness

### 4.1 Transfer validation

* [ ] Validate sender wallet
* [ ] Validate receiver wallet
* [ ] Prevent self-transfer
* [ ] Validate positive amount
* [ ] Validate sufficient balance
* [ ] Validate wallet limits
* [ ] Validate user status
* [ ] Validate KYC requirement if applicable

---

### 4.2 Transaction locking

* [ ] Lock sender wallet
* [ ] Lock receiver wallet
* [ ] Lock wallets in deterministic order
* [ ] Prevent deadlock
* [ ] Update balances atomically
* [ ] Insert transaction
* [ ] Insert sender ledger entry
* [ ] Insert receiver ledger entry
* [ ] Commit transaction

---

### 4.3 Concurrent transfers

Test scenarios:

```text
A → B
A → C
A → D
```

simultaneously.

* [ ] Add concurrency test
* [ ] Verify balance correctness
* [ ] Verify no negative balance
* [ ] Verify no lost update
* [ ] Verify ledger consistency
* [ ] Verify transaction count

---

## Sprint 5 — Idempotency

### 5.1 Idempotency specification

Define:

```text
same user
+
same operation
+
same idempotency key
=
same transaction/result
```

And:

```text
different user
+
same key
=
independent operation
```

---

### 5.2 Idempotency storage

* [ ] Define idempotency key format
* [ ] Namespace Redis keys by user
* [ ] Add operation namespace
* [ ] Define TTL
* [ ] Define request/result storage
* [ ] Define DB uniqueness strategy
* [ ] Define conflict behavior

Example:

```text
idempotency:{user_id}:{operation}:{key}
```

---

### 5.3 Idempotent transaction behavior

* [ ] Check existing transaction
* [ ] Return existing transaction when applicable
* [ ] Handle concurrent duplicate requests
* [ ] Prevent duplicate balance mutation
* [ ] Prevent duplicate ledger entries
* [ ] Handle Redis miss
* [ ] Handle Redis failure
* [ ] Make PostgreSQL source of truth

---

### 5.4 Idempotency tests

* [ ] Same key / same request
* [ ] Same key / different request
* [ ] Same key / different user
* [ ] Concurrent duplicate requests
* [ ] Redis unavailable
* [ ] DB duplicate constraint
* [ ] Retry after timeout

---

## Sprint 6 — Ledger Integrity

### 6.1 Ledger model

Define ledger semantics:

```text
DEBIT
CREDIT
```

* [ ] Define ledger invariants
* [ ] Define transaction-to-ledger relationship
* [ ] Define balance-after semantics
* [ ] Define append-only behavior

---

### 6.2 Ledger constraints

* [ ] Prevent orphan ledger entries
* [ ] Add foreign keys
* [ ] Add appropriate indexes
* [ ] Prevent invalid entry types
* [ ] Prevent invalid amounts
* [ ] Prevent ledger mutation where possible

---

### 6.3 Ledger consistency

For transfer:

```text
sender  → DEBIT
receiver → CREDIT
```

Tasks:

* [ ] Verify debit == transfer amount
* [ ] Verify credit == transfer amount
* [ ] Verify transaction has required ledger entries
* [ ] Verify successful transaction always has ledger
* [ ] Add consistency tests

---

## Sprint 7 — Error Architecture

### 7.1 Domain errors

Create typed errors:

```text
ErrUserNotFound
ErrInvalidCredentials
ErrWalletNotFound
ErrInsufficientFunds
ErrWalletLimitExceeded
ErrInvalidAmount
ErrSelfTransfer
ErrIdempotencyConflict
ErrKYCNotFound
ErrKYCUnauthorized
ErrInvalidKYCState
```

---

### 7.2 Error mapping

Define:

```text
Domain Error
      ↓
HTTP Error Code
      ↓
API Response
```

Example:

```json
{
  "code": "INSUFFICIENT_FUNDS",
  "message": "Insufficient wallet balance"
}
```

Tasks:

* [ ] Define error response schema
* [ ] Define error codes
* [ ] Create centralized error handler
* [ ] Map domain errors
* [ ] Hide internal errors
* [ ] Add error tests

---

## Sprint 8 — API Consistency

### 8.1 Response format

Standardize:

```text
success response
error response
pagination response
```

---

### 8.2 Validation

* [ ] Validate request body
* [ ] Validate UUID
* [ ] Validate email
* [ ] Validate amount
* [ ] Validate idempotency key
* [ ] Validate enum values
* [ ] Validate pagination
* [ ] Normalize inputs

---

### 8.3 HTTP semantics

Review every endpoint:

* [ ] HTTP method
* [ ] Status code
* [ ] Request schema
* [ ] Response schema
* [ ] Error schema
* [ ] Authentication requirement
* [ ] Authorization requirement

---

## Sprint 9 — Unit Testing

> This must be a **massive improvement** over V1.

### Auth

* [ ] Register success
* [ ] Duplicate email
* [ ] Invalid email
* [ ] Weak password
* [ ] Login success
* [ ] Wrong password
* [ ] Invalid token
* [ ] Expired token
* [ ] Revoked token

### Wallet

* [ ] Get wallet
* [ ] Top-up
* [ ] Invalid amount
* [ ] Max limit
* [ ] Transfer
* [ ] Insufficient funds
* [ ] Self-transfer
* [ ] Invalid receiver
* [ ] Idempotency

### KYC

* [ ] Submit
* [ ] Duplicate submission
* [ ] Approve
* [ ] Reject
* [ ] Invalid state
* [ ] Unauthorized reviewer

---

## Sprint 10 — Integration Testing

Use real:

```text
PostgreSQL
Redis
```

Tasks:

* [ ] PostgreSQL test environment
* [ ] Redis test environment
* [ ] Migration setup
* [ ] Repository integration tests
* [ ] Transaction rollback tests
* [ ] Redis integration tests
* [ ] Auth integration tests
* [ ] Wallet integration tests
* [ ] KYC integration tests

---

## Sprint 11 — Concurrency Testing

> One of Bastion V2's key differentiators.

Tests:

```text
100 concurrent top-ups
100 concurrent transfers
100 duplicate idempotency requests
```

Verify:

* [ ] No negative balances
* [ ] No lost updates
* [ ] No duplicate transaction
* [ ] No duplicate ledger
* [ ] No balance limit violation
* [ ] No deadlock
* [ ] Correct final balance

---

## Sprint 12 — Middleware & HTTP Hardening

* [ ] Request ID middleware
* [ ] Structured request logging
* [ ] Recovery middleware
* [ ] Request timeout
* [ ] Body size limit
* [ ] CORS configuration
* [ ] Security headers
* [ ] Rate limiting
* [ ] Authentication middleware
* [ ] Authorization middleware

---

## Sprint 13 — Observability

### Logging

* [ ] Structured JSON logging
* [ ] Request ID
* [ ] User ID where safe
* [ ] Transaction ID
* [ ] Error code
* [ ] Latency

### Metrics

* [ ] HTTP request count
* [ ] HTTP latency
* [ ] Error rate
* [ ] Login failures
* [ ] Transfer count
* [ ] Transfer failures
* [ ] Top-up count
* [ ] DB latency
* [ ] Redis latency

---

## Sprint 14 — Application Lifecycle

* [ ] Graceful shutdown
* [ ] DB connection cleanup
* [ ] Redis connection cleanup
* [ ] HTTP server shutdown
* [ ] Startup validation
* [ ] Readiness endpoint
* [ ] Liveness endpoint
* [ ] Timeout configuration

---

## Sprint 15 — Docker & Environment

* [ ] Multi-stage Docker build
* [ ] Smaller production image
* [ ] Non-root container
* [ ] Environment-based configuration
* [ ] Remove development secrets
* [ ] Docker healthchecks
* [ ] PostgreSQL healthcheck
* [ ] Redis healthcheck
* [ ] Application healthcheck
* [ ] Separate local/prod configuration

---

## Sprint 16 — CI/CD

Pipeline:

```text
Push
 ↓
Format
 ↓
Vet
 ↓
Lint
 ↓
Unit Test
 ↓
Integration Test
 ↓
Build
 ↓
Docker Build
```

Tasks:

* [ ] GitHub Actions
* [ ] Go formatting check
* [ ] Go vet
* [ ] Linter
* [ ] Unit tests
* [ ] Integration tests
* [ ] Build verification
* [ ] Docker build verification
* [ ] Migration verification

---

## Sprint 17 — Documentation

Update:

* [ ] V2 PRD
* [ ] V2 Tech Spec
* [ ] Database documentation
* [ ] API documentation
* [ ] Authentication documentation
* [ ] Authorization documentation
* [ ] Idempotency documentation
* [ ] Transaction behavior
* [ ] Ledger behavior
* [ ] Error codes
* [ ] Testing strategy
* [ ] Deployment documentation
* [ ] Architecture decision records

---

## Sprint 18 — V2 Final Audit

Before declaring V2 complete:

### Security

* [ ] No password hash leakage
* [ ] JWT hardened
* [ ] RBAC enforced
* [ ] KYC protected
* [ ] Secrets removed
* [ ] Rate limiting active

### Financial

* [ ] No negative balance
* [ ] No wallet limit bypass
* [ ] No duplicate transfer
* [ ] No duplicate top-up
* [ ] Ledger consistent
* [ ] Transactions atomic

### Reliability

* [ ] Redis failure handled
* [ ] DB failure handled
* [ ] Transaction rollback verified
* [ ] Graceful shutdown verified
* [ ] Healthchecks working

### Testing

* [ ] Unit tests passing
* [ ] Integration tests passing
* [ ] API tests passing
* [ ] Concurrency tests passing
* [ ] Regression tests passing

### Engineering

* [ ] Linter clean
* [ ] `go vet` clean
* [ ] CI green
* [ ] Docker build successful
* [ ] Documentation synchronized

---

## Definition of Done — Bastion V2

V2 is only considered complete when:

```text
                    BASTION V2
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       SECURITY     CORRECTNESS    TESTING
          │             │             │
        RBAC       Atomic Tx       Unit
        JWT        Idempotency     Integration
        DTO        Ledger          Concurrency
        Rate       Locking
          │             │             │
          └─────────────┼─────────────┘
                        │
                 PRODUCTION READY
```

---

## Implementation Order

```text
1. Finalize V2 Tasks          ← NOW
2. API Architecture
3. ERD + database changes
4. Technical implementation plan
5. Coding Sprint 0            🚀
```

> **Note:** Do not treat all 18 sprints as 18 large PRs. During implementation planning, sprints will be broken down into realistic, incremental tasks/PRs that can be completed one by one.
