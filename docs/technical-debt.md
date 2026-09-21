# Bastion Platform — Technical Debt & Architectural Backlog

Dokumen ini mencatat daftar **Technical Debt (Hutang Teknis)**, risiko arsitektur, dan rencana perbaikan terencana untuk menjaga stabilitas dan kepatuhan standar *FinTech/Bank-Grade*.

---

## 📋 Daftar Technical Debt

| ID | Komponen | Judul Masalah | Tingkat Keparahan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TD-008** | `services/identity` | Monolithic Service & Handler Bloat: Percampuran Tanggung Jawab Core Auth dan 2FA/MFA | **LOW (Code Organization & Maintainability)** | 🟡 OPEN (Backlog) |
| **TD-009** | All Services | Ketiadaan Standarisasi Komentar Kode: Inkonsistensi Bahasa & Ketiadaan Step-by-Step per Section pada Fungsi Kompleks | **LOW (Readability & Maintainability)** | 🟡 OPEN (Backlog) |

---

## 📌 Detail Masalah

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

