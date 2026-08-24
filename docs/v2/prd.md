# Bastion V2 — Product Requirements Document

> **Version:** 2.0
> **Status:** Draft
> **Product:** Bastion
> **Document:** Product Requirements Document

---

## 1. Overview

Bastion V2 is the second iteration of the Bastion financial backend.

Bastion V1 established the initial foundation:

- User registration and authentication
- JWT authentication
- Redis-backed token revocation
- User wallets
- Wallet top-up
- Wallet-to-wallet transfer
- KYC submission and review
- Transaction records
- Ledger entries
- Audit logging
- PostgreSQL persistence
- OpenAPI documentation
- Docker-based local development

Bastion V2 does not rewrite the V1 architecture.

The primary goal is to make the existing system:

- More secure
- Financially correct under concurrency
- Idempotent
- Testable
- Observable
- More consistent as an API
- More production-ready

---

## 2. Problem Statement

A financial backend cannot be considered reliable merely because its happy-path requests work.

The system must also behave correctly when:

- Two requests modify the same wallet simultaneously
- A client retries the same financial request
- Redis becomes unavailable
- PostgreSQL rejects a transaction
- A JWT is malformed or revoked
- An unauthorized user accesses an administrative endpoint
- A request fails halfway through a financial operation
- Multiple concurrent transfers target the same wallet
- API responses accidentally expose internal security-sensitive fields

V2 addresses these failure modes.

---

## 3. V2 Goals

### 3.1 Security

Bastion V2 must:

- Prevent password hash exposure
- Harden JWT validation
- Support role-based authorization
- Protect KYC review operations
- Rate-limit sensitive authentication endpoints
- Centralize security-sensitive configuration
- Minimize exposure of sensitive KYC information

### 3.2 Financial Correctness

Bastion V2 must guarantee that financial operations are atomic.

For a successful financial operation:

```text
Balance mutation
+
Transaction record
+
Ledger entries
```

must either all succeed or all fail.

The system must prevent:

- Negative balances
- Wallet limit violations
- Duplicate financial mutations
- Lost balance updates
- Partial transfers
- Inconsistent ledger entries

### 3.3 Idempotency

Financial endpoints must support safe retries.

For the same user, operation, and idempotency key:

```text
same request
    ↓
same financial operation
    ↓
same result
```

Repeated requests must not create duplicate financial mutations.

Idempotency keys must be scoped to the authenticated user.

### 3.4 Testing

V2 must introduce meaningful automated coverage across:

- Unit tests
- Repository integration tests
- API integration tests
- Financial transaction tests
- Concurrency tests
- Idempotency tests
- Security regression tests

### 3.5 Production Readiness

V2 must provide the foundation for deployment beyond local development through:

- Health checks
- Graceful shutdown
- Structured logging
- Request IDs
- Metrics
- CI validation
- Docker hardening
- Configuration validation

---

## 4. Non-Goals

The following are explicitly outside the primary scope of V2:

- Kafka
- RabbitMQ
- Microservice decomposition
- Event-driven architecture
- External payment gateway integration
- Advanced fraud detection
- Multi-currency wallets
- Java-based services
- Distributed transaction orchestration
- Full KYC document processing
- Mobile applications

These capabilities may be considered for V3+.

---

## 5. User Roles

### 5.1 USER

Normal Bastion customer.

Capabilities:

- Register
- Login
- Logout
- View profile
- View wallet
- Submit KYC
- Top up wallet
- Transfer funds
- View own transactions

### 5.2 KYC_REVIEWER

Authorized operator responsible for reviewing KYC submissions.

Capabilities:

- View authorized KYC submissions
- Approve KYC
- Reject KYC
- View relevant KYC audit information

### 5.3 ADMIN

Administrative role.

Capabilities include:

- KYC review
- Administrative operations
- User/account management where explicitly permitted
- Audit inspection where authorized

---

## 6. Functional Requirements

### 6.1 Authentication

#### Register

The system must allow a user to create an account.

Requirements:

- Email must be valid
- Email must be unique
- Password must satisfy configured security requirements
- Password must be hashed before persistence
- Password hash must never be returned through the API
- Registration must generate an auditable event

#### Login

The system must authenticate users using email and password.

Requirements:

- Invalid credentials must return a consistent authentication error
- Successful login must issue a JWT
- JWT must contain required claims
- Login failures must be rate-limited
- Successful login must be auditable

#### Logout

The system must revoke the authenticated token.

Requirements:

- Token must contain a unique `jti`
- Revocation must be stored in Redis
- Revocation TTL must correspond to token expiration
- Revoked tokens must be rejected by authentication middleware

---

## 7. Authorization Requirements

Authenticated access does not automatically grant permission to every operation.

The system must distinguish:

```text
Authentication
    ≠
Authorization
```

KYC review endpoints must require:

```text
KYC_REVIEWER
or
ADMIN
```

A normal `USER` must receive `403 Forbidden`.

---

## 8. Wallet Requirements

### 8.1 Wallet Creation

Each user must have at most one wallet.

Wallet must maintain:

- Current balance
- Maximum balance limit
- Status
- Creation timestamp
- Update timestamp

### 8.2 Top-Up

A user may increase their wallet balance through the top-up operation.

Requirements:

- Amount must be positive
- Wallet must be active
- Maximum balance limit must be enforced atomically
- Operation must be idempotent
- Transaction record must be created
- Ledger entry must be created
- All financial changes must occur in one database transaction

### 8.3 Transfer

A user may transfer funds from their wallet to another wallet.

Requirements:

- Amount must be positive
- Sender must have sufficient funds
- Sender and receiver must exist
- Sender and receiver must be different
- Wallets must be active
- Balance changes must be atomic
- Sender must receive a debit ledger entry
- Receiver must receive a credit ledger entry
- Transaction must be recorded
- Operation must support idempotency
- Concurrent requests must not cause an invalid balance

---

## 9. Wallet Invariants

The following invariants must always hold:

```text
balance >= 0
```

and:

```text
balance <= max_balance_limit
```

For a successful transfer:

```text
sender debit = transfer amount
receiver credit = transfer amount
```

For a successful top-up:

```text
wallet credit = top-up amount
```

No successful financial operation may produce only a partial set of records.

---

## 10. Idempotency Requirements

Financial mutation endpoints must accept an idempotency key.

Initial scope:

- Top-up
- Transfer

The key must be scoped by:

```text
user_id
operation
idempotency_key
```

Example:

```text
idempotency:{user_id}:transfer:{key}
```

The database remains the ultimate source of truth.

Redis may accelerate idempotency lookups but must not be the only protection against duplicate financial operations.

---

## 11. KYC Requirements

Users may submit KYC information.

KYC lifecycle:

```text
PENDING
   ├── APPROVED
   └── REJECTED
```

Invalid state transitions must be rejected.

KYC review must:

- Require reviewer/admin authorization
- Record reviewer identity
- Record review timestamp
- Record rejection reason where applicable
- Generate an audit event

---

## 12. Ledger Requirements

The ledger is an append-oriented financial history.

Supported entry types:

```text
DEBIT
CREDIT
```

Every successful financial transaction must produce its required ledger entries.

Transfer:

```text
Sender   → DEBIT
Receiver → CREDIT
```

Top-up:

```text
Wallet → CREDIT
```

Ledger entries must not be silently modified or deleted through normal application behavior.

---

## 13. API Error Requirements

V2 must use consistent error responses.

Example:

```json
{
  "code": "INSUFFICIENT_FUNDS",
  "message": "Insufficient wallet balance"
}
```

Error codes must be stable enough for API clients to handle programmatically.

Internal database or infrastructure errors must not leak implementation details.

---

## 14. Audit Requirements

The system must audit security-sensitive and financial events.

Initial events:

```text
AUTH_REGISTER
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

Audit records should include, where applicable:

- User ID
- Action
- Request ID
- IP address
- User agent
- Relevant metadata
- Timestamp

---

## 15. Observability Requirements

The application must provide:

- Structured logs
- Request IDs
- Error codes
- Request latency
- Basic application metrics
- Database operation visibility
- Redis operation visibility

---

## 16. Health Requirements

The application must expose:

- Liveness
- Readiness

Readiness must account for required dependencies such as PostgreSQL.

---

## 17. Testing Requirements

V2 must include:

**Unit tests**
Service-level business rules.

**Integration tests**
Real PostgreSQL and Redis dependencies.

**API tests**
HTTP request/response behavior.

**Concurrency tests**
Concurrent financial mutations.

**Security tests**
Authentication, authorization, token revocation, and sensitive response validation.

---

## 18. Definition of Done

Bastion V2 is complete when:

- No API response exposes password hashes
- JWT validation is hardened
- RBAC protects privileged endpoints
- Authentication endpoints are rate-limited
- Top-up is atomic
- Transfer is atomic
- Idempotency is enforced
- Ledger invariants are enforced
- Concurrent operations are tested
- Integration tests use real PostgreSQL and Redis
- API errors are standardized
- Health checks exist
- Graceful shutdown exists
- Structured logging exists
- CI validates the project
- Docker production configuration is hardened
- V2 documentation matches implementation
