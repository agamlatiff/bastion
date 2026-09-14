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
