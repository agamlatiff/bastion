# Bastion Platform — Technical Debt & Architectural Backlog

Dokumen ini mencatat daftar **Technical Debt (Hutang Teknis)**, risiko arsitektur, dan rencana perbaikan terencana untuk menjaga stabilitas dan kepatuhan standar *FinTech/Bank-Grade*.

---

## 📋 Daftar Technical Debt

| ID | Komponen | Judul Masalah | Tingkat Keparahan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TD-001** | `services/identity` | Dual-Write Problem: Direct Kafka Publishing pada `UserRegistered` Event | **HIGH (Data Consistency)** | 🟡 OPEN (Backlog) |

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
