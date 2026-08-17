# Bastion — Product Requirements Document (PRD)

> **Author:** Agam Latiff
> **Version:** 1.0
> **Language:** Go (Gin Framework)
> **Focus:** Level 1 (Foundation) & Level 2 (Correctness)

---

## 1. Product Overview

Bastion is a simulated digital wallet backend system built with Go and Clean Architecture. It demonstrates production-grade backend engineering through a realistic fintech domain: user authentication, wallet management, KYC verification, and peer-to-peer money transfers.

The product surface is intentionally simple. The complexity lives in the backend — concurrency safety, ACID transactions, tier-based access control, and financial data integrity.

### 1.1 Core User Journey

```
Register → Auto-create Tier 1 Wallet (Rp 0, Limit 2M)
    → Top-Up → Balance increases
    → Submit KYC (KTP + Selfie) → Approved → Upgrade to Tier 2 (Limit 10M)
    → P2P Transfer (Tier 2 only) → Atomic debit/credit with row-level locking
    → View Transaction History → Paginated ledger
    → Logout → JWT blacklisted via Redis
```

### 1.2 Tier System

| Tier | Status | Balance Limit | Privileges |
|------|--------|---------------|------------|
| **Tier 1** | Unverified (default on registration) | Max `2,000,000 IDR` | Top-Up, Receive Transfers, View Balance |
| **Tier 2** | KYC Verified | Max `10,000,000 IDR` | All Tier 1 + **Outgoing P2P Transfers** |

### 1.3 Domain Boundaries

| Domain | Owns | Examples |
|--------|------|----------|
| **Identity** | User accounts, authentication, sessions | Register, Login, Logout, JWT, Redis Blacklist |
| **Wallet** | Wallet balances, balance mutations, transaction safety | Get Balance, Top-Up, Balance Limits |
| **Money Movement** | Transfers, transaction records | P2P Transfer, Idempotency, Double-Entry Ledger |
| **KYC** | Identity verification, tier upgrades | KTP Submission, Tier 1 → Tier 2 Upgrade |

---

## 2. Feature Specifications

### 2.1 Authentication & User Management

| # | Feature | Endpoint | Method | Auth | Status |
|---|---------|----------|--------|------|--------|
| 1 | User Registration | `/api/v1/auth/register` | POST | Public | ✅ Done |
| 2 | User Login | `/api/v1/auth/login` | POST | Public | ✅ Done |
| 3 | Get Profile | `/api/v1/auth/profile` | GET | 🔒 JWT | ✅ Done |
| 4 | Logout | `/api/v1/auth/logout` | POST | 🔒 JWT | ✅ Done |

**Engineering Details:**
- Passwords hashed with **bcrypt** (cost factor 12)
- Stateless **JWT** tokens (24h expiry) with `sub`, `iat`, `exp` claims
- Token revocation via **Redis Blacklist** (`blacklist:{token}` key with TTL matching remaining token lifespan)
- Registration auto-creates a 1:1 Tier 1 wallet with 0 IDR balance

**Acceptance Criteria:**
- Rejects duplicate email with `409 Conflict`
- Rejects weak passwords (< 8 characters) with `400 Bad Request`
- Returns generic `401 Unauthorized` on login failure (does not reveal email existence)
- Logout blacklists JWT so subsequent requests are rejected

---

### 2.2 Wallet & Top-Up

| # | Feature | Endpoint | Method | Auth | Status |
|---|---------|----------|--------|------|--------|
| 5 | Get Balance | `/api/v1/wallet/balance` | GET | 🔒 JWT | ✅ Done |
| 6 | Top-Up | `/api/v1/wallet/topup` | POST | 🔒 JWT | ✅ Done |
| 7 | Transaction History | `/api/v1/wallet/transactions` | GET | 🔒 JWT | ✅ Done |

**Engineering Details:**
- Balance stored as `BIGINT` (integer rupiah — `Rp 50.000` stored as `50000`, no floating point)
- Top-up enforces `balance + amount <= max_balance_limit` (tier-based ceiling)
- ACID transaction: balance update + transaction record in single `BEGIN...COMMIT`
- Idempotency via `idempotency_key` unique constraint on `transactions` table
- Transaction history supports pagination (`limit` and `offset` query params)

**Acceptance Criteria:**
- Top-up of 0 or negative amount returns `400 Bad Request`
- Top-up exceeding tier limit returns `400 Bad Request` with clear message
- Duplicate `idempotency_key` returns the original transaction (no double-charge)

---

### 2.3 KYC Verification & Tier Upgrade

| # | Feature | Endpoint | Method | Auth | Status |
|---|---------|----------|--------|------|--------|
| 8 | Submit KYC | `/api/v1/auth/kyc` | POST | 🔒 JWT | ✅ Done |
| 9 | Get KYC Status | `/api/v1/auth/kyc/status` | GET | 🔒 JWT | ✅ Done |
| 10 | Review KYC | `/api/v1/auth/kyc/review` | POST | 🔒 JWT | ✅ Done |

**Engineering Details:**
- KYC submission validates NIK length (exactly 16 digits)
- Prevents duplicate submissions (rejects if user has existing `pending` or `approved` record)
- Only Tier 1 users can submit KYC (Tier 2 users are already verified)
- Approval executes a **3-table ACID transaction** atomically:
  1. `kyc_verifications.status` → `approved`, `verified_at` → `NOW()`
  2. `users.tier` → `tier_2`, `users.is_verified` → `true`
  3. `wallets.max_balance_limit` → `10,000,000`
- Rejection records the reason and timestamp
- Only `pending` applications can be reviewed

**Acceptance Criteria:**
- Tier 2 user submitting KYC returns `400 Bad Request`
- NIK not 16 digits returns `400 Bad Request`
- Duplicate pending submission returns `400 Bad Request`
- Review with invalid status (not `approved` or `rejected`) returns `400 Bad Request`

---

### 2.4 P2P Transfer Engine (Sprint 1.4 — Next)

| # | Feature | Endpoint | Method | Auth | Status |
|---|---------|----------|--------|------|--------|
| 11 | P2P Transfer | `/api/v1/wallet/transfer` | POST | 🔒 JWT | ⏳ Next |

**Engineering Details:**
- **Tier Gate:** Only Tier 2 (KYC Verified) users can initiate outgoing transfers
- **Self-Transfer Prevention:** Sender cannot transfer to their own wallet
- **Race Condition Protection:** `SELECT ... FOR UPDATE` row-level locking on both wallets
- **Deadlock Prevention:** Lock wallet rows in ascending UUID order
- **Balance Check:** Sender must have sufficient balance (`sender.balance >= amount`)
- **Receiver Limit Check:** `receiver.balance + amount <= receiver.max_balance_limit`
- **Idempotency:** Redis key `idempotency:{key}` with 24h TTL prevents duplicate transfers
- **Double-Entry Bookkeeping:** 1 transaction record + 2 ledger entries (debit for sender + credit for receiver)

**Acceptance Criteria:**
- Tier 1 user attempting transfer returns `403 Forbidden`
- Self-transfer returns `400 Bad Request`
- Insufficient balance returns `400 Bad Request`
- Receiver limit exceeded returns `400 Bad Request`
- Receiver email not found returns `404 Not Found`
- Retry with same `idempotency_key` returns cached response without double-charging
- Two simultaneous transfers from the same wallet are serialized (no double-spending)

---

## 3. Architecture

### 3.1 Clean Architecture Layers

```
┌─────────────────────────────────────────────────┐
│         Handler / Transport (Gin HTTP)          │  ← Receives HTTP request, returns JSON
├─────────────────────────────────────────────────┤
│         Service / Business Logic                │  ← Business rules, validations, orchestration
├─────────────────────────────────────────────────┤
│         Repository / Data Access                │  ← SQL queries, database transactions
├─────────────────────────────────────────────────┤
│         Domain / Entities & DTOs                │  ← Structs, types, API contracts
└─────────────────────────────────────────────────┘
```

**Key Rules:**
- Dependencies flow inward: Handler → Service → Repository
- Repository is accessed via **Go interfaces** for testability and loose coupling
- Handler has **no interface** (it is the outermost gateway, called only by Gin's router)
- DTOs are value types for API responses; Entities are pointer types for database rows

### 3.2 Project Structure

```
services/auth/
├── cmd/
│   └── main.go                    # Entry point, DI wiring, route registration
├── internal/
│   ├── config/
│   │   └── config.go              # Environment variable loader
│   ├── domain/
│   │   ├── user.go                # User, Wallet, WalletBalanceResponse
│   │   ├── transaction.go         # Transaction, TopUpRequest, TransferRequest
│   │   └── kyc.go                 # KYCVerification, SubmitKYCRequest, ReviewKYCRequest
│   ├── handler/
│   │   ├── auth_handler.go        # Register, Login, Profile, Logout
│   │   ├── wallet_handler.go      # GetBalance, TopUp, GetTransaction
│   │   └── kyc_handler.go         # SubmitKYC, GetKYCStatus, ReviewKYC
│   ├── middleware/
│   │   └── auth_middleware.go     # JWT validation, Redis blacklist check
│   ├── repository/
│   │   ├── user_repository.go     # User CRUD + wallet auto-creation
│   │   ├── wallet_repository.go   # Balance queries, top-up, transaction history
│   │   └── kyc_repository.go      # KYC CRUD + multi-table approval transaction
│   └── service/
│       ├── auth_service.go        # Auth logic, JWT generation, token validation
│       ├── wallet_service.go      # Balance checks, tier limit enforcement
│       └── kyc_service.go         # KYC submission rules, review orchestration
```

### 3.3 Technology Stack

| Technology | Purpose | Why Chosen |
|---|---|---|
| **Go 1.21+** | Primary backend language | Goroutines for concurrency, compiled binary for Docker, strong typing for financial safety |
| **Gin** | HTTP router & middleware | Lightweight, built-in validation tags, middleware chaining |
| **PostgreSQL 16** | Primary relational database | ACID compliance, row-level locking (`SELECT FOR UPDATE`), CHECK constraints |
| **Redis 7** | In-memory cache | Sub-millisecond JWT blacklist lookups, idempotency key storage with TTL |
| **pgxpool** | PostgreSQL driver | Native Go driver, connection pooling, prepared statements, no ORM overhead |
| **bcrypt** | Password hashing | Industry-standard one-way hash with configurable cost factor |
| **golang-jwt** | JWT token library | Token generation, signing, and validation |
| **Docker Compose** | Local infrastructure | Single command to start PostgreSQL + Redis |

---

## 4. API Response Contract

All endpoints follow a standardized JSON envelope format:

### Success Response
```json
{
  "status": "success",
  "message": "description of what happened",
  "data": { ... }
}
```

### Error Response
```json
{
  "status": "error",
  "error": "human-readable error message"
}
```

### HTTP Status Code Usage

| Code | Meaning | When Used |
|------|---------|-----------|
| `200 OK` | Request succeeded | Balance check, KYC status, transaction history, review |
| `201 Created` | Resource created | Registration, KYC submission |
| `400 Bad Request` | Validation or business rule failure | Invalid input, tier limit exceeded, duplicate submission |
| `401 Unauthorized` | Missing or invalid authentication | No JWT, expired JWT, blacklisted JWT |
| `403 Forbidden` | Authenticated but not authorized | Tier 1 user attempting P2P transfer |
| `404 Not Found` | Resource does not exist | KYC record not found, receiver email not found |
| `409 Conflict` | Duplicate resource | Email already registered |

---

## 5. Engineering Challenges

Each simple product feature introduces real backend engineering problems:

### 5.1 Authentication Challenges

| Challenge | Problem | Solution |
|-----------|---------|----------|
| Password Security | Plaintext passwords are catastrophic | bcrypt with cost factor 12 |
| Session Scalability | Server-side sessions don't scale across instances | Stateless JWT tokens |
| Token Revocation | JWT tokens can't be natively invalidated | Redis blacklist with TTL |

### 5.2 Wallet & Top-Up Challenges

| Challenge | Problem | Solution |
|-----------|---------|----------|
| Balance Overflow | Top-up must not exceed tier limit | Application check + DB CHECK constraint |
| Duplicate Top-Up | Client retry must not double-charge | Idempotency key (unique constraint) |
| Atomicity | Balance update + transaction record must succeed together | Single PostgreSQL transaction |

### 5.3 KYC Challenges

| Challenge | Problem | Solution |
|-----------|---------|----------|
| Multi-Table Atomicity | Approving KYC must update 3 tables at once | `BEGIN...COMMIT` wrapping 3 UPDATE queries |
| Duplicate Submissions | User must not submit while pending | Check existing record status in Service layer |
| Partial Failure | If wallet update fails after user update | `defer tx.Rollback(ctx)` ensures all-or-nothing |

### 5.4 P2P Transfer Challenges (Sprint 1.4)

| Challenge | Problem | Solution |
|-----------|---------|----------|
| Double-Spending | Two simultaneous transfers from the same wallet | `SELECT ... FOR UPDATE` row-level lock |
| Deadlock | User A sends to B while B sends to A simultaneously | Lock wallets in ascending UUID order |
| Receiver Overflow | Transfer must not push receiver over tier limit | Check `receiver.balance + amount <= max_balance_limit` |
| Idempotency | Network retry must not double-transfer | Redis idempotency key with 24h TTL |
| Authorization | Only verified users can send money | Tier gate check in Service layer |

---

## 6. Current Progress

```
Level 1 — Foundation (Go Clean Architecture)
  Sprint 1.1 — Infrastructure & Auth Service (JWT + Redis)     [COMPLETED] ✅
  Sprint 1.2 — Wallet & Basic Top-Up Engine                    [COMPLETED] ✅
  Sprint 1.3 — KYC Verification & Tier 2 Upgrade Engine        [COMPLETED] ✅
  Sprint 1.4 — P2P Transfer & Atomic Concurrency Locking       [NEXT] ⏳

Level 2 — Correctness & Financial Integrity                    [ ]
  Sprint 2.1 — Redis Idempotency for Transfers
  Sprint 2.2 — Audit Logging (IP, User-Agent, Action Type)
  Sprint 2.3 — Stress Testing & Race Condition Validation
```

---

## 7. References

- **API Contract:** See [openapi.yml](file:///c:/Projects/bastion/openapi.yml) for complete Swagger/OpenAPI specification
- **Database Schema:** See [database.md](file:///c:/Projects/bastion/docs/database.md) for full SQL DDL and ERD
- **Architecture Decisions:** See [decisions/](file:///c:/Projects/bastion/docs/decisions/) for ADRs
- **Level Roadmap:** See [levels/overview.md](file:///c:/Projects/bastion/docs/levels/overview.md) for progression plan
