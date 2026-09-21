# Bastion Platform — Technical Debt & Architectural Backlog

Dokumen ini mencatat daftar **Technical Debt (Hutang Teknis)**, risiko arsitektur, dan rencana perbaikan terencana untuk menjaga stabilitas dan kepatuhan standar *FinTech/Bank-Grade*.

---

## 📋 Daftar Technical Debt

| ID | Komponen | Judul Masalah | Tingkat Keparahan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TD-004** | `services/customer` | Ketiadaan Caching Layer pada Profil Nasabah (`/v1/customers/me`) via Repository Pattern | **MEDIUM (Performance & DB Offloading)** | 🟡 OPEN (Backlog) |
| **TD-005** | `services/identity` | Fat Config Anti-Pattern: Injeksi Objek Global Config ke dalam Service Layer | **LOW - MEDIUM (Code Quality & Maintainability)** | 🟡 OPEN (Backlog) |
| **TD-006** | `services/identity` | Leaky Infrastructure Dependency: Injeksi `*redis.Client` ke dalam `AuthHandler.RegisterRoutes` | **LOW (Code Smells & Separation of Concerns)** | 🟡 OPEN (Backlog) |
| **TD-007** | `services/identity` | Ketiadaan Structured Error Logging pada HTTP Handler (Silent 500 Internal Server Errors) | **MEDIUM (Observability & Debuggability)** | 🟡 OPEN (Backlog) |
| **TD-008** | `services/identity` | Monolithic Service & Handler Bloat: Percampuran Tanggung Jawab Core Auth dan 2FA/MFA | **LOW (Code Organization & Maintainability)** | 🟡 OPEN (Backlog) |
| **TD-009** | All Services | Ketiadaan Standarisasi Komentar Kode: Inkonsistensi Bahasa & Ketiadaan Step-by-Step per Section pada Fungsi Kompleks | **LOW (Readability & Maintainability)** | 🟡 OPEN (Backlog) |

---

## 📌 Detail Masalah


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

---

### TD-008: Monolithic Service & Handler Bloat pada Fitur 2FA/MFA

#### 1. Deskripsi Masalah (Context)
File [`services/identity/service/auth_service.go`](file:///c:/Projects/bastion/services/identity/service/auth_service.go) (>500 baris) dan [`services/identity/handler/auth_handler.go`](file:///c:/Projects/bastion/services/identity/handler/auth_handler.go) (>300 baris) menggabungkan dua domain tanggung jawab (*sub-domains*) yang berbeda ke dalam satu file fisik monolitik:
1. **Core Identity & Session Management:** Pendaftaran akun (`Register`), Otentikasi password (`Login`), Rotasi session token (`RefreshToken`), dan Logout.
2. **Two-Factor Authentication (2FA / MFA):** Registrasi kunci TOTP (`Setup2FA`), Verifikasi dan aktivasi (`Enable2FA`), Pencabutan kunci (`Disable2FA`), dan Penyelesaian tantangan login 2FA (`Verify2FALogin`) beserta enkripsi simetris AES-256.

#### 2. Risiko & Dampak Teknis (Impact)
* **Pelanggaran Prinsip *Single Responsibility* & *High Cognitive Load*:** Developer harus membaca dan menelusuri ratusan baris kode yang mencampurkan logika otentikasi sesi JWT dasar dengan logika kriptografi TOTP dan pengelolaan master key enkripsi.
* **Risiko *Merge Conflict* Git:** Jika ada developer yang memodifikasi alur rotasi refresh token sementara developer lain memperbaiki alur validasi OTP 2FA, risiko bentrokan (*merge conflict*) di file yang sama menjadi sangat tinggi.
* **Pengujian Terisolasi yang Sulit:** File pengujian (`auth_service_test.go`) menjadi sangat panjang dan sulit dikelola karena mencakup pengujian sesi dan pengujian OTP dalam satu file raksasa.

#### 3. Rekomendasi Solusi: Pemisahan Berbasis Sub-Domain (Domain-Focused Files)
Memanfaatkan fitur package Go di mana method pada struct yang sama dapat dipecah ke dalam beberapa file fisik tanpa merusak antarmuka publik:

```text
services/identity/service/
├── auth_service.go        (~250 baris: Register, Login, RefreshToken, Logout)
└── two_factor_service.go  (~250 baris: Setup2FA, Enable2FA, Disable2FA, Verify2FALogin)

services/identity/handler/
├── auth_handler.go        (~150 baris: Handler Register, Login, Refresh, Logout)
└── two_factor_handler.go  (~150 baris: Handler Setup2FA, Enable2FA, Disable2FA, Verify2FA)
```

Dengan pemisahan ini:
* Struct `authService` dan `AuthHandler` tetap utuh tanpa merusak kode lain di luar package.
* Ukuran setiap file menjadi ringkas (< 250 baris) dengan fokus tanggung jawab yang terisolasi rapi.

#### 4. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Pindahkan implementasi method `Setup2FA`, `Enable2FA`, `Disable2FA`, dan `Verify2FALogin` ke file baru `services/identity/service/two_factor_service.go`.
- [ ] Pindahkan handler HTTP terkait 2FA ke file baru `services/identity/handler/two_factor_handler.go`.
- [ ] Pastikan seluruh unit test dan kompilasi project (`go build ./...`) tetap berhasil tanpa ada perubahan *contract* publik.
- [ ] Pastikan masing-masing file memiliki ukuran yang ideal dan terfokus pada satu domain tanggung jawab.

---

### TD-009: Ketiadaan Standarisasi Komentar Kode (English Step-by-Step Sectioning)

#### 1. Deskripsi Masalah (Context)
Pada berbagai service (`services/identity`, `services/wallet`, `services/customer`), penulisan komentar kode (*inline comments*) saat ini masih belum terstandarisasi:
1. **Inkonsistensi Bahasa:** Sebagian fungsi memiliki komentar berbahasa Indonesia, sebagian berbahasa Inggris, dan sebagian tidak memiliki komentar sama sekali.
2. **Ketiadaan Pembagian Seksi (*Sectioning*):** Pada fungsi-fungsi bisnis yang panjang (>40–100 baris), blok kode sering kali ditulis secara beruntun tanpa pemisah visual/konseptual yang jelas. Hal ini menyulitkan developer untuk memetakan alur logika (*cognitive load* tinggi).

*Standar yang sudah berhasil dicontohkan pada fungsi 2FA di [`services/identity/service/auth_service.go`](file:///c:/Projects/bastion/services/identity/service/auth_service.go) (seperti `Setup2FA`, `Enable2FA`, dan `Verify2FALogin`) menunjukkan bahwa penggunaan komentar bernomor step-by-step berbahasa Inggris (`// 1.`, `// 2.`, ...) membuat fungsi yang panjang menjadi sangat nyaman dibaca per bagian.*

#### 2. Risiko & Dampak Teknis (Impact)
* **High Cognitive Load & Onboarding Friction:** Developer atau auditor kode harus membaca kode baris-demi-baris secara teliti untuk memahami transisi antar langkah bisnis (misal: validasi input $\rightarrow$ query DB $\rightarrow$ kriptografi $\rightarrow$ mutasi status $\rightarrow$ publish event).
* **Standar Profesional & Enterprise Readiness:** Sesuai standar industri perbankan/FinTech internasional dan ekosistem open-source Go, seluruh basis kode, komentar inline, dan dokumentasi Godoc wajib ditulis dalam **Bahasa Inggris profesional** untuk mempermudah audit keamanan global dan kolaborasi lintas tim.

#### 3. Rekomendasi Solusi (English Step-by-Step Pattern)
Terapkan standarisasi penulisan komentar di seluruh codebase:

1. **Translasi ke Bahasa Inggris Penuh:**
   Semua komentar berbahasa Indonesia ditransformasikan ke bahasa Inggris yang ringkas, deskriptif, dan teknis.
2. **Penomoran Alur Bisnis Step-by-Step (`// 1.`, `// 2.`, ...) pada Long Functions:**
   Setiap fungsi di Service/Handler layer yang menjalankan beberapa tahapan bisnis wajib dibagi menjadi seksi-seksi bernomor:
   ```go
   // 1. Retrieve user by ID and validate existence
   // 2. Verify account state (ensure not locked or suspended)
   // 3. Decrypt and validate TOTP passcode
   // 4. Update session status and record audit log in DB
   // 5. Invalidate distributed cache (Redis)
   // 6. Emit domain event to Kafka
   ```
3. **Format Godoc Standar pada Exported Symbols:**
   Setiap fungsi dan tipe yang diekspor (huruf depan kapital) wajib diawali komentar Godoc ringkas yang menjelaskan tujuan fungsi tersebut.

#### 4. Action Items & Kriteria Selesai (Acceptance Criteria)
- [ ] Audit dan terjemahkan seluruh komentar berbahasa Indonesia di `services/identity` (`service/`, `handler/`, `repository/`, `middleware/`) ke Bahasa Inggris.
- [ ] Terapkan komentar bernomor step-by-step (`// 1.`, `// 2.`, dst.) pada fungsi-fungsi bisnis utama:
  - `Register`, `Login`, `RefreshToken` di `services/identity/service/auth_service.go`.
  - Fungsi-fungsi transfer, debit, credit di `services/wallet/service/wallet_service.go`.
- [ ] Pastikan tidak ada lagi komentar campuran (campuran Indo-Inggris) di dalam satu file.
- [ ] Buat *code style guide* singkat di internal team guidelines mengenai konvensi komentar step-by-step ini.

