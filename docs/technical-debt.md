# Bastion Platform — Technical Debt & Architectural Backlog

Dokumen ini mencatat daftar **Technical Debt (Hutang Teknis)**, risiko arsitektur, dan rencana perbaikan terencana untuk menjaga stabilitas dan kepatuhan standar *FinTech/Bank-Grade*.

---

## 📋 Daftar Technical Debt

| ID | Komponen | Judul Masalah | Tingkat Keparahan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TD-009** | All Services | Ketiadaan Standarisasi Komentar Kode: Inkonsistensi Bahasa & Ketiadaan Step-by-Step per Section pada Fungsi Kompleks | **LOW (Readability & Maintainability)** | 🟡 OPEN (Backlog) |

---

## 📌 Detail Masalah

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

