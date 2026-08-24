# Bastion V2 — API Specification

> **Version:** 2.0
> **Status:** Draft
> **Base URL:** `/api/v1`

---

## 1. API Principles

Bastion V2 API follows:

- RESTful resource naming
- JSON request/response
- JWT authentication
- RBAC authorization
- Stable error codes
- Idempotency for financial mutations
- Pagination for collections
- No persistence model leakage
- No sensitive field exposure

V2 does not automatically introduce `/api/v2`.

The existing `/api/v1` contract remains unless a breaking API change is introduced.

---

## 2. Authentication

Protected endpoints use:

```http
Authorization: Bearer <JWT>
```

Financial mutation endpoints additionally require:

```http
Idempotency-Key: <unique-key>
```

---

## 3. Response Format

Successful response:

```json
{
  "data": {}
}
```

Collection response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Error response:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

## 4. HTTP Status Codes

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 200    | Successful request                       |
| 201    | Resource created                         |
| 204    | Successful request without response body |
| 400    | Invalid request                          |
| 401    | Authentication required/failed           |
| 403    | Insufficient permission                  |
| 404    | Resource not found                       |
| 409    | Conflict                                 |
| 422    | Validation failure                       |
| 429    | Rate limited                             |
| 500    | Internal error                           |

---

## 5. Authentication Endpoints

### Register

```http
POST /api/v1/auth/register
```

#### Request

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "full_name": "John Doe"
}
```

#### Response

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "USER",
    "tier": "BASIC"
  }
}
```

#### Requirements

- Email must be valid
- Email must be unique
- Password must satisfy configured requirements
- Password must be hashed
- Password hash must never be returned
- Registration must be audited

---

### Login

```http
POST /api/v1/auth/login
```

#### Request

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

#### Response

```json
{
  "data": {
    "access_token": "jwt",
    "token_type": "Bearer",
    "expires_at": "2026-08-24T12:00:00Z"
  }
}
```

#### Requirements

- Invalid credentials return `401`
- Login is rate-limited
- Successful login is audited
- JWT contains `sub`, `jti`, `iat`, `exp`
- JWT algorithm must be explicitly validated

---

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <JWT>
```

#### Behavior

The JWT `jti` is revoked through Redis.

Redis key:

```text
auth:revoked:{jti}
```

TTL:

```text
JWT expiration - current time
```

---

### Get Profile

```http
GET /api/v1/auth/profile
Authorization: Bearer <JWT>
```

#### Response

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "USER",
    "tier": "BASIC",
    "is_verified": false
  }
}
```

---

## 6. Wallet Endpoints

### Get Wallet

```http
GET /api/v1/wallet
Authorization: Bearer <JWT>
```

#### Response

```json
{
  "data": {
    "id": "uuid",
    "balance": "100000.00",
    "max_balance_limit": "10000000.00",
    "status": "ACTIVE"
  }
}
```

Financial amounts must not use floating-point representations internally.

---

## 7. Top-Up

```http
POST /api/v1/wallet/top-up
Authorization: Bearer <JWT>
Idempotency-Key: <unique-key>
```

### Request

```json
{
  "amount": "100000.00"
}
```

### Response

```json
{
  "data": {
    "transaction_id": "uuid",
    "type": "TOP_UP",
    "amount": "100000.00",
    "status": "COMPLETED",
    "created_at": "2026-08-24T12:00:00Z"
  }
}
```

### Requirements

- Amount > 0
- Wallet must be active
- Wallet limit must be enforced atomically
- Idempotency required
- Transaction must be created
- Ledger entry must be created
- All changes must occur in one database transaction

---

## 8. Transfer

```http
POST /api/v1/wallet/transfer
Authorization: Bearer <JWT>
Idempotency-Key: <unique-key>
```

### Request

```json
{
  "destination_wallet_id": "uuid",
  "amount": "50000.00"
}
```

### Response

```json
{
  "data": {
    "transaction_id": "uuid",
    "type": "TRANSFER",
    "amount": "50000.00",
    "status": "COMPLETED",
    "created_at": "2026-08-24T12:00:00Z"
  }
}
```

### Requirements

- Amount > 0
- Destination wallet must exist
- Destination cannot equal sender wallet
- Both wallets must be active
- Sender must have sufficient funds
- Operation must be atomic
- Operation must be idempotent

---

## 9. Transaction Endpoints

### List Transactions

```http
GET /api/v1/transactions
Authorization: Bearer <JWT>
```

Query parameters:

```text
?page=1
&limit=20
&type=TRANSFER
&status=COMPLETED
```

#### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "TRANSFER",
      "amount": "50000.00",
      "status": "COMPLETED",
      "created_at": "2026-08-24T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Users may only access transactions associated with their account/wallets.

---

### Get Transaction

```http
GET /api/v1/transactions/:id
Authorization: Bearer <JWT>
```

A transaction belonging to another user must not be exposed.

---

## 10. KYC Endpoints

### Submit KYC

```http
POST /api/v1/kyc
Authorization: Bearer <JWT>
```

#### Request

```json
{
  "id_card_number": "..."
}
```

#### Response

```json
{
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "submitted_at": "2026-08-24T12:00:00Z"
  }
}
```

---

### Get Own KYC

```http
GET /api/v1/kyc
Authorization: Bearer <JWT>
```

---

## 11. Admin KYC

Required roles:

```text
KYC_REVIEWER
ADMIN
```

### List KYC

```http
GET /api/v1/admin/kyc
Authorization: Bearer <JWT>
```

Optional:

```text
?status=PENDING
&page=1
&limit=20
```

---

### Approve KYC

```http
POST /api/v1/admin/kyc/:id/approve
Authorization: Bearer <JWT>
```

Valid only when:

```text
PENDING → APPROVED
```

---

### Reject KYC

```http
POST /api/v1/admin/kyc/:id/reject
Authorization: Bearer <JWT>
```

#### Request

```json
{
  "reason": "Document could not be verified"
}
```

Valid only when:

```text
PENDING → REJECTED
```

---

## 12. Health Endpoints

### Liveness

```http
GET /health/live
```

Response:

```json
{
  "status": "ok"
}
```

---

### Readiness

```http
GET /health/ready
```

Readiness verifies required dependencies.

---

## 13. Error Codes

Initial error codes:

```text
INVALID_REQUEST
VALIDATION_ERROR

INVALID_CREDENTIALS
UNAUTHORIZED
FORBIDDEN

USER_NOT_FOUND
WALLET_NOT_FOUND
TRANSACTION_NOT_FOUND
KYC_NOT_FOUND

INVALID_AMOUNT
INSUFFICIENT_FUNDS
WALLET_LIMIT_EXCEEDED
WALLET_NOT_ACTIVE
SELF_TRANSFER

IDEMPOTENCY_REQUIRED
IDEMPOTENCY_CONFLICT

KYC_INVALID_STATE

RATE_LIMITED

INTERNAL_ERROR
```

---

## 14. Idempotency Contract

Required for:

```text
POST /api/v1/wallet/top-up
POST /api/v1/wallet/transfer
```

Header:

```http
Idempotency-Key: <key>
```

The key is scoped by:

```text
user_id
operation
idempotency_key
```

Reusing the same key with the same request returns the original operation result.

Reusing the same key with a different request returns:

```http
409 Conflict
```

```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Idempotency key has already been used with a different request"
  }
}
```

---

## 15. API Security Rules

The API must never expose:

- Password hashes
- JWT secrets
- Raw JWTs in logs
- Internal SQL errors
- Stack traces
- Sensitive KYC data unnecessarily

Authorization must always be checked server-side.

Client-provided user IDs must not override the authenticated identity.

---

## 16. API Architecture Summary

```text
Client
  ↓
Router
  ↓
Middleware
  ↓
Handler
  ↓
Service
  ↓
Repository
  ↓
PostgreSQL / Redis
```

Handlers do not contain business logic.

Repositories do not contain HTTP logic.

Services do not return HTTP-specific responses.
