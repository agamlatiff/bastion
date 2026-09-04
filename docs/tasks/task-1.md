# Sprint 1 Todo — Bastion: Foundation & Service Boundaries

Dokumen ini adalah checklist eksekusi bertahap untuk **Sprint 1: Foundation & Service Boundaries**.
Pengerjaan harus dilakukan **satu per satu secara sekuensial dari atas ke bawah** untuk memastikan baseline stabil sebelum melangkah ke service berikutnya.

---

## Phase 0 — Prepare

* [ ] Buat branch `feat/sprint-1-foundation`
* [ ] Pastikan current branch bersih (`git status` clean)
* [ ] Jalankan existing test
* [ ] Jalankan existing application
* [ ] Catat endpoint yang masih existing
* [ ] Catat migration yang sudah ada
* [ ] Catat environment variables yang sudah ada
* [ ] Buat folder `docs/`
* [ ] Buat `docs/architecture/`
* [ ] Buat `docs/adr/`

> **Definition of Done Phase 0:** Kita mengetahui persis baseline dan status repo sebelum proses refactoring dimulai.

---

## Phase 1 — Monorepo Structure

### 1. Buat directory service
* [ ] `services/gateway`
* [ ] `services/identity`
* [ ] `services/customer`
* [ ] `services/kyc`
* [ ] `services/wallet`
* [ ] `services/transaction`
* [ ] `services/ledger`

### 2. Buat directory contract
* [ ] `contracts/openapi`
* [ ] `contracts/proto`
* [ ] `contracts/events`

### 3. Buat infrastructure
* [ ] `infrastructure/postgres`
* [ ] `infrastructure/redis`
* [ ] `infrastructure/kafka`
* [ ] `infrastructure/docker`

### 4. Buat documentation
* [ ] `docs/prd`
* [ ] `docs/architecture`
* [ ] `docs/adr`

> **Definition of Done Phase 1:** Struktur folder monorepo telah terpasang rapi sesuai target arsitektur.

---

## Phase 2 — Local Infrastructure

### PostgreSQL
* [ ] Buat PostgreSQL Docker container
* [ ] Buat database `identity_db`
* [ ] Buat database `customer_db`
* [ ] Buat database `kyc_db`
* [ ] Buat database `wallet_db`
* [ ] Buat database `transaction_db`
* [ ] Buat database `ledger_db`
* [ ] Buat user/password dari environment variable
* [ ] Test koneksi dari host
* [ ] Test koneksi dari container

### Redis
* [ ] Tambahkan Redis ke Docker Compose
* [ ] Test connection
* [ ] Tambahkan healthcheck

### Kafka / Redpanda
* [ ] Tambahkan Kafka / Redpanda
* [ ] Pastikan container hidup
* [ ] Buat topic event standar:
  * [ ] `bastion.identity.events`
  * [ ] `bastion.customer.events`
  * [ ] `bastion.wallet.events`
  * [ ] `bastion.transaction.events`
  * [ ] `bastion.ledger.events`

### Test Local Infrastructure
* [ ] `docker compose up` berjalan tanpa error
* [ ] PostgreSQL healthy
* [ ] Redis healthy
* [ ] Kafka healthy

> **Checkpoint 1:** Seluruh shared infrastructure lokal telah berjalan dan siap dihubungkan ke masing-masing service.

---

## Phase 3 — Configuration

* [ ] Buat `.env.example`
* [ ] Tambahkan `APP_ENV`
* [ ] Tambahkan `APP_PORT`
* [ ] Tambahkan `DATABASE_URL`
* [ ] Tambahkan `REDIS_URL`
* [ ] Tambahkan `KAFKA_BROKERS`
* [ ] Tambahkan `JWT_SECRET`
* [ ] Tambahkan `DATA_ENCRYPTION_KEY`
* [ ] Pisahkan konfigurasi local / test / production
* [ ] Hapus hardcoded production secret
* [ ] Hapus fallback encryption key untuk production
* [ ] Jadikan DB SSL configurable
* [ ] Pastikan production gagal startup (*fail-fast*) jika secret wajib tidak ada

> **Definition of Done Phase 3:** Manajemen konfigurasi independen dari secret yang tertanam di source code.

---

## Phase 4 — Gateway

### Bootstrap
* [ ] Buat `services/gateway`
* [ ] Setup Go module (`go.mod`)
* [ ] Buat HTTP server
* [ ] Buat config loader
* [ ] Tambahkan graceful shutdown

### Middleware
* [ ] Request ID
* [ ] Logger
* [ ] Recovery
* [ ] Timeout
* [ ] Body size limit
* [ ] CORS
* [ ] Security headers

### Request ID
* [ ] Terima `X-Request-ID` dari caller
* [ ] Validasi format UUID
* [ ] Generate UUID jika header kosong
* [ ] Propagasi ke downstream services

### Health Checks
* [ ] Endpoint `GET /livez`
* [ ] Endpoint `GET /readyz`

### Metrics
* [ ] Tambahkan endpoint metrics
* [ ] Pastikan `/metrics` diproteksi (tidak bebas diakses publik)

> **Checkpoint 2:**
> ```text
> GET /livez  → 200 OK
> GET /readyz → 200 OK
> ```

---

## Phase 5 — Identity Service (Java / Spring Boot)

### Bootstrap
* [ ] Buat `services/identity`
* [ ] Setup Spring Boot
* [ ] Setup Spring Security
* [ ] Setup PostgreSQL connection
* [ ] Setup Flyway migration
* [ ] Setup Redis connection
* [ ] Setup test framework (JUnit 5 + Testcontainers)

### Database Migration
Buat skrip migrasi Flyway:
* [ ] `users`
* [ ] `sessions`
* [ ] `roles`
* [ ] `user_roles`
* [ ] `security_audits`

### User Management
* [ ] UUID user ID
* [ ] Normalize email (`LOWER(email)`)
* [ ] Unique email constraint & index
* [ ] Password hashing (BCrypt / Argon2id)
* [ ] User status validation

### Register (`POST /v1/auth/register`)
* [ ] Request validation
* [ ] Email normalization
* [ ] Duplicate email handling (409 Conflict)
* [ ] Password hashing
* [ ] Create user
* [ ] Return user ID

### Login (`POST /v1/auth/login`)
* [ ] Find user
* [ ] Verify password
* [ ] Generate access token
* [ ] Generate refresh token
* [ ] Store refresh token hash di DB/Redis
* [ ] Return token pair

### JWT Implementation
* [ ] Validate signature
* [ ] Validate algorithm
* [ ] Validate expiration (`exp`)
* [ ] Validate issued at (`iat`)
* [ ] Validate token identifier (`jti`)
* [ ] Validate token type

### Refresh (`POST /v1/auth/refresh`)
* [ ] Validate refresh token
* [ ] Detect revoked token
* [ ] Rotate refresh token
* [ ] Revoke old session / token
* [ ] Issue new access token

### Logout (`POST /v1/auth/logout`)
* [ ] Revoke session
* [ ] Reject subsequent refresh attempts

### Rate Limiting
* [ ] Register rate limit
* [ ] Login rate limit
* [ ] Refresh rate limit

### Tests
* [ ] Register success
* [ ] Duplicate email rejected
* [ ] Wrong password rejected
* [ ] Login success
* [ ] Expired token rejected
* [ ] Invalid token rejected
* [ ] Refresh success
* [ ] Refresh token reuse detection & revocation
* [ ] Logout invalidates token

> **Checkpoint 3:**
> ```text
> register → login → access token → refresh → logout
> ```

---

## Phase 6 — Customer Service (Java / Spring Boot)

### Bootstrap
* [ ] Buat `services/customer`
* [ ] Setup Spring Boot
* [ ] PostgreSQL connection
* [ ] Flyway migration
* [ ] REST API controllers

### Database
* [ ] Create `customers` table
* [ ] Create `customer_metadata` table
* [ ] Unique index on `identity_user_id`

### Event Definition
* [ ] Define event `UserRegistered`:
  * Envelope
  * Event version
  * Event ID
  * Correlation ID

### Consumer
* [ ] Customer consume `UserRegistered`
* [ ] Create customer record
* [ ] Handle duplicate event idempotently (no duplicate customer)

### API Endpoints
* [ ] `GET /v1/customers/me`
* [ ] `PATCH /v1/customers/me`

### Authorization
* [ ] User hanya bisa membaca customer profil miliknya
* [ ] User hanya bisa mengupdate customer profil miliknya

### Tests
* [ ] `UserRegistered` → customer created
* [ ] Duplicate event → no duplicate customer
* [ ] `GET /v1/customers/me`
* [ ] `PATCH /v1/customers/me`
* [ ] Unauthorized access rejected (403 Forbidden)

> **Checkpoint 4:**
> ```text
> Register User → UserRegistered Event → Customer Created → GET /v1/customers/me
> ```

---

## Phase 7 — Wallet Service (Go)

### Bootstrap
* [ ] Buat `services/wallet`
* [ ] Setup Go module
* [ ] PostgreSQL connection
* [ ] Redis connection
* [ ] Migration runner (golang-migrate)
* [ ] HTTP server

### Database
* [ ] Buat tabel `wallets`
* [ ] Buat tabel `wallet_balance_snapshots`
* [ ] Buat tabel `outbox_events`

### Wallet Rules & Constraints
* [ ] Currency wajib 3-letter ISO 4217 code (`CHAR(3)`)
* [ ] Balance menggunakan integer minor unit (`BIGINT`), tidak boleh float
* [ ] Balance tidak boleh negatif (`balance >= 0`)
* [ ] Max balance limit harus `>= 0`
* [ ] Wallet status tervalidasi

### Wallet State Machine
```text
CREATING → ACTIVE → FROZEN → ACTIVE
             │         │
             ▼         ▼
          CLOSED    CLOSED
```
* [ ] `CREATING` $\rightarrow$ `ACTIVE`
* [ ] `ACTIVE` $\rightarrow$ `FROZEN`
* [ ] `FROZEN` $\rightarrow$ `ACTIVE`
* [ ] `ACTIVE` $\rightarrow$ `CLOSED`
* [ ] `FROZEN` $\rightarrow$ `CLOSED`
* [ ] `CLOSED` adalah terminal state (tidak bisa diaktifkan kembali)

### API Endpoints
* [ ] `POST /v1/wallets`
  * Validate currency
  * Validate customer
  * Prevent duplicate active wallet per currency
  * Create wallet (Initial status: `CREATING`, balance: `0`)
* [ ] `GET /v1/wallets/{wallet_id}` (Ownership check & authorization)
* [ ] `GET /v1/wallets/{wallet_id}/balance` (Return integer amount & currency, no Redis-as-authority)
* [ ] `POST /v1/wallets/{wallet_id}/freeze`
* [ ] `POST /v1/wallets/{wallet_id}/unfreeze`

### Tests
* [ ] Create wallet
* [ ] Duplicate wallet rejected
* [ ] Get wallet detail
* [ ] Get wallet balance
* [ ] Freeze wallet
* [ ] Unfreeze wallet
* [ ] Mutation on closed wallet rejected
* [ ] Unauthorized wallet access rejected

---

## Phase 8 — Ledger Foundation (Go)

> **Catatan:** Tahap ini **belum** mencakup transfer atau top-up, melainkan fondasi akun akuntansi.

### Bootstrap
* [ ] Buat `services/ledger`
* [ ] Setup Go module
* [ ] PostgreSQL connection
* [ ] Migration runner
* [ ] Internal HTTP / gRPC API

### Database
* [ ] Buat tabel `ledger_accounts`
* [ ] Buat tabel `account_balances`
* [ ] Buat tabel `ledger_transactions`
* [ ] Buat tabel `ledger_entries`

### Account Management
Implement `POST /internal/v1/ledger/accounts`:
* [ ] Create account
* [ ] Account ID (UUID)
* [ ] Account code unique (e.g. `CUSTOMER_WALLET_<wallet_id>_<currency>`)
* [ ] Currency (`CHAR(3)`)
* [ ] Owner type & Owner ID
* [ ] Account status

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
* [ ] Wallet berstatus `CREATING` saat request masuk
* [ ] Wallet meminta Ledger membuat account secara synchronous
* [ ] Jika Ledger account berhasil dibuat $\rightarrow$ Wallet update status menjadi `ACTIVE`
* [ ] Jika Ledger gagal $\rightarrow$ Wallet tidak pernah menjadi `ACTIVE`

---

## Phase 9 — Transactional Outbox & Event Ingestion

### Wallet Outbox
* [ ] Tabel `outbox_events` di Wallet DB
* [ ] Insert event dalam satu DB transaction dengan mutasi wallet
* [ ] Outbox background publisher membaca record belum terbit
* [ ] Publish ke Kafka broker
* [ ] Tandai `published_at` setelah ACK diterima

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
* [ ] Implement `WalletCreated`
* [ ] Implement `WalletFrozen`
* [ ] Implement `WalletUnfrozen`

### Idempotency Consumer
* [ ] Buat tabel `processed_events`
* [ ] Primary key `(consumer_name, event_id)`
* [ ] Consumer memverifikasi record sebelum memproses event
* [ ] Duplicate event tidak memicu duplicate side effect

---

## Phase 10 — Security Hardening

* [ ] Password / secret tidak pernah tercetak di log
* [ ] JWT / bearer token tidak bocor di log
* [ ] Refresh token hash tidak bocor di log
* [ ] Encryption key & database password tidak tercatat di log
* [ ] PIN tidak pernah masuk log
* [ ] Internal endpoint (Ledger / Internal APIs) tidak dapat diakses dari luar Gateway
* [ ] Autentikasi service-to-service aktif (mTLS / Shared Internal Secret)
* [ ] Validasi otorisasi user aktif di setiap service
* [ ] CORS hanya mengizinkan domain allowlist
* [ ] Production secret wajib diisi (tidak ada default fallback)

---

## Phase 11 — Observability & Tracing

### Logging
* [ ] Structured JSON logging
* [ ] Label `service`
* [ ] Label `request_id`
* [ ] Label `correlation_id`
* [ ] Label `timestamp`
* [ ] Label `level`

### Metrics
* [ ] Request count & throughput
* [ ] Request latency / duration histogram
* [ ] Error rate & HTTP status code metrics
* [ ] Database connection pool & error metrics
* [ ] Redis connection & cache error metrics
* [ ] Kafka consumer lag & publish error metrics

### Correlation Validation
* [ ] Uji alur: `Gateway` $\rightarrow$ `Identity` $\rightarrow$ `Customer` $\rightarrow$ `Wallet` $\rightarrow$ `Ledger`
* [ ] Pastikan `correlation_id` yang sama terbawa tanpa terputus di sepanjang call chain

---

## Phase 12 — Full E2E Verification (Final Boss Sprint 1)

Verifikasi end-to-end dari kondisi database kosong (*clean slate*):

1. **Register** (`POST /v1/auth/register`)
   * [ ] User baru berhasil dibuat di `identity_db`
2. **Login** (`POST /v1/auth/login`)
   * [ ] Access token & refresh token diterima
3. **Customer Profile** (`GET /v1/customers/me`)
   * [ ] Customer otomatis terbentuk dari event `UserRegistered`
4. **Create Wallet** (`POST /v1/wallets`)
   * [ ] Wallet masuk status `CREATING`
   * [ ] Ledger account terbentuk di `ledger_db`
   * [ ] Wallet terupdate menjadi `ACTIVE`
5. **Get Wallet** (`GET /v1/wallets/{id}`)
   * [ ] Status `ACTIVE`, balance `0`, currency `IDR`
6. **Check Balance** (`GET /v1/wallets/{id}/balance`)
   * [ ] Return `0 IDR`
7. **Freeze Wallet** (`POST /v1/wallets/{id}/freeze`)
   * [ ] Status berubah menjadi `FROZEN`
8. **Unfreeze Wallet** (`POST /v1/wallets/{id}/unfreeze`)
   * [ ] Status berubah kembali menjadi `ACTIVE`
9. **Token Refresh** (`POST /v1/auth/refresh`)
   * [ ] Token baru diterbitkan, refresh token lama ditolak
10. **Logout** (`POST /v1/auth/logout`)
    * [ ] Sesi direvoke, refresh token lama tidak lagi valid

---

## Final Sprint 1 Checklist

Sebelum menyatakan **Sprint 1 DONE**, seluruh item berikut wajib tercentang:

* [ ] Monorepo structure
* [ ] Docker Compose
* [ ] PostgreSQL databases
* [ ] Redis
* [ ] Kafka / Redpanda
* [ ] Environment configuration
* [ ] Gateway
* [ ] Liveness / readiness
* [ ] Identity
* [ ] Register
* [ ] Login
* [ ] Refresh rotation
* [ ] Logout
* [ ] Customer
* [ ] UserRegistered event
* [ ] Wallet
* [ ] Wallet lifecycle
* [ ] Ledger account
* [ ] Wallet $\leftrightarrow$ Ledger integration
* [ ] Outbox pattern
* [ ] Idempotent consumer
* [ ] Service authentication
* [ ] Structured logging
* [ ] Metrics
* [ ] Unit tests
* [ ] Integration tests
* [ ] E2E test
* [ ] README
* [ ] Architecture docs

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
