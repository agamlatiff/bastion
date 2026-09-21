# Bastion Platform — Technical Debt & Architectural Backlog

Dokumen ini mencatat daftar **Technical Debt (Hutang Teknis)**, risiko arsitektur, dan rencana perbaikan terencana untuk menjaga stabilitas dan kepatuhan standar *FinTech/Bank-Grade*.

---

## 📋 Daftar Technical Debt

*Semua item Technical Debt (TD-001 s/d TD-009) telah berhasil diselesaikan secara penuh.*

| ID | Komponen | Judul Masalah | Tingkat Keparahan | Status |
| :--- | :--- | :--- | :--- | :--- |
| *None* | — | *Tidak ada technical debt yang tersisa (Backlog Bersih)* | — | 🟢 ALL RESOLVED |

---

## 📌 Detail Masalah

Seluruh hutang teknis telah tuntas diimplementasikan, diuji dengan unit testing komprehensif, dimigrasikan ke branch `main`, dan didokumentasikan sesuai standar bank-grade architecture:
- **TD-001**: Transactional Outbox Pattern pada `services/identity` (`000002_create_identity_outbox.up.sql` + ACID dual-write).
- **TD-002**: Cache-Aside Pattern via Decorator pada `services/wallet` (`CachedWalletRepository`).
- **TD-003**: Idempotency Key Middleware & Distributed Mutex Lock pada `services/wallet`.
- **TD-004**: Customer Profile Cache-Aside via Spring Data Redis pada `services/customer`.
- **TD-005**: Domain-Scoped `AuthConfig` Refactoring pada `services/identity`.
- **TD-006**: Leaky Infrastructure Dependency Elimination pada `AuthHandler`.
- **TD-007**: Centralized Structured Error Logging dengan `X-Request-ID` & Error Sanitization pada HTTP Handler layer.
- **TD-008**: 2FA/MFA Domain Separation ke `two_factor_service.go` & `two_factor_handler.go`.
- **TD-009**: Code Comment Standardization (English step-by-step sectioning & Godoc guide di `docs/code-style-guide.md`).


