# Sprint 1 Todo — Bastion: Foundation & Service Boundaries

Dokumen ini adalah checklist eksekusi bertahap untuk **Sprint 1: Foundation & Service Boundaries**.
Pengerjaan harus dilakukan **satu per satu secara sekuensial dari atas ke bawah** untuk memastikan baseline stabil sebelum melangkah ke service berikutnya.

---

## Phase 0 — Prepare

* [x] Buat branch `feat/sprint-1-foundation`
* [x] Pastikan current branch bersih (`git status` clean)
* [x] Jalankan existing test (`make test` PASS)
* [x] Jalankan existing application (Review startup & dependencies)
* [x] Catat endpoint yang masih existing (18 endpoint)
* [x] Catat migration yang sudah ada (10 file SQL)
* [x] Catat environment variables yang sudah ada (14 variables)
* [x] Buat folder `docs/`
* [x] Buat `docs/architecture/`
* [x] Buat `docs/adr/`

> **Definition of Done Phase 0:** Selesai. Baseline repo tercatat lengkap sebelum refactor dimulai.

---

## Phase 1 — Monorepo Structure

### 1. Buat directory service
* [x] `services/gateway`
* [x] `services/identity`
* [x] `services/customer`
* [x] `services/kyc`
* [x] `services/wallet`
* [x] `services/transaction`
* [x] `services/ledger`

### 2. Buat directory contract
* [x] `contracts/openapi`
* [x] `contracts/proto`
* [x] `contracts/events`

### 3. Buat infrastructure
* [x] `infrastructure/postgres`
* [x] `infrastructure/redis`
* [x] `infrastructure/kafka`
* [x] `infrastructure/docker`

### 4. Buat documentation
* [x] `docs/prd`
* [x] `docs/architecture`
* [x] `docs/adr`

> **Definition of Done Phase 1:** Selesai. Struktur folder monorepo telah terpasang rapi sesuai target arsitektur.

---

## Phase 2 — Local Infrastructure

### PostgreSQL
* [x] Buat PostgreSQL Docker container
* [x] Buat database `identity_db`
* [x] Buat database `customer_db`
* [x] Buat database `kyc_db`
* [x] Buat database `wallet_db`
* [x] Buat database `transaction_db`
* [x] Buat database `ledger_db`
* [x] Buat user/password dari environment variable
* [x] Test koneksi dari host
* [x] Test koneksi dari container

### Redis
* [x] Tambahkan Redis ke Docker Compose
* [x] Test connection
* [x] Tambahkan healthcheck

### Kafka / Redpanda
* [x] Tambahkan Kafka / Redpanda
* [x] Pastikan container hidup
* [x] Buat topic event standar:
  * [x] `bastion.identity.events`
  * [x] `bastion.customer.events`
  * [x] `bastion.wallet.events`
  * [x] `bastion.transaction.events`
  * [x] `bastion.ledger.events`

### Test Local Infrastructure
* [x] `docker compose up` berjalan tanpa error
* [x] PostgreSQL healthy
* [x] Redis healthy
* [x] Kafka healthy

> **Checkpoint 1:** Seluruh shared infrastructure lokal telah berjalan dan siap dihubungkan ke masing-masing service. Selesai pada Phase 2.

---

## Phase 3 — Configuration

* [x] Buat `.env.example`
* [x] Tambahkan `APP_ENV`
* [x] Tambahkan `APP_PORT`
* [x] Tambahkan `DATABASE_URL`
* [x] Tambahkan `REDIS_URL`
* [x] Tambahkan `KAFKA_BROKERS`
* [x] Tambahkan `JWT_SECRET`
* [x] Tambahkan `DATA_ENCRYPTION_KEY`
* [x] Pisahkan konfigurasi local / test / production
* [x] Hapus hardcoded production secret
* [x] Hapus fallback encryption key untuk production
* [x] Jadikan DB SSL configurable
* [x] Pastikan production gagal startup (*fail-fast*) jika secret wajib tidak ada

> **Definition of Done Phase 3:** Selesai. Manajemen konfigurasi independen dari secret yang tertanam di source code dan memiliki validasi fail-fast.

---

## Phase 4 — Gateway

### Bootstrap
* [x] Buat `services/gateway`
* [x] Setup Go module (`go.mod`)
* [x] Buat HTTP server
* [x] Buat config loader
* [x] Tambahkan graceful shutdown

### Middleware
* [x] Request ID
* [x] Logger
* [x] Recovery
* [x] Timeout
* [x] Body size limit
* [x] CORS
* [x] Security headers

### Request ID
* [x] Terima `X-Request-ID` dari caller
* [x] Validasi format UUID
* [x] Generate UUID jika header kosong
* [x] Propagasi ke downstream services

### Health Checks
* [x] Endpoint `GET /livez`
* [x] Endpoint `GET /readyz`

### Metrics
* [x] Tambahkan endpoint metrics
* [x] Pastikan `/metrics` diproteksi (tidak bebas diakses publik)

> **Checkpoint 2:**
> ```text
> GET /livez  → 200 OK (Verified)
> GET /readyz → 200 OK (Verified)
> ```
> Selesai pada Phase 4.

---

## Phase 5 — Identity Service (Go)

### Bootstrap
* [x] Buat `services/identity`
* [x] Setup Go module (`go.mod`)
* [x] Setup HTTP server & routing
* [x] Setup PostgreSQL connection (`identity_db`)
* [x] Setup database migration
* [x] Setup Redis connection (Rate limiting)
* [x] Setup test suite & health checks

### Database Migration
Buat skrip migrasi database (`identity_db`):
* [x] `users`
* [x] `sessions`
* [x] `roles`
* [x] `user_roles`
* [x] `security_audits`

### User Management
* [x] UUID user ID
* [x] Normalize email (`LOWER(email)`)
* [x] Unique email constraint & index
* [x] Password hashing (Argon2id)
* [x] User status validation

### Register (`POST /v1/auth/register`)
* [x] Request validation
* [x] Email normalization
* [x] Duplicate email handling (409 Conflict)
* [x] Password hashing
* [x] Create user
* [x] Return user ID

### Login (`POST /v1/auth/login`)
* [x] Find user
* [x] Verify password
* [x] Generate access token
* [x] Generate refresh token
* [x] Store refresh token hash di DB
* [x] Return token pair

### JWT Implementation
* [x] Validate signature
* [x] Validate algorithm
* [x] Validate expiration (`exp`)
* [x] Validate issued at (`iat`)
* [x] Validate token identifier (`jti`)
* [x] Validate token type

### Refresh (`POST /v1/auth/refresh`)
* [x] Validate refresh token
* [x] Detect revoked token
* [x] Rotate refresh token
* [x] Revoke old session / token
* [x] Issue new access token

### Logout (`POST /v1/auth/logout`)
* [x] Revoke session
* [x] Reject subsequent refresh attempts

### Rate Limiting
* [x] Register rate limit (Redis)
* [x] Login rate limit (Redis)
* [x] Refresh rate limit (Redis)

### Tests
* [x] Register success
* [x] Duplicate email rejected
* [x] Wrong password rejected
* [x] Login success
* [x] Expired token rejected
* [x] Invalid token rejected
* [x] Refresh success
* [x] Refresh token reuse detection & revocation
* [x] Logout invalidates token

> **Checkpoint 3:**
> ```text
> register → login → access token → refresh → logout (Verified)
> ```
> Selesai pada Phase 5.

---

## Phase 6 — Customer Service (Java / Spring Boot)

### Bootstrap
* [x] Buat `services/customer`
* [x] Setup Spring Boot
* [x] PostgreSQL connection
* [x] Flyway migration
* [x] REST API controllers

### Database
* [x] Create `customers` table
* [x] Create `customer_metadata` table
* [x] Unique index on `identity_user_id`

### Event Definition
* [x] Define event `UserRegistered`:
  * [x] Envelope
  * [x] Event version
  * [x] Event ID
  * [x] Correlation ID

### Consumer
* [x] Customer consume `UserRegistered`
* [x] Create customer record
* [x] Handle duplicate event idempotently (no duplicate customer)

### API Endpoints
* [x] `GET /v1/customers/me`
* [x] `PATCH /v1/customers/me`

### Authorization
* [x] User hanya bisa membaca customer profil miliknya
* [x] User hanya bisa mengupdate customer profil miliknya

### Tests
* [x] `UserRegistered` → customer created
* [x] Duplicate event → no duplicate customer
* [x] `GET /v1/customers/me`
* [x] `PATCH /v1/customers/me`
* [x] Unauthorized access rejected (403/401)

> **Checkpoint 4:**
> ```text
> Register User → UserRegistered Event → Customer Created → GET /v1/customers/me (Verified)
> ```

---

## Phase 7 — Wallet Service (Go)

### Bootstrap
* [x] Buat `services/wallet`
* [x] Setup Go module
* [x] PostgreSQL connection
* [x] Redis connection
* [x] Migration runner (golang-migrate)
* [x] HTTP server

### Database
* [x] Buat tabel `wallets`
* [x] Buat tabel `wallet_balance_snapshots`
* [x] Buat tabel `outbox_events`

### Wallet Rules & Constraints
* [x] Currency wajib 3-letter ISO 4217 code (`CHAR(3)`)
* [x] Balance menggunakan integer minor unit (`BIGINT`), tidak boleh float
* [x] Balance tidak boleh negatif (`balance >= 0`)
* [x] Max balance limit harus `>= 0`
* [x] Wallet status tervalidasi

### Wallet State Machine
```text
CREATING → ACTIVE → FROZEN → ACTIVE
             │         │
             ▼         ▼
          CLOSED    CLOSED
```
* [x] `CREATING` $\rightarrow$ `ACTIVE`
* [x] `ACTIVE` $\rightarrow$ `FROZEN`
* [x] `FROZEN` $\rightarrow$ `ACTIVE`
* [x] `ACTIVE` $\rightarrow$ `CLOSED`
* [x] `FROZEN` $\rightarrow$ `CLOSED`
* [x] `CLOSED` adalah terminal state (tidak bisa diaktifkan kembali)

### API Endpoints
* [x] `POST /v1/wallets`
  * Validate currency
  * Validate customer
  * Prevent duplicate active wallet per currency
  * Create wallet (Initial status: `CREATING`, balance: `0`)
* [x] `GET /v1/wallets/{wallet_id}` (Ownership check & authorization)
* [x] `GET /v1/wallets/{wallet_id}/balance` (Return integer amount & currency, no Redis-as-authority)
* [x] `POST /v1/wallets/{wallet_id}/freeze`
* [x] `POST /v1/wallets/{wallet_id}/unfreeze`

### Tests
* [x] Create wallet
* [x] Duplicate wallet rejected
* [x] Get wallet detail
* [x] Get wallet balance
* [x] Freeze wallet
* [x] Unfreeze wallet
* [x] Mutation on closed wallet rejected
* [x] Unauthorized wallet access rejected

---

## Phase 8 — Ledger Foundation (Go)

> **Catatan:** Tahap ini **belum** mencakup transfer atau top-up, melainkan fondasi akun akuntansi.

### Bootstrap
* [x] Buat `services/ledger`
* [x] Setup Go module
* [x] PostgreSQL connection
* [x] Migration runner
* [x] Internal HTTP / gRPC API

### Database
* [x] Buat tabel `ledger_accounts`
* [x] Buat tabel `account_balances`
* [x] Buat tabel `ledger_transactions`
* [x] Buat tabel `ledger_entries`

### Account Management
Implement `POST /internal/v1/ledger/accounts`:
* [x] Create account
* [x] Account ID (UUID)
* [x] Account code unique (e.g. `CUSTOMER_WALLET_<wallet_id>_<currency>`)
* [x] Currency (`CHAR(3)`)
* [x] Owner type & Owner ID
* [x] Account status

### Wallet $\leftrightarrow$ Ledger Handshake
```text
Create Wallet (CREATING)
         │
         ▼
Create Ledger Account
         │
         ├── Sukses ──► Wallet berubah ACTIVE
         └── Gagal  ──► Wallet tetap CREATING (atau FAILED)
```
* [x] Wallet berstatus `CREATING` saat request masuk
* [x] Wallet meminta Ledger membuat account secara synchronous
* [x] Jika Ledger account berhasil dibuat $\rightarrow$ Wallet update status menjadi `ACTIVE`
* [x] Jika Ledger gagal $\rightarrow$ Wallet tidak pernah menjadi `ACTIVE`

---

## Phase 9 — Transactional Outbox & Event Ingestion

### Wallet Outbox
* [x] Tabel `outbox_events` di Wallet DB
* [x] Insert event dalam satu DB transaction dengan mutasi wallet
* [x] Outbox background publisher membaca record belum terbit
* [x] Publish ke Kafka broker
* [x] Tandai `published_at` setelah ACK diterima

### Event Schema
```json
{
  "event_id": "uuid",
  "event_type": "WalletCreated",
  "event_version": 1,
  "aggregate_id": "uuid",
  "occurred_at": "2026-09-04T10:00:00Z",
  "correlation_id": "uuid",
  "data": {}
}
```
* [x] Implement `WalletCreated`
* [x] Implement `WalletFrozen`
* [x] Implement `WalletUnfrozen`

### Idempotency Consumer
* [x] Buat tabel `processed_events`
* [x] Primary key `(consumer_name, event_id)`
* [x] Consumer memverifikasi record sebelum memproses event
* [x] Duplicate event tidak memicu duplicate side effect

---

## Phase 10 — Security Hardening

* [x] Password / secret tidak pernah tercetak di log
* [x] JWT / bearer token tidak bocor di log
* [x] Refresh token hash tidak bocor di log
* [x] Encryption key & database password tidak tercatat di log
* [x] PIN tidak pernah masuk log
* [x] Internal endpoint (Ledger / Internal APIs) tidak dapat diakses dari luar Gateway
* [x] Autentikasi service-to-service aktif (mTLS / Shared Internal Secret)
* [x] Validasi otorisasi user aktif di setiap service
* [x] CORS hanya mengizinkan domain allowlist
* [x] Production secret wajib diisi (tidak ada default fallback)

---

## Phase 11 — Observability & Tracing

### Logging
* [x] Structured JSON logging
* [x] Label `service`
* [x] Label `request_id`
* [x] Label `correlation_id`
* [x] Label `timestamp`
* [x] Label `level`

### Metrics
* [x] Request count & throughput
* [x] Request latency / duration histogram
* [x] Error rate & HTTP status code metrics
* [x] Database connection pool & error metrics
* [x] Redis connection & cache error metrics
* [x] Kafka consumer lag & publish error metrics

### Correlation Validation
* [x] Uji alur: `Gateway` $\rightarrow$ `Identity` $\rightarrow$ `Customer` $\rightarrow$ `Wallet` $\rightarrow$ `Ledger`
* [x] Pastikan `correlation_id` yang sama terbawa tanpa terputus di sepanjang call chain

---

## Phase 12 — Full E2E Verification (Final Boss Sprint 1)

Verifikasi end-to-end dari kondisi database kosong (*clean slate*):

1. **Register** (`POST /v1/auth/register`)
   * [x] User baru berhasil dibuat di `identity_db`
2. **Login** (`POST /v1/auth/login`)
   * [x] Access token & refresh token diterima
3. **Customer Profile** (`GET /v1/customers/me`)
   * [x] Customer otomatis terbentuk dari event `UserRegistered`
4. **Create Wallet** (`POST /v1/wallets`)
   * [x] Wallet masuk status `CREATING`
   * [x] Ledger account terbentuk di `ledger_db`
   * [x] Wallet terupdate menjadi `ACTIVE`
5. **Get Wallet** (`GET /v1/wallets/{id}`)
   * [x] Status `ACTIVE`, balance `0`, currency `IDR`
6. **Check Balance** (`GET /v1/wallets/{id}/balance`)
   * [x] Return `0 IDR`
7. **Freeze Wallet** (`POST /v1/wallets/{id}/freeze`)
   * [x] Status berubah menjadi `FROZEN`
8. **Unfreeze Wallet** (`POST /v1/wallets/{id}/unfreeze`)
   * [x] Status berubah kembali menjadi `ACTIVE`
9. **Token Refresh** (`POST /v1/auth/refresh`)
   * [x] Token baru diterbitkan, refresh token lama ditolak
10. **Logout** (`POST /v1/auth/logout`)
    * [x] Sesi direvoke, refresh token lama tidak lagi valid

---

## Final Sprint 1 Checklist

Sebelum menyatakan **Sprint 1 DONE**, seluruh item berikut wajib tercentang:

* [x] Monorepo structure
* [x] Docker Compose
* [x] PostgreSQL databases
* [x] Redis
* [x] Kafka / Redpanda
* [x] Environment configuration
* [x] Gateway
* [x] Liveness / readiness
* [x] Identity
* [x] Register
* [x] Login
* [x] Refresh rotation
* [x] Logout
* [x] Customer
* [x] UserRegistered event
* [x] Wallet
* [x] Wallet lifecycle
* [x] Ledger account
* [x] Wallet $\leftrightarrow$ Ledger integration
* [x] Outbox pattern
* [x] Idempotent consumer
* [x] Service authentication
* [x] Structured logging
* [x] Metrics
* [x] Unit tests
* [x] Integration tests
* [x] E2E test
* [x] README
* [x] Architecture docs

---

## Urutan Pengerjaan Rekomendasi

```text
01  Repo Setup
 ↓
02  Docker & Infra
 ↓
03  Config & Secrets
 ↓
04  API Gateway
 ↓
05  Identity Service
 ↓
06  Customer Service
 ↓
07  Wallet Service
 ↓
08  Ledger Account Foundation
 ↓
09  Wallet ↔ Ledger Handshake
 ↓
10  Kafka + Outbox Pattern
 ↓
11  Security Hardening
 ↓
12  Observability
 ↓
13  Full E2E Verification
 ↓
🚀 SPRINT 1 DONE
```
