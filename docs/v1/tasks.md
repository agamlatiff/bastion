# Bastion — Task Tracker

> **Convention:** `[x]` completed, `[/]` in progress, `[ ]` not started

---

## Level 1 — Foundation (Go / Gin / Clean Architecture)

### Sprint 1.1 — Infrastructure & Auth Service ✅

- [x] Docker Compose setup (PostgreSQL 16 + Redis 7)
- [x] Go module initialization (`go mod init`)
- [x] Environment config loader (`internal/config/config.go`)
- [x] PostgreSQL connection pool (`pgxpool`)
- [x] Redis client connection (`go-redis/v9`)
- [x] Database migration: `users` table
- [x] Database migration: `wallets` table
- [x] Domain layer:
  - [x] `domain/user.go` — User entity, Wallet entity, WalletBalanceResponse DTO
- [x] Repository layer:
  - [x] `UserRepository` interface + implementation
  - [x] `Create` — Insert user + auto-create Tier 1 wallet (ACID transaction)
  - [x] `FindByEmail` — Lookup user by email
  - [x] `FindByID` — Lookup user by UUID
- [x] Service layer:
  - [x] `AuthService` interface + implementation
  - [x] `Register` — Hash password, create user, generate JWT
  - [x] `Login` — Verify credentials, generate JWT
  - [x] `ValidateToken` — Parse JWT, check Redis blacklist, return user
  - [x] `Logout` — Add token to Redis blacklist with TTL
- [x] Handler layer:
  - [x] `AuthHandler.Register` — POST `/api/v1/auth/register`
  - [x] `AuthHandler.Login` — POST `/api/v1/auth/login`
  - [x] `AuthHandler.GetProfile` — GET `/api/v1/auth/profile`
  - [x] `AuthHandler.Logout` — POST `/api/v1/auth/logout`
- [x] Middleware:
  - [x] `AuthMiddleware` — JWT extraction, validation, Redis blacklist check
- [x] Route registration in `main.go` (public + protected groups)
- [x] Postman verification: all 4 auth endpoints working

---

### Sprint 1.2 — Wallet & Basic Top-Up Engine ✅

- [x] Database migration: `transactions` table
- [x] Domain layer:
  - [x] `domain/transaction.go` — Transaction entity, TopUpRequest DTO
- [x] Repository layer:
  - [x] `WalletRepository` interface + implementation
  - [x] `FindByUserID` — Get wallet by user ID
  - [x] `TopUp` — ACID transaction (update balance + insert transaction record)
  - [x] `GetTransactionHistory` — Paginated query with `LIMIT` / `OFFSET`
- [x] Service layer:
  - [x] `WalletService` interface + implementation
  - [x] `GetBalance` — Return wallet balance response DTO
  - [x] `TopUp` — Validate amount > 0, enforce tier limit, call repository
  - [x] `GetTransactionHistory` — Pass-through with pagination params
- [x] Handler layer:
  - [x] `WalletHandler.GetBalance` — GET `/api/v1/wallet/balance`
  - [x] `WalletHandler.TopUp` — POST `/api/v1/wallet/topup`
  - [x] `WalletHandler.GetTransaction` — GET `/api/v1/wallet/transactions`
- [x] Route registration in `main.go` (wallet protected group)
- [x] Postman verification: all 3 wallet endpoints working

---

### Sprint 1.3 — KYC Verification & Tier 2 Upgrade Engine ✅

- [x] Database migration: `kyc_verifications` table
- [x] Domain layer:
  - [x] `domain/kyc.go` — KYCVerification entity, SubmitKYCRequest DTO, ReviewKYCRequest DTO
  - [x] Nullable fields use pointer types with `omitempty` (`*string`, `*time.Time`)
- [x] Repository layer:
  - [x] `KYCRepository` interface + implementation
  - [x] `Create` — Insert KYC record with `RETURNING id, status, submitted_at`
  - [x] `FindByUserID` — Lookup KYC by user ID
  - [x] `FindByID` — Lookup KYC by KYC ID
  - [x] `ApproveKYC` — 3-table ACID transaction:
    - [x] UPDATE `kyc_verifications` → status `approved`
    - [x] UPDATE `users` → tier `tier_2`, is_verified `true`
    - [x] UPDATE `wallets` → max_balance_limit `10,000,000`
    - [x] `defer tx.Rollback(ctx)` for all-or-nothing safety
  - [x] `RejectKYC` — Update status to `rejected` with reason
- [x] Service layer:
  - [x] `KYCService` interface + implementation
  - [x] `SubmitKYC` — Validate tier, NIK length (16 digits), check existing pending/approved
  - [x] `GetKYCStatus` — Return KYC record by user ID
  - [x] `ReviewKYC` — Validate pending status, dispatch to approve or reject, return updated record
- [x] Handler layer:
  - [x] `KYCHandler.SubmitKYC` — POST `/api/v1/auth/kyc`
  - [x] `KYCHandler.GetKYCStatus` — GET `/api/v1/auth/kyc/status`
  - [x] `KYCHandler.ReviewKYC` — POST `/api/v1/auth/kyc/review`
- [x] Route registration in `main.go` (kyc protected group)
- [x] Standardized JSON response envelope (`status`, `message`, `data`, `error`) across all handlers
- [x] Postman verification: all 3 KYC endpoints working
- [x] Full Tier 1 → Tier 2 upgrade flow verified end-to-end

---

### Sprint 1.4 — P2P Transfer & Atomic Concurrency Locking ✅

- [x] Domain layer:
  - [x] `TransferRequest` DTO — `receiver_email`, `amount`, `idempotency_key`, `description`
  - [x] `LedgerEntry` entity — `transaction_id`, `wallet_id`, `entry_type`, `amount`, `balance_after`
- [x] Database migration: `ledger_entries` table
- [x] Repository layer:
  - [x] `UserRepository.FindByEmail` — (Sudah ada, digunakan Service untuk lookup penerima)
  - [x] `WalletRepository.ExecuteTransfer` — Full ACID transaction:
    - [x] `ORDER BY id ASC` (deadlock prevention)
    - [x] `SELECT ... FOR UPDATE` (row locking)
    - [x] Validate sender balance >= amount
    - [x] Validate receiver balance + amount <= max_balance_limit
    - [x] UPDATE sender balance (deduct)
    - [x] UPDATE receiver balance (credit)
    - [x] INSERT transaction record
    - [x] INSERT ledger entry (debit — sender)
    - [x] INSERT ledger entry (credit — receiver)
    - [x] `defer tx.Rollback(ctx)` for rollback safety
- [x] Service layer:
  - [x] `WalletService.Transfer` — Business rule orchestration:
    - [x] Inject `UserRepository` ke `WalletService` (untuk lookup email penerima)
    - [x] Tier gate: hanya user Tier 2 yang bisa melakukan transfer
    - [x] Self-transfer prevention (sender != receiver)
    - [x] Lookup dompet pengirim & penerima (via email)
    - [x] Call `walletRepo.ExecuteTransfer`
- [x] Handler layer:
  - [x] `WalletHandler.Transfer` — POST `/api/v1/wallet/transfer`
  - [x] Extract `currentUser` from middleware context
  - [x] Bind and validate `TransferRequest` JSON
  - [x] Return `200 OK` on success
- [x] Route registration & Dependency Injection di `main.go`
- [x] Postman verification:
  - [x] Successful P2P transfer between two users
  - [x] Tier 1 user blocked from sending
  - [x] Self-transfer blocked
  - [x] Insufficient balance blocked
  - [x] Receiver limit exceeded blocked

---

### Sprint 1.5 — Redis Idempotency for Transfers ✅

- [x] Implement Redis idempotency service
  - [x] Check `idempotency:{key}` in Redis before processing
  - [x] Cache successful response with 24h TTL after processing
  - [x] Return cached response on duplicate key
- [x] Apply idempotency to `Transfer` endpoint
- [x] Apply idempotency to `TopUp` endpoint


### Sprint 1.6 — Audit Logging ✅

- [x] Database migration: `audit_logs` table
- [x] Domain layer: `AuditLog` entity
- [x] Repository layer: `AuditRepository.Create` & `FindByUserID`
- [x] Integrate audit logging into critical actions:
  - [x] Login (record IP, User-Agent, email)
  - [x] Transfer (record sender, receiver, amount, idempotency_key)
  - [x] KYC Submission (record user, id_card_number)
- [x] Endpoint & Handler: `GET /api/v1/auth/audit-logs`

### Sprint 1.7 — Stress Testing & Race Condition Validation ✅

- [x] Write concurrent transfer test (simulate 100 simultaneous requests)
- [x] Verify no double-spending under load
- [x] Verify deadlock prevention works (A→B and B→A simultaneously)
- [x] Verify idempotency under concurrent duplicate requests
- [x] Document test results and findings

---

## Documentation

- [x] `openapi.yml` — Complete OpenAPI 3.0 specification with response examples
- [x] `docs/prd.md` — Product Requirements Document
- [x] `docs/tech-spec.md` — Technical Specification
- [x] `docs/tasks.md` — Task Tracker (this file)
- [x] `docs/database.md` — Full SQL DDL & Visual ERD (Unified)
