# Bastion — Technical Specification

> **Author:** Agam Latiff
> **Version:** 1.0
> **Service:** Auth Service (Go / Gin)
> **Focus:** Level 1 (Foundation) & Level 2 (Correctness)

---

## 1. Infrastructure

### 1.1 Runtime Environment

| Component | Version | Port | Container |
|---|---|---|---|
| Go Application | 1.21+ | `8080` | Host (dev) / Docker (prod) |
| PostgreSQL | 16 | `5433` | Docker Compose |
| Redis | 7 | `6379` | Docker Compose |

### 1.2 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5433` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_NAME` | Database name | `bastion` |
| `DB_SSLMODE` | SSL mode | `disable` |
| `REDIS_ADDR` | Redis address | `localhost:6379` |
| `JWT_SECRET` | JWT signing key | `your-secret-key` |
| `JWT_EXPIRY_HOURS` | Token lifespan in hours | `24` |
| `APP_PORT` | HTTP server port | `8080` |

### 1.3 Connection Management

**PostgreSQL — `pgxpool`:**
- Uses connection pool (`pgxpool.New`) for concurrent query handling
- Pool is created once in `main.go` and injected into all repositories
- `defer dbPool.Close()` ensures graceful shutdown

**Redis — `go-redis/v9`:**
- Single client connection (`redis.NewClient`)
- Used for JWT blacklist and future idempotency keys
- `defer rdb.Close()` ensures graceful shutdown

---

## 2. Authentication & Security

### 2.1 Password Hashing

```
Algorithm: bcrypt
Cost Factor: 12
Library: golang.org/x/crypto/bcrypt
```

- Passwords are hashed on registration with `bcrypt.GenerateFromPassword([]byte(password), 12)`
- Login verifies with `bcrypt.CompareHashAndPassword(hashedPassword, plainPassword)`
- Raw passwords are **never stored or logged**

### 2.2 JWT Token Specification

```
Algorithm: HS256 (HMAC-SHA256)
Library: github.com/golang-jwt/jwt/v5
Expiry: 24 hours (configurable via JWT_EXPIRY_HOURS)
```

**Token Claims:**

| Claim | Type | Description |
|---|---|---|
| `sub` | `string` | User ID (UUID) |
| `iat` | `int64` | Issued at (Unix timestamp) |
| `exp` | `int64` | Expiration (Unix timestamp) |

**Token Lifecycle:**
1. Generated on successful `Register` or `Login`
2. Sent in response body as `{ "token": "eyJ..." }`
3. Client includes in subsequent requests: `Authorization: Bearer <token>`
4. Middleware validates signature, expiry, and Redis blacklist on every protected request
5. On `Logout`, token is added to Redis blacklist with TTL = remaining lifespan

### 2.3 JWT Blacklist (Redis)

```
Key Pattern:    blacklist:{full_jwt_token}
Value:          "blacklisted"
TTL:            Remaining seconds until token expiry
```

**Validation Flow in AuthMiddleware:**
```
1. Extract "Bearer <token>" from Authorization header
2. Parse and validate JWT signature + expiry
3. Check Redis: EXISTS blacklist:{token}
   → If EXISTS: reject with 401 Unauthorized
   → If NOT EXISTS: extract user from DB, set in Gin context
4. c.Set("currentUser", *domain.User)
5. c.Set("token", tokenString)
6. c.Next()
```

---

## 3. Database Design

### 3.1 Table Specifications

#### `users`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | `gen_random_uuid()` |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | — |
| `password_hash` | `VARCHAR(255)` | NOT NULL | — |
| `full_name` | `VARCHAR(255)` | NOT NULL | — |
| `tier` | `VARCHAR(20)` | NOT NULL | `'tier_1'` |
| `is_verified` | `BOOLEAN` | NOT NULL | `FALSE` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` |

**Indexes:** `idx_users_email` on `email`

---

#### `wallets`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | `gen_random_uuid()` |
| `user_id` | `UUID` | UNIQUE, FK → `users.id`, ON DELETE CASCADE | — |
| `balance` | `BIGINT` | NOT NULL, CHECK `>= 0` | `0` |
| `max_balance_limit` | `BIGINT` | NOT NULL, CHECK `> 0` | `2000000` |
| `currency` | `VARCHAR(3)` | NOT NULL | `'IDR'` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` |

**Constraints:** `CHECK (balance <= max_balance_limit)`
**Indexes:** `idx_wallets_user` on `user_id`

---

#### `transactions`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | `gen_random_uuid()` |
| `idempotency_key` | `VARCHAR(255)` | UNIQUE, NOT NULL | — |
| `sender_wallet_id` | `UUID` | FK → `wallets.id` (nullable for top-ups) | — |
| `receiver_wallet_id` | `UUID` | FK → `wallets.id` (nullable for withdrawals) | — |
| `amount` | `BIGINT` | NOT NULL, CHECK `> 0` | — |
| `fee_amount` | `BIGINT` | NOT NULL, CHECK `>= 0` | `0` |
| `type` | `VARCHAR(50)` | NOT NULL | — |
| `status` | `VARCHAR(50)` | NOT NULL | `'pending'` |
| `description` | `TEXT` | — | — |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` |

**Transaction Types:** `topup`, `transfer`
**Transaction Statuses:** `pending`, `success`, `failed`
**Indexes:** `idx_transactions_sender`, `idx_transactions_receiver`, `idx_transactions_idem_key`

---

#### `kyc_verifications`

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | `gen_random_uuid()` |
| `user_id` | `UUID` | UNIQUE, FK → `users.id`, ON DELETE CASCADE | — |
| `id_card_number` | `VARCHAR(50)` | UNIQUE, NOT NULL | — |
| `id_card_image_url` | `VARCHAR(512)` | NOT NULL | — |
| `selfie_image_url` | `VARCHAR(512)` | NOT NULL | — |
| `status` | `VARCHAR(20)` | NOT NULL | `'pending'` |
| `rejection_reason` | `TEXT` | nullable | — |
| `submitted_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` |
| `verified_at` | `TIMESTAMPTZ` | nullable | — |

**KYC Statuses:** `pending`, `approved`, `rejected`
**Indexes:** `idx_kyc_user` on `user_id`

---

#### `ledger_entries` (Sprint 1.4)

| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `UUID` | PRIMARY KEY | `gen_random_uuid()` |
| `transaction_id` | `UUID` | FK → `transactions.id`, NOT NULL | — |
| `wallet_id` | `UUID` | FK → `wallets.id`, NOT NULL | — |
| `entry_type` | `VARCHAR(10)` | NOT NULL | — |
| `amount` | `BIGINT` | NOT NULL, CHECK `> 0` | — |
| `balance_after` | `BIGINT` | NOT NULL, CHECK `>= 0` | — |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` |

**Entry Types:** `debit` (money out), `credit` (money in)
**Indexes:** `idx_ledger_wallet`, `idx_ledger_tx`

### 3.2 Entity Relationship Diagram

```
┌──────────────┐       1:1        ┌──────────────┐
│    USERS     │──────────────────│   WALLETS    │
│              │                  │              │
│ id (PK)      │                  │ id (PK)      │
│ email (UK)   │                  │ user_id (FK) │
│ password_hash│                  │ balance      │
│ full_name    │                  │ max_balance  │
│ tier         │                  │ currency     │
│ is_verified  │                  └──────┬───────┘
└──────┬───────┘                         │
       │                                 │ 1:N
       │ 1:1                             │
       │                          ┌──────▼───────┐
┌──────▼───────┐                  │ TRANSACTIONS │
│   KYC_       │                  │              │
│ VERIFICATIONS│                  │ id (PK)      │
│              │                  │ idem_key (UK)│
│ id (PK)      │                  │ sender_id    │
│ user_id (FK) │                  │ receiver_id  │
│ id_card_num  │                  │ amount       │
│ status       │                  │ type         │
│ rejection    │                  │ status       │
└──────────────┘                  └──────┬───────┘
                                         │ 1:N
                                         │
                                  ┌──────▼───────┐
                                  │   LEDGER_    │
                                  │   ENTRIES    │
                                  │              │
                                  │ id (PK)      │
                                  │ tx_id (FK)   │
                                  │ wallet_id    │
                                  │ entry_type   │
                                  │ amount       │
                                  │ balance_after│
                                  └──────────────┘
```

---

## 4. API Endpoint Specifications

### 4.1 Route Registration

```
PUBLIC ROUTES:
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login

PROTECTED ROUTES (AuthMiddleware):
  GET    /api/v1/auth/profile
  POST   /api/v1/auth/logout

  GET    /api/v1/wallet/balance
  POST   /api/v1/wallet/topup
  GET    /api/v1/wallet/transactions

  POST   /api/v1/auth/kyc
  GET    /api/v1/auth/kyc/status
  POST   /api/v1/auth/kyc/review

  POST   /api/v1/wallet/transfer          (Sprint 1.4)
```

### 4.2 Request / Response Schemas

#### POST `/api/v1/auth/register`

**Request:**
```json
{
  "email": "agam@test.com",
  "password": "password123",
  "full_name": "Agam Latiff"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "user registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "email": "agam@test.com",
      "full_name": "Agam Latiff",
      "tier": "tier_1",
      "is_verified": false,
      "created_at": "2026-08-17T10:00:00Z"
    }
  }
}
```

---

#### POST `/api/v1/auth/login`

**Request:**
```json
{
  "email": "agam@test.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "email": "agam@test.com",
      "full_name": "Agam Latiff",
      "tier": "tier_1",
      "is_verified": false
    }
  }
}
```

---

#### POST `/api/v1/wallet/topup`

**Request:**
```json
{
  "amount": 100000,
  "idempotency_key": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "description": "Monthly top-up"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "top-up successful",
  "data": {
    "id": "tx-uuid-12345",
    "amount": 100000,
    "fee_amount": 0,
    "type": "topup",
    "status": "success",
    "description": "Monthly top-up",
    "created_at": "2026-08-17T10:00:00Z"
  }
}
```

---

#### POST `/api/v1/auth/kyc`

**Request:**
```json
{
  "id_card_number": "3171012345670001",
  "id_card_image_url": "https://storage.bastion.com/ktp/user-123.jpg",
  "selfie_image_url": "https://storage.bastion.com/selfie/user-123.jpg"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "KYC application submitted successfully",
  "data": {
    "id": "kyc-uuid-123",
    "user_id": "usr-uuid-456",
    "id_card_number": "3171012345670001",
    "status": "pending",
    "submitted_at": "2026-08-17T10:00:00Z"
  }
}
```

---

#### POST `/api/v1/wallet/transfer` (Sprint 1.4)

**Request:**
```json
{
  "receiver_email": "jack@test.com",
  "amount": 50000,
  "idempotency_key": "transfer-uuid-789",
  "description": "Lunch money"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "transfer successful",
  "data": {
    "id": "tx-uuid-999",
    "sender_wallet_id": "wallet-uuid-111",
    "receiver_wallet_id": "wallet-uuid-222",
    "amount": 50000,
    "fee_amount": 0,
    "type": "transfer",
    "status": "success",
    "description": "Lunch money",
    "created_at": "2026-08-17T10:00:00Z"
  }
}
```

---

## 5. Concurrency & Data Integrity (Level 2)

### 5.1 Row-Level Locking Strategy

**Problem:** Two simultaneous transfers from the same wallet can cause double-spending.

**Solution:** Use PostgreSQL `SELECT ... FOR UPDATE` to lock the wallet row during a transaction.

```sql
-- Lock the sender's wallet row (no other transaction can read or modify it until COMMIT)
SELECT id, balance FROM wallets WHERE id = $1 FOR UPDATE;
```

### 5.2 Deadlock Prevention

**Problem:** User A sends to B, and User B sends to A at the exact same millisecond. Each locks their own wallet first, then tries to lock the other — both wait forever (deadlock).

**Solution:** Always lock wallets in **ascending UUID order**, regardless of who is the sender or receiver.

```go
firstID, secondID := senderWalletID, receiverWalletID
if firstID > secondID {
    firstID, secondID = secondID, firstID
}
// Lock firstID, then lock secondID — guaranteed consistent order
```

### 5.3 Idempotency Key Strategy

**Problem:** Client sends a transfer request, network times out, client retries — money gets deducted twice.

**Solution:** Every mutation request includes an `idempotency_key`. Before processing:

```
1. Check Redis: GET idempotency:{key}
   → Found: return cached response immediately (no business logic executed)
   → Not Found: continue processing

2. Execute business logic (transfer/top-up)

3. Cache result: SET idempotency:{key} {response_json} EX 86400   (24h TTL)
```

### 5.4 P2P Transfer Transaction Flow (Sprint 1.4)

```
BEGIN TRANSACTION
  │
  ├── 1. Check idempotency key (Redis)
  │       → If exists: return cached response, skip everything
  │
  ├── 2. Sort wallet IDs (ascending UUID order)
  │
  ├── 3. SELECT ... FOR UPDATE — Lock first wallet
  ├── 4. SELECT ... FOR UPDATE — Lock second wallet
  │
  ├── 5. Validate:
  │       → sender.balance >= amount
  │       → receiver.balance + amount <= receiver.max_balance_limit
  │       → sender.tier == "tier_2"
  │       → sender_id != receiver_id
  │
  ├── 6. UPDATE wallets SET balance = balance - amount WHERE id = sender_id
  ├── 7. UPDATE wallets SET balance = balance + amount WHERE id = receiver_id
  │
  ├── 8. INSERT INTO transactions (...)
  ├── 9. INSERT INTO ledger_entries (debit for sender)
  ├── 10. INSERT INTO ledger_entries (credit for receiver)
  │
  ├── 11. Cache response in Redis (idempotency key, 24h TTL)
  │
COMMIT TRANSACTION
```

---

## 6. Dependency Injection Wiring

All dependencies are wired in `main.go` following the Repository → Service → Handler pattern:

```go
// Auth DI
userRepo    := repository.NewUserRepository(dbPool)
authService := service.NewAuthService(userRepo, rdb, cfg.JWTSecret, cfg.JWTExpiryHours)
authHandler := handler.NewAuthHandler(authService)

// Wallet DI
walletRepo    := repository.NewWalletRepository(dbPool)
walletService := service.NewWalletService(walletRepo)
walletHandler := handler.NewWalletHandler(walletService)

// KYC DI
kycRepo    := repository.NewKYCRepository(dbPool)
kycService := service.NewKYCService(kycRepo)
kycHandler := handler.NewKYCHandler(kycService)
```

**Why this order matters:**
1. Repository depends on `*pgxpool.Pool` (database connection)
2. Service depends on `Repository` interface (business logic calls data access)
3. Handler depends on `Service` interface (HTTP layer calls business logic)
4. `main.go` is the **Composition Root** — the only file that knows about all concrete implementations

---

## 7. Error Handling Strategy

### 7.1 Error Flow Across Layers

```
Repository: Returns raw errors from pgx/database
    → errors.Is(err, pgx.ErrNoRows) → translate to domain error
    → other errors → propagate as-is

Service: Creates business rule errors
    → errors.New("user is already verified as tier 2")
    → errors.New("insufficient balance")

Handler: Maps errors to HTTP status codes
    → Business rule error → 400 Bad Request
    → Not found error → 404 Not Found
    → Auth error → 401 Unauthorized
    → Success → 200/201 with data
```

### 7.2 Transaction Rollback Safety

All multi-statement database transactions use `defer tx.Rollback(ctx)`:

```go
tx, err := r.db.Begin(ctx)
if err != nil {
    return err
}
defer tx.Rollback(ctx)  // Automatically rolls back if Commit is never reached

// ... execute queries ...

return tx.Commit(ctx)   // Only commits if all queries succeeded
```

If any query fails and the function returns early, `defer tx.Rollback(ctx)` ensures the entire transaction is safely rolled back — no partial updates, no corrupted data.

---

## 8. Go Module Dependencies

```
github.com/gin-gonic/gin           # HTTP framework
github.com/jackc/pgx/v5            # PostgreSQL driver + connection pool
github.com/redis/go-redis/v9       # Redis client
github.com/golang-jwt/jwt/v5       # JWT token library
golang.org/x/crypto                # bcrypt password hashing
github.com/google/uuid             # UUID generation
github.com/joho/godotenv           # .env file loader
```
