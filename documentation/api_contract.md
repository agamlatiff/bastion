# 📡 Bastion — API Contract

Base URL: `http://localhost:8080`

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Auth Endpoints

### POST `/api/v1/auth/register`
Register a new user. Auto-creates a wallet with Rp0 balance.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```

**Response `201 Created`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "full_name": "John Doe",
    "is_verified": false,
    "created_at": "2026-07-31T15:04:05Z",
    "updated_at": "2026-07-31T15:04:05Z"
  }
}
```

**Errors:**
| Status | Reason |
|---|---|
| `400` | Missing/invalid fields |
| `409` | Email already registered |
| `500` | Internal server error |

---

### POST `/api/v1/auth/login`
Login with email and password. Returns a JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "full_name": "John Doe",
    "is_verified": false,
    "created_at": "2026-07-31T15:04:05Z",
    "updated_at": "2026-07-31T15:04:05Z"
  }
}
```

**Errors:**
| Status | Reason |
|---|---|
| `400` | Missing/invalid fields |
| `401` | Invalid email or password |

> Note: We always return `"invalid email or password"` — never reveal whether email exists.

---

### GET `/api/v1/auth/me` 🔒
Get the currently authenticated user's profile.

**Response `200 OK`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "full_name": "John Doe",
  "is_verified": false,
  "created_at": "2026-07-31T15:04:05Z",
  "updated_at": "2026-07-31T15:04:05Z"
}
```

**Errors:**
| Status | Reason |
|---|---|
| `401` | Missing, invalid, or blacklisted token |

---

### POST `/api/v1/auth/logout` 🔒
Logout by blacklisting the current JWT in Redis.

**Request:** (no body required)

**Response `200 OK`:**
```json
{
  "message": "logged out successfully"
}
```

> After this, the same token will return `401` on all protected endpoints.

---

## Wallet Endpoints

### GET `/api/v1/wallet` 🔒
Get the current user's wallet balance.

**Response `200 OK`:**
```json
{
  "id": "661e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "balance": 150000,
  "balance_formatted": "Rp150.000",
  "currency": "IDR",
  "created_at": "2026-07-31T15:04:05Z"
}
```

---

### POST `/api/v1/wallet/topup` 🔒
Add money to the current user's wallet.

**Request:**
```json
{
  "amount": 100000,
  "idempotency_key": "topup-2026-07-31-001"
}
```

**Response `200 OK`:**
```json
{
  "transaction": {
    "id": "772e8400-e29b-41d4-a716-446655440002",
    "type": "topup",
    "amount": 100000,
    "status": "success",
    "description": "Wallet top-up",
    "created_at": "2026-07-31T15:04:05Z"
  },
  "new_balance": 250000
}
```

**Errors:**
| Status | Reason |
|---|---|
| `400` | Amount must be > 0 |
| `422` | Invalid idempotency key format |

---

## Transaction Endpoints

### POST `/api/v1/transactions/transfer` 🔒
Transfer money to another user.

**Request:**
```json
{
  "receiver_email": "jane@example.com",
  "amount": 50000,
  "description": "Lunch split",
  "idempotency_key": "transfer-2026-07-31-john-jane-001"
}
```

**Response `200 OK`:**
```json
{
  "transaction": {
    "id": "883e8400-e29b-41d4-a716-446655440003",
    "type": "transfer",
    "amount": 50000,
    "status": "success",
    "description": "Lunch split",
    "sender_wallet_id": "661e8400-e29b-41d4-a716-446655440001",
    "receiver_wallet_id": "772e8400-e29b-41d4-a716-446655440004",
    "created_at": "2026-07-31T15:04:05Z"
  },
  "new_balance": 100000
}
```

**Errors:**
| Status | Reason |
|---|---|
| `400` | Missing/invalid fields |
| `404` | Receiver user not found |
| `409` | Duplicate idempotency key (returns same response as original) |
| `422` | Insufficient balance |
| `422` | Cannot transfer to yourself |

> **Idempotency**: If you send the same `idempotency_key` twice, the second request returns the same response as the first — no double charge.

---

### GET `/api/v1/transactions` 🔒
List the current user's transactions with pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `type` | string | all | Filter: `transfer`, `topup`, `payment` |

**Example:** `GET /api/v1/transactions?page=1&limit=10&type=transfer`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "883e8400-e29b-41d4-a716-446655440003",
      "type": "transfer",
      "amount": 50000,
      "status": "success",
      "description": "Lunch split",
      "direction": "sent",
      "counterpart_name": "Jane Smith",
      "created_at": "2026-07-31T15:04:05Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 47,
    "total_pages": 5
  }
}
```

---

### GET `/api/v1/transactions/:id` 🔒
Get a single transaction by ID.

**Response `200 OK`:**
```json
{
  "id": "883e8400-e29b-41d4-a716-446655440003",
  "type": "transfer",
  "amount": 50000,
  "status": "success",
  "description": "Lunch split",
  "sender_wallet_id": "661e8400-...",
  "receiver_wallet_id": "772e8400-...",
  "created_at": "2026-07-31T15:04:05Z",
  "ledger_entries": [
    {
      "wallet_id": "661e8400-...",
      "entry_type": "debit",
      "amount": 50000,
      "balance_after": 100000
    },
    {
      "wallet_id": "772e8400-...",
      "entry_type": "credit",
      "amount": 50000,
      "balance_after": 75000
    }
  ]
}
```

---

## Notification Endpoints

### GET `/api/v1/notifications` 🔒
List notifications for the current user.

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `unread_only` | bool | false | Only return unread notifications |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "994e8400-e29b-41d4-a716-446655440005",
      "title": "Money Received",
      "message": "You received Rp50,000 from John Doe",
      "type": "transfer_received",
      "is_read": false,
      "created_at": "2026-07-31T15:04:05Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "unread_count": 3
  }
}
```

---

### PATCH `/api/v1/notifications/:id/read` 🔒
Mark a notification as read.

**Response `200 OK`:**
```json
{
  "message": "notification marked as read"
}
```

---

## WebSocket

### GET `/api/v1/ws` 🔒
Establish a WebSocket connection for real-time notifications.

**Connection:** Include JWT in query param:
```
ws://localhost:8080/api/v1/ws?token=eyJhbGci...
```

**Message format received from server:**
```json
{
  "type": "notification",
  "data": {
    "id": "994e8400-...",
    "title": "Money Received",
    "message": "You received Rp50,000 from John Doe",
    "type": "transfer_received",
    "created_at": "2026-07-31T15:04:05Z"
  }
}
```

---

## Health Check

### GET `/health`
Check if the service is running. No authentication required.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "bastion-gateway"
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "human readable error message"
}
```

Or for validation errors:
```json
{
  "error": "validation failed",
  "details": {
    "email": "must be a valid email address",
    "password": "must be at least 8 characters"
  }
}
```

---

## HTTP Status Codes Used

| Code | Meaning | When used |
|---|---|---|
| `200` | OK | Successful GET, POST, PATCH |
| `201` | Created | Resource created (register) |
| `400` | Bad Request | Invalid request body or params |
| `401` | Unauthorized | Missing/invalid/expired token |
| `403` | Forbidden | Token valid but not authorized |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate (email, idempotency key) |
| `422` | Unprocessable | Business rule violation (insufficient balance) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |
