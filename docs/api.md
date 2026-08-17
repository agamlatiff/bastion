# Bastion — Unified API Specification

> **Author:** Agam Latiff  
> **API Version:** 2.0  
> **Go Public Gateway:** `http://localhost:8080/api/v1`  
> **Java Internal Gateway:** `http://localhost:8081/internal/v1`  

---

## 1. API Design Standards

### 1.1 Response Envelope Format

All Bastion APIs return a consistent JSON response envelope.

#### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    "key": "value"
  }
}
```

#### Error Response
```json
{
  "status": "error",
  "message": "Human-readable description of error",
  "data": null,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "details": "Requested transfer amount (Rp 100,000) exceeds current balance (Rp 40,000)"
  }
}
```

### 1.2 Authentication Methods

* **Public APIs (`/api/v1/auth/register`, `/api/v1/auth/login`)**: No authentication required.
* **Protected Public APIs (`/api/v1/*`)**: Requires `Authorization: Bearer <jwt_token>` header.
* **Internal APIs (`/internal/v1/*`)**: Requires `X-Internal-Service-Key: <secret_key>` and `X-Request-ID: <uuid>` headers.

---

## 2. Go Core — Public API Catalog

### 2.1 Identity & Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/auth/register` | Public | Register a new user and auto-create a Tier 1 wallet (0 IDR balance). |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user credentials and return a signed JWT token (24h TTL). |
| `GET` | `/api/v1/auth/profile` | 🔒 JWT | Retrieve authenticated user profile, tier level, and verification status. |
| `POST` | `/api/v1/auth/logout` | 🔒 JWT | Invalidate active JWT token via Redis blacklist (`blacklist:{token}`). |
| `POST` | `/api/v1/auth/kyc` | 🔒 JWT | Submit Indonesian National ID (NIK - 16 digits) and selfie for Tier 2 verification. |
| `GET` | `/api/v1/auth/kyc/status` | 🔒 JWT | Get verification status (`pending`, `approved`, `rejected`). |
| `POST` | `/api/v1/auth/kyc/review` | 🔒 Admin | Review pending KYC and atomically upgrade user tier to Tier 2 (Limit: 10M IDR). |

#### Sample Request: Submit KYC
```http
POST /api/v1/auth/kyc
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "id_card_number": "3171012345670001",
  "id_card_image_url": "https://storage.bastion.io/kyc/ktp_123.jpg",
  "selfie_image_url": "https://storage.bastion.io/kyc/selfie_123.jpg"
}
```

---

### 2.2 Wallet & Transactions (`/api/v1/wallet`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/wallet/balance` | 🔒 JWT | Retrieve current wallet balance, tier limit, and currency. |
| `POST` | `/api/v1/wallet/topup` | 🔒 JWT | Top up wallet balance with idempotency key protection. |
| `POST` | `/api/v1/wallet/transfer` | 🔒 Tier 2 | P2P transfer to another user wallet via receiver email. Atomic deadlock-free lock. |
| `GET` | `/api/v1/wallet/transactions` | 🔒 JWT | Get paginated transaction history (`limit`, `offset`). |

#### Sample Request: P2P Transfer
```http
POST /api/v1/wallet/transfer
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "receiver_email": "jane.doe@example.com",
  "amount": 150000,
  "idempotency_key": "transfer-uuid-8899",
  "description": "Lunch payment split"
}
```

---

### 2.3 Merchant Management (`/api/v1/merchants`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/merchants` | 🔒 JWT | Register a merchant profile linked to current user account. |
| `GET` | `/api/v1/merchants/me` | 🔒 JWT | Get merchant profile and active status. |
| `POST` | `/api/v1/merchants/:id/activate` | 🔒 Admin | Activate merchant account to accept payments. |
| `POST` | `/api/v1/merchants/:id/suspend` | 🔒 Admin | Suspend merchant account. |

---

### 2.4 Payments & Refunds (`/api/v1/payments`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/payments` | 🔒 Merchant | Create payment request with amount, unique reference, and expiry. |
| `GET` | `/api/v1/payments/:id` | 🔒 JWT | Retrieve payment request details and lifecycle status. |
| `POST` | `/api/v1/payments/:id/pay` | 🔒 Customer | Execute payment with risk evaluation and atomic wallet debit/credit. |
| `POST` | `/api/v1/payments/:id/cancel` | 🔒 JWT | Cancel a pending payment request. |
| `POST` | `/api/v1/payments/:id/refund` | 🔒 Merchant | Issue a full or partial refund against a completed payment. |
| `GET` | `/api/v1/refunds/:id` | 🔒 JWT | Retrieve refund transaction details. |

#### Sample Request: Create Payment Request
```http
POST /api/v1/payments
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "amount": 250000,
  "reference": "INV-20260817-001",
  "description": "Coffee Beans Subscription",
  "expires_in_minutes": 60
}
```

---

## 3. Java Platform — Internal API Catalog

### 3.1 Risk Assessment (`/internal/v1/risk`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/internal/v1/risk/assess` | 🔑 Internal | Synchronously evaluate transaction risk score ($0-100$) and decision. |

#### Sample Request: Evaluate Risk
```http
POST /internal/v1/risk/assess
X-Internal-Service-Key: bastion-internal-secret-token
X-Request-ID: 7f8a32b1-5e8c-4f90-8b9a-112233445566
Content-Type: application/json

{
  "transaction_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "amount": 8500000,
  "receiver_id": "4fa85f64-5717-4562-b3fc-2c963f66afa7",
  "payment_type": "MERCHANT_PAYMENT"
}
```

#### Sample Response:
```json
{
  "status": "success",
  "message": "Risk assessment completed",
  "data": {
    "risk_score": 75,
    "decision": "REVIEW",
    "reasons": [
      "HIGH_AMOUNT",
      "NEW_RECIPIENT",
      "VELOCITY_SPIKE"
    ],
    "engine_version": "v2.0-deterministic"
  }
}
```

---

### 3.2 Fraud Case Management (`/internal/v1/fraud`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/internal/v1/fraud/cases` | 🔑 Operator | List fraud cases filtered by status (`open`, `under_review`, etc.). |
| `GET` | `/internal/v1/fraud/cases/:id` | 🔑 Operator | Get fraud case investigation details. |
| `POST` | `/internal/v1/fraud/cases/:id/review` | 🔑 Operator | Transition fraud case status to `under_review`. |
| `POST` | `/internal/v1/fraud/cases/:id/confirm` | 🔑 Operator | Confirm fraud and flag account. |
| `POST` | `/internal/v1/fraud/cases/:id/dismiss` | 🔑 Operator | Dismiss false-positive fraud case. |

---

### 3.3 Reconciliation (`/internal/v1/reconciliation`)

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/internal/v1/reconciliation/runs` | 🔑 Operator | Trigger a new financial reconciliation run for a provider. |
| `POST` | `/internal/v1/reconciliation/runs/:id/import` | 🔑 Operator | Ingest external statement records and execute matching against ledger. |
| `GET` | `/internal/v1/reconciliation/runs/:id` | 🔑 Operator | Retrieve reconciliation summary, matched count, and discrepancy items. |

---

## 4. Standard Error Codes Catalog

| Error Code | HTTP Status | Description |
|---|:---:|---|
| `UNAUTHORIZED` | `401` | Missing, expired, or blacklisted JWT token. |
| `FORBIDDEN_TIER` | `403` | User tier level does not have permission (e.g. Tier 1 attempting P2P transfer). |
| `INSUFFICIENT_BALANCE` | `400` | Account balance is insufficient to complete the transaction. |
| `BALANCE_LIMIT_EXCEEDED` | `400` | Transaction would cause receiver wallet balance to exceed tier limit. |
| `DUPLICATE_IDEMPOTENCY_KEY` | `409` | Request idempotency key has already been processed with different parameters. |
| `PAYMENT_EXPIRED` | `400` | Payment request has passed its `expires_at` timestamp. |
| `PAYMENT_ALREADY_COMPLETED` | `400` | Payment is already marked as completed. |
| `REFUND_EXCEEDS_PAYMENT` | `400` | Total refund amount exceeds original payment amount. |
| `MERCHANT_SUSPENDED` | `403` | Merchant is suspended and cannot accept payments or create invoices. |
| `INTERNAL_SERVICE_UNAVAILABLE` | `503` | Risk engine or external dependency is unreachable. |
