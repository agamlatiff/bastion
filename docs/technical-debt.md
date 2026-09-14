# Bastion Platform — Technical Debt & Architectural Backlog

Dokumen ini mencatat daftar **Technical Debt (Hutang Teknis)**, risiko arsitektur, dan rencana perbaikan terencana untuk menjaga stabilitas dan kepatuhan standar *FinTech/Bank-Grade*.

---

## 📋 Daftar Technical Debt

| ID | Komponen | Judul Masalah | Tingkat Keparahan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TD-001** | `services/identity` | Dual-Write Problem: Direct Kafka Publishing pada `UserRegistered` Event | **HIGH (Data Consistency)** | 🟡 OPEN (Backlog) |
| **TD-002** | `services/wallet` | Ketiadaan Caching Layer & Rencana Implementasi Cache-Aside via Repository Pattern | **MEDIUM (Performance & Scalability)** | 🟡 OPEN (Backlog) |
| **TD-003** | `services/wallet` & `services/transaction` | Ketiadaan Idempotency Key & Distributed Lock (Risiko Double-Debiting / Double-Click) | **HIGH (Financial Integrity)** | 🟡 OPEN (Backlog) |
| **TD-004** | `services/customer` | Ketiadaan Caching Layer pada Profil Nasabah (`/v1/customers/me`) via Repository Pattern | **MEDIUM (Performance & DB Offloading)** | 🟡 OPEN (Backlog) |
| **TD-005** | `services/identity` | Fat Config Anti-Pattern: Injeksi Objek Global Config ke dalam Service Layer | **LOW - MEDIUM (Code Quality & Maintainability)** | 🟡 OPEN (Backlog) |
| **TD-006** | `services/identity` | Leaky Infrastructure Dependency: Injeksi `*redis.Client` ke dalam `AuthHandler.RegisterRoutes` | **LOW (Code Smells & Separation of Concerns)** | 🟡 OPEN (Backlog) |
| **TD-007** | `services/identity` | Ketiadaan Structured Error Logging pada HTTP Handler (Silent 500 Internal Server Errors) | **MEDIUM (Observability & Debuggability)** | 🟡 OPEN (Backlog) |

---

## 📌 Detail Masalah

### TD-001: Dual-Write Problem pada Identity Service Event Publishing

#### 1. Deskripsi Masalah (Context)
Pada file [`services/identity/service/auth_service.go`](file:///c:/Projects/bastion/services/identity/service/auth_service.go#L77-L89), proses registrasi pengguna baru menjalankan dua langkah penulisan yang terpisah ke dua sistem berbeda:
1. Menulis data akun ke database PostgreSQL (`s.repo.CreateUser`).
2. Menulis event domain ke broker Kafka (`s.producer.PublishUserRegistered`).

```go
// Step 1: Database Commit
if err := s.repo.CreateUser(ctx, user); err != nil {
    return nil, err
}

// Step 2: Network / Kafka Publish (Tanpa jaminan atomik)
if s.producer != nil {
    if err := s.producer.PublishUserRegistered(ctx, ...); err != nil {
        fmt.Printf("[EVENT WARN] failed to publish UserRegistered event: %v\n", err)
    }
}
```

#### 2. Risiko & Dampak Bisnis (Impact)
* **Dual-Write Problem**: Langkah (1) dan (2) **tidak berada dalam satu transaksi ACID**.
* **Skenario Kegagalan (Failure Mode)**:
  Jika database PostgreSQL berhasil melakukan `COMMIT`, namun aplikasi tiba-tiba mengalami *crash*, *out-of-memory*, listrik padam, atau jaringan ke Kafka mengalami *timeout* sebelum langkah (2) selesai:
  * Akun pengguna sudah tersimpan di `identity_db`.
  * Namun event `UserRegistered` **tidak pernah sampai ke Kafka**.
* **Dampak Hilir (Downstream Impact)**:
  * `Customer Service` tidak pernah menerima event $\rightarrow$ Profil nasabah tidak dibuat.
  * `Wallet Service` tidak pernah menerima event $\rightarrow$ Dompet saldo IDR awal tidak tercipta.
  * **Akun menjadi "Akun Cacat/Hantu" (*Broken Account*)**: Pengguna bisa login, tetapi semua fitur dompet dan saldo akan melempar error `Wallet Not Found`.

#### 3. Rekomendasi Solusi (Proposed Solution)
Mengadopsi **Transactional Outbox Pattern**, sama seperti implementasi yang sudah berjalan di [`services/wallet/outbox/publisher.go`](file:///c:/Projects/bastion/services/wallet/outbox/publisher.go):

1. **Buat Tabel `outbox` di `identity_db`**:
   ```sql
   CREATE TABLE outbox_events (
       id UUID PRIMARY KEY,
       aggregate_type VARCHAR(50) NOT NULL,
       aggregate_id UUID NOT NULL,
       event_type VARCHAR(100) NOT NULL,
       payload JSONB NOT NULL,
       status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
       retry_count INT NOT NULL DEFAULT 0,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       processed_at TIMESTAMPTZ
   );
   CREATE INDEX outbox_status_idx ON outbox_events(status, created_at);
   ```

2. **Bungkus dalam 1 Transaksi Database Atomik**:
   Di `repository.CreateUser`, simpan baris ke tabel `users`, `user_roles`, DAN `outbox_events` dalam satu perintah `tx.Begin(ctx)` $\rightarrow$ `tx.Commit(ctx)`.
   * Jika database gagal, semuanya batal.
   * Jika database sukses, event **100% DIJAMIN TERSIMPAN** di harddisk.

3. **Background Outbox Worker**:
   Buat worker latar belakang mandiri (`OutboxPublisher`) yang melakukan polling berkala (misal tiap 500ms):
   * Ambil event berstatus `PENDING`.
   * Tembakkan ke Kafka broker.
   * Begitu mendapat ACK dari Kafka, ubah status menjadi `PROCESSED`.
   * Jika Kafka mati, worker akan melakukan *retry* otomatis dengan *exponential backoff*.

#### 4. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Buat file migrasi `000002_create_identity_outbox.up.sql` di `services/identity/migrations`.
- [ ] Tambahkan method `CreateOutboxEvent` dan `GetPendingOutboxEvents` di repository `identity`.
- [ ] Implementasikan `services/identity/outbox/publisher.go` dengan graceful shutdown.
- [ ] Jalankan goroutine Outbox Publisher saat inisialisasi di `services/identity/main.go`.
- [ ] Hapus pemanggilan langsung `s.producer.PublishUserRegistered` dari `auth_service.go`.
- [ ] Uji coba simulasi matikan Kafka saat registrasi: pastikan event tetap tersimpan dan otomatis terkirim begitu Kafka dinyalakan kembali.

---

### TD-002: Ketiadaan Caching Layer & Pola Cache-Aside via Repository Layer

#### 1. Deskripsi Masalah (Context)
Saat ini pembacaan data dompet pada [`services/wallet/service/wallet_service.go`](file:///c:/Projects/bastion/services/wallet/service/wallet_service.go) (seperti `GetWallet` dan `GetBalance`) selalu melakukan query langsung ke database PostgreSQL (`wallet_db`) melalui `s.repo.GetByID`.
* Pada skenario produksi *read-heavy* (misal banyak pengguna mengecek saldo/profil dompet secara bersamaan), koneksi database berpotensi menjadi *bottleneck*.
* Infrastruktur Redis (`redis:7-alpine`) sudah berjalan di `docker-compose.yml` dan konfigurasi `RedisAddr` sudah ada di `config.go`, namun belum dimanfaatkan untuk query caching.

#### 2. Prinsip Arsitektur: Redis di Repository Layer (BUKAN di Service Layer)
Untuk menjaga kepatuhan terhadap prinsip *Clean Architecture* dan *Hexagonal/Ports-and-Adapters*:
* **Service Layer harus bebas dari urusan infrastruktur caching:** Service hanya tahu memanggil `repo.GetByID()` dan tidak boleh terkontaminasi oleh import `go-redis` atau logika serialisasi JSON Redis.
* **Gunakan Repository Decorator Pattern:**
  Buat implementasi `cachedWalletRepository` yang mengimplementasikan interface `repository.WalletRepository`:
  ```text
  [Wallet Service] 
         │ (memanggil interface WalletRepository)
         ▼
  [CachedWalletRepository] ──(Hit)──> [ REDIS CACHE ]
         │ (Miss / Invalidation)
         ▼
  [PostgresWalletRepository] ───────> [ POSTGRESQL DB ]
  ```

#### 3. Strategi Sinkronisasi & Invalidasi Data (Ketika DB Ada Update)
Agar data di Redis tidak *stale* (basi) saat ada pembaruan di database:

1. **Read Strategy (`GetByID`):**
   * Periksa Redis key `wallet:{id}`.
   * **Jika Cache Hit:** Kembalikan data seketika tanpa menyentuh PostgreSQL.
   * **Jika Cache Miss:** Query database PostgreSQL $\rightarrow$ simpan hasil ke Redis dengan **TTL (Time-To-Live) 5 menit** $\rightarrow$ kembalikan data.

2. **Write / Invalidation Strategy (`UpdateStatusWithOutbox` / status change):**
   * Eksekusi transaksi update ke PostgreSQL terlebih dahulu.
   * Begitu transaksi PostgreSQL berhasil di-`COMMIT`, jalankan:
     ```go
     rdb.Del(ctx, "wallet:" + walletID.String())
     ```
   * Dengan menghapus key (*cache invalidation*), request pembacaan berikutnya dijamin akan mengambil data status terbaru (`FROZEN`/`ACTIVE`) dari PostgreSQL.

3. **Jaring Pengaman (Dual-Write Protection):**
   * TTL 5 menit wajib dipasang pada setiap key sebagai batas maksimal toleransi jika koneksi ke Redis sempat terputus saat proses `DEL`.

#### 4. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Buat file `services/wallet/repository/cached_wallet_repository.go` yang membungkus `WalletRepository` bawaan dan `*redis.Client`.
- [ ] Inisialisasi koneksi `redis.NewClient` di `services/wallet/main.go`.
- [ ] Bungkus `walletRepo` dengan `NewCachedWalletRepository(walletRepo, rdb)` saat *dependency injection* di `main.go`.
- [ ] Pastikan `wallet_service.go` **tetap bersih tanpa import Redis**.
- [ ] Terapkan invalidasi cache (`rdb.Del`) pada fungsi repository yang melakukan mutasi data status dompet.
- [ ] Uji skenario:
  1. Panggil `GetWallet` (harus tersimpan di Redis).
  2. Panggil `FreezeWallet` (key di Redis harus otomatis terhapus).
  3. Panggil `GetWallet` kembali (data harus status FROZEN dan tersimpan ulang ke Redis).

---

### TD-003: Ketiadaan Idempotency Key & Distributed Lock pada Mutasi Transaksi

#### 1. Deskripsi Masalah (Context)
Pada transaksi finansial (seperti pembuatan transaksi, transfer dana, pemotongan saldo, atau top up), pengguna sering kali menekan tombol aksi lebih dari satu kali (*double click*) saat koneksi internet mengalami latensi.
* Saat ini belum ada mekanisme validasi `Idempotency-Key` atau *Distributed Lock* di layer API/Repository `services/wallet` maupun `services/transaction`.
* **Risiko Finansial (Critical Impact):** Dua thread atau goroutine terpisah dapat mengeksekusi proses mutasi saldo secara paralel untuk satu intensi transaksi yang sama, mengakibatkan **saldo terpotong ganda (*double-debiting*)** atau terciptanya mutasi duplikat di buku besar.

#### 2. Rekomendasi Solusi (Redis Distributed Lock & Idempotency)
Memanfaatkan operasi atomik Redis `SET ... NX EX` sebagai pintu gerbang idempotensi:
1. Client wajib mengirimkan header HTTP: `Idempotency-Key: <UUID>`.
2. Sebelum mengeksekusi mutasi di database, periksa dan klaim lock di Redis:
   ```go
   // Set key hanya jika belum ada (NX) dengan masa berlaku (EX) misal 120 detik
   acquired, err := rdb.SetArgs(ctx, "idempotency:"+idempotencyKey, "PROCESSING", redis.SetArgs{
       Mode: "NX",
       TTL:  120 * time.Second,
   }).Result()
   ```
3. Jika key sudah ada (`acquired == false`):
   * Jika nilainya `"PROCESSING"`, tolak request dengan HTTP `409 Conflict` (*"Transaction currently being processed"*).
   * Jika nilainya berisi hasil respons yang sudah selesai di-cache, langsung kembalikan respons tersebut tanpa mengeksekusi ulang ke database.
4. Setelah transaksi PostgreSQL selesai di-commit:
   * Update nilai key dengan respons sukses dan perpanjang TTL (misal 24 jam) agar request berulang dengan key yang sama mengembalikan respons identik.

#### 3. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Buat middleware atau repository decorator `IdempotencyManager` di `services/wallet`.
- [ ] Terapkan validasi header `Idempotency-Key` pada setiap mutasi finansial (POST / PATCH).
- [ ] Simpan status dan hasil eksekusi ke Redis secara atomik dengan batas TTL.
- [ ] Uji coba skenario *concurrent request*: tembakkan 5 request paralel dengan `Idempotency-Key` yang sama; pastikan hanya 1 request yang diproses oleh PostgreSQL/Ledger dan 4 lainnya ditolak dengan aman.

---

### TD-004: Ketiadaan Caching Layer pada Profil Nasabah di Customer Service

#### 1. Deskripsi Masalah (Context)
Pada [`services/customer`](file:///c:/Projects/bastion/services/customer), endpoint `GET /v1/customers/me` ([CustomerController.java](file:///c:/Projects/bastion/services/customer/src/main/java/com/bastion/customer/controller/CustomerController.java#L27-L38)) dipanggil secara masif oleh aplikasi klien (mobile/web) di hampir setiap navigasi layar untuk memvalidasi identitas nasabah, nama lengkap, nomor telepon, dan status KYC (`PENDING`, `VERIFIED`).
* Saat ini setiap pemanggilan selalu melakukan query langsung ke database PostgreSQL `customer_db`.
* Padahal, data profil nasabah memiliki rasio baca berbanding tulis (*read-to-write ratio*) yang sangat tinggi (99% dibaca, <1% diubah).

#### 2. Rekomendasi Solusi: Cache-Aside via Repository Pattern (Spring Data Redis)
1. **Tambahkan Dependensi Spring Data Redis:**
   Gunakan `spring-boot-starter-data-redis` di `services/customer/pom.xml`.
2. **Prinsip Repository Caching:**
   Bungkus data access layer `CustomerRepository` dengan caching (misal menggunakan `@Cacheable` dan `@CacheEvict` atau implementasi custom `CachedCustomerRepository`):
   * **Read (`getProfile`):** Cek Redis key `customer:profile:{identityUserId}`. Jika miss, query PostgreSQL dan simpan di Redis dengan TTL 15–30 menit.
   * **Write (`updateProfile`):** Saat ada perubahan data via `PATCH /v1/customers/me`, update PostgreSQL terlebih dahulu, kemudian evict/hapus key di Redis.
   * **Event-Driven Invalidation:** Saat event KYC disetujui (misal via Kafka), listener otomatis menghapus cache profil nasabah terkait.

#### 3. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Konfigurasi `RedisTemplate` dan connection pool di `services/customer`.
- [ ] Terapkan caching pada pencarian nasabah berdasarkan `identityUserId`.
- [ ] Terapkan invalidasi cache seketika saat `updateProfile` berhasil di-commit ke DB.
- [ ] Pastikan respons `GET /v1/customers/me` ter-cache dengan waktu respons < 5ms pada pemanggilan kedua (Cache Hit).

---

### TD-005: Fat Config Anti-Pattern pada Injeksi Service Layer

#### 1. Deskripsi Masalah (Context)
Pada [`services/identity/service/auth_service.go:42-55`](file:///c:/Projects/bastion/services/identity/service/auth_service.go#L42-L55), struct `authService` menerima dan menyimpan seluruh objek pointer global konfigurasi (`cfg *config.Config`).
* Objek `config.Config` menampung seluruh variabel konfigurasi level aplikasi, seperti `Port`, `DatabaseURL`, `RedisAddr`, dan `KafkaBrokers`.
* Di dalam `authService`, hanya 4 variabel spesifik yang benar-benar digunakan: `JWTSecret`, `AccessTokenExpiryMins`, `RefreshTokenExpiryDays`, dan `EncryptionKey`.

#### 2. Risiko & Dampak Teknis (Impact)
* **Pelanggaran Prinsip *Least Privilege* & *Interface Segregation*:** Layer bisnis (`Service`) terpapar informasi level infrastruktur (`DatabaseURL`, `KafkaBrokers`, `Port`) yang tidak relevan dengan tanggung jawab domain autentikasi pengguna.
* **Testing Friction (Menyulitkan Unit Testing):** Saat menyusun unit test terisolasi untuk `authService`, pengujian terpaksa membuat mock/dummy dari seluruh struct `Config`, termasuk field-field koneksi jaringan yang tidak dipakai.
* **Risiko Kebocoran Data Sensitif di Log:** Jika suatu saat objek `authService` dicetak ke structured logger atau debugger (`%+v`), kredensial koneksi database dan broker berpotensi bocor ke file log.

#### 3. Rekomendasi Solusi
Gunakan salah satu dari dua pendekatan *Clean Architecture*:
1. **Pendekatan Parameter Spesifik (Rekomendasi Utama):**
   Ubah constructor `NewAuthService` untuk hanya menerima field primitif yang dibutuhkan oleh domain Auth:
   ```go
   type authService struct {
       repo               repository.Repository
       producer           event.EventProducer
       jwtSecret          string
       accessTokenExpiry  time.Duration
       refreshTokenExpiry time.Duration
       encryptionKey      []byte
   }
   ```
2. **Pendekatan Sub-Config Terisolasi (`AuthConfig`):**
   Kelompokkan konfigurasi otentikasi ke dalam struct terpisah `AuthConfig`, sehingga `main.go` hanya meneruskan sub-config tersebut ke service layer.

#### 4. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Refactor constructor `NewAuthService` untuk hanya menerima konfigurasi domain otentikasi (bukan seluruh `*config.Config`).
- [ ] Hapus dependensi `cfg *config.Config` dari dalam struct `authService`.
- [ ] Sesuaikan inisialisasi dependency injection di `services/identity/main.go`.
- [ ] Pastikan seluruh unit test (jika ada) dan kompilasi aplikasi (`go build ./...`) berjalan bersih tanpa regresi.

---

### TD-006: Leaky Infrastructure Dependency pada `AuthHandler.RegisterRoutes`

#### 1. Deskripsi Masalah (Context)
Pada [`services/identity/handler/auth_handler.go:31-36`](file:///c:/Projects/bastion/services/identity/handler/auth_handler.go#L31-L36), method `RegisterRoutes` menerima parameter `rdb *redis.Client` semata-mata untuk diteruskan ke pemanggilan middleware `middleware.RateLimit(rdb, ...)`.
* Hal ini memaksa file `auth_handler.go` untuk mengimpor dependensi library pihak ketiga: `github.com/redis/go-redis/v9`.
* Padahal, fungsi-fungsi inti di dalam `AuthHandler` (`Login`, `Register`, `RefreshToken`, `Logout`, `Verify2FA`) sama sekali tidak menggunakan Redis secara langsung.

#### 2. Risiko & Dampak Teknis (Impact)
* **Leaky Abstraction & Tanggung Jawab Tercampur:** Handler layer yang seharusnya murni menangani parsing HTTP request/response DTO menjadi tahu detail infrastruktur database/cache (Redis Client).
* **Pelanggaran Konvensi Router:** Method `RegisterRoutes` pada Clean Architecture biasanya hanya menerima router interface murni (`*gin.RouterGroup`) tanpa membawa dependensi infrastruktur backend pihak ketiga.
* **Testing Friction:** Pengujian routing HTTP handler secara terisolasi menjadi canggung karena harus menyertakan mock/instance Redis client pada parameter method pendaftaran rute.

#### 3. Rekomendasi Solusi (Composition Root di `main.go`)
Pindahkan perakitan route dan middleware rate limiter ke tempat *Composition Root* aplikasi ([`services/identity/main.go`](file:///c:/Projects/bastion/services/identity/main.go#L91-L94)), di mana router dan middleware memang seharusnya dirakit bersama:

```go
// Di services/identity/main.go (Composition Root):
auth := router.Group("/v1/auth")
{
    auth.POST("/register", middleware.RateLimit(rdb, "register", 5, time.Minute), authHdr.Register)
    auth.POST("/login",    middleware.RateLimit(rdb, "login", 5, time.Minute), authHdr.Login)
    auth.POST("/refresh",  middleware.RateLimit(rdb, "refresh", 10, time.Minute), authHdr.RefreshToken)
    auth.POST("/logout",   authHdr.Logout)
    // ...
}
```
Dengan pendekatan ini:
* `auth_handler.go` menjadi **100% murni** tanpa ada import `"github.com/redis/go-redis/v9"`.
* Tanggung jawab perakitan middleware satpam (Rate Limiting) sepenuhnya dikembalikan ke layer inisialisasi server (`main.go`).

#### 4. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Pindahkan konfigurasi rute dan injeksi middleware `RateLimit` ke `services/identity/main.go`.
- [ ] Bersihkan atau hapus method `RegisterRoutes` yang menerima parameter `rdb *redis.Client` dari `auth_handler.go`.
- [ ] Hapus baris `import "github.com/redis/go-redis/v9"` dari file `services/identity/handler/auth_handler.go`.
- [ ] Pastikan seluruh endpoint otentikasi `/v1/auth/*` tetap terproteksi oleh Redis rate limiting yang sama persis.

---

### TD-007: Ketiadaan Structured Error Logging pada HTTP Handler Layer

#### 1. Deskripsi Masalah (Context)
Pada [`services/identity/handler/auth_handler.go`](file:///c:/Projects/bastion/services/identity/handler/auth_handler.go) (seperti pada fungsi `Register`, `Login`, `RefreshToken`), saat terjadi kegagalan sistem internal tak terduga (HTTP 500), error teknis rantai dari Database/Repository/Service hanya dibuang begitu saja ke dalam respons `c.JSON(http.StatusInternalServerError, ...)` tanpa dicatat ke server console log (`log.Printf`, `c.Error(err)`, atau structured logger).
* Konsol terminal Gin hanya menampilkan baris access log standar:
  `[GIN] 2026/09/14 - 16:15:37 | 500 | 2.15ms | 127.0.0.1 | POST "/v1/auth/register"`
* Penyebab asli kegagalan (seperti PostgreSQL connection timeout, query constraint failure, encryption crash) menjadi **hilang tanpa jejak (Silent Failure)**.

#### 2. Risiko & Dampak Teknis (Impact)
* **Zero Observability saat Insiden Produksi:** Tim teknis tidak dapat melakukan *root cause analysis* (investigasi akar masalah) ketika nasabah mengeluh gagal login atau gagal register karena error internal tidak pernah tercetak di server log.
* **Terputusnya Jejak Distributed Tracing:** Header `X-Request-ID` yang sudah susah payah dibuat oleh API Gateway tidak terkorelasikan dengan pesan error database di server terminal identity.

#### 3. Rekomendasi Solusi: Centralized Logging at Handler Layer
Mengadopsi aturan standar logging di Go: **"Log an error OR return it, NEVER both!"**
* **Repository & Service Layer:** Tetap bersih tanpa pemanggilan `log.Printf`. Cukup membungkus error dengan `fmt.Errorf("...: %w", err)` dan meneruskannya ke atas.
* **Handler Layer (Titik Tunggal Pencatatan Log):** Tangkap seluruh error `500` dan cetak ke log terminal bersama `X-Request-ID` sebelum mengembalikan respons aman ke pengguna:
  ```go
  if err != nil {
      if errors.Is(err, repository.ErrDuplicateEmail) {
          c.JSON(http.StatusConflict, gin.H{"error": "Email is already registered"})
          return
      }

      // Catat error internal lengkap (DB + Repo + Service) beserta Request-ID ke console:
      log.Printf("[ERROR] [RequestID: %s] Failed to register user: %v", requestID, err)
      
      // Atau manfaatkan Gin Error accumulator:
      // c.Error(err)

      // Kembalikan respons yang aman dan ramah ke user:
      c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user account"})
      return
  }
  ```

#### 4. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Tambahkan baris pencatatan error (`log.Printf` atau `c.Error`) pada seluruh blok penanganan error `500` di `services/identity/handler/auth_handler.go`.
- [ ] Pastikan setiap baris log error selalu menyertakan `requestID` (`X-Request-ID`) untuk penelusuran terpadu.
- [ ] Pastikan pesan error yang dikirimkan ke respons HTTP JSON pengguna tetap bersih tanpa membocorkan detail teknis internal database.
- [ ] Simulasikan mematikan container PostgreSQL dan pastikan pesan error rantai lengkap (`failed to insert user: dial tcp...`) muncul dengan jelas di terminal saat request register/login dijalankan.
