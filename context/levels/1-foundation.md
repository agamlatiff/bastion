# Level 1 — Foundation

> **Goal**: Build a working backend with authentication, wallet, and basic transactions
> **Technologies**: Go, Gin, PostgreSQL, Redis, Docker
> **Observability introduced**: Structured logging (`log/slog`)

---

## Sprint 1.1 — Infrastructure & Auth Service

**Goal**: A user can register, login, view profile, and logout via REST API. Server runs on Docker with PostgreSQL and Redis.

In simple terms:
1. Set up Docker Compose (PostgreSQL + Redis)
2. Build user registration — signup creates account + wallet automatically
3. Build login — verify credentials, return JWT token
4. Build profile viewing — present token, see profile data
5. Build logout — token written to Redis blacklist

**Tasks**:
- [x] Docker Compose (`docker-compose.yml` — PostgreSQL 16 + Redis 7)
- [x] Environment config (`services/auth/internal/config/config.go`)
- [x] SQL migration (`infra/postgres/migrations/001_init.sql` — `users` + `wallets`)
- [x] Domain models & DTOs (`services/auth/internal/domain/user.go`)
- [x] User repository (`services/auth/internal/repository/user_repository.go`)
- [x] Auth service (`services/auth/internal/service/auth_service.go`)
- [x] Auth handler (`services/auth/internal/handler/auth_handler.go`)
- [/] Server entry point (`services/auth/cmd/main.go`)
- [ ] JWT middleware (`services/auth/internal/middleware/auth_middleware.go`)
- [ ] Live API testing (Postman / curl)

---

## Sprint 1.2 — Wallet & Basic Transactions

**Goal**: A user can view wallet balance, receive a simulated top-up, and see transaction history.

In simple terms:
1. Build wallet balance endpoint — show current balance and tier limits
2. Build simulated top-up — bank callback adds money to wallet
3. Build transaction recording — every top-up creates a transaction + ledger entries
4. Build transaction history — paginated list of past transactions
5. Build transaction detail — single transaction with debit/credit entries

**Tasks**:
- [ ] Wallet handler & service (GET balance, top-up callback)
- [ ] Transaction repository (create, list, get by ID)
- [ ] Ledger entry repository (create paired entries)
- [ ] SQL migration update (add `transactions` + `ledger_entries` tables)
- [ ] Wire new routes in `main.go`
- [ ] Live API testing

---

## Sprint 1.3 — KYC & Profile Enhancement

**Goal**: A user can submit KYC to upgrade from Tier 1 to Tier 2, unlocking P2P transfer capability.

In simple terms:
1. Build KYC submission — user submits ID card details
2. Build KYC approval — admin endpoint upgrades tier
3. Update profile endpoint to show KYC status and tier limits

**Tasks**:
- [ ] KYC handler & service
- [ ] KYC repository
- [ ] SQL migration update (add `kyc_verifications` table)
- [ ] Update profile endpoint to include tier info
- [ ] Live API testing

---

## Acceptance Criteria (Level 1 Complete)

- [ ] User can register and receives JWT token + wallet with 0 IDR balance
- [ ] User can login with email/password
- [ ] User can view profile with tier status
- [ ] User can logout (token blacklisted)
- [ ] User can view wallet balance
- [ ] User can receive simulated top-up (balance increases)
- [ ] User can view transaction history (paginated)
- [ ] User can view transaction detail with ledger entries
- [ ] User can submit KYC and be upgraded to Tier 2
- [ ] All endpoints return proper HTTP status codes and error messages
