# TASK 3 — Frontend & Backend Alignment & Ledger Orchestration Roadmap

## Dokumen Panduan & Daftar Kerja (TODO)

Dokumen ini memetakan seluruh pekerjaan yang diperlukan untuk menyelaraskan secara penuh antara seluruh layanan backend (*API Gateway, Identity, Customer, Wallet, Ledger, KYC, Transaction*) dengan antarmuka frontend (*React + Vite + Tailwind CSS* di `web/`).

---

## Ringkasan Kesenjangan (Gap Analysis) Saat Ini

```text
Frontend (web/)                          API Gateway (:8080)                     Backend Services
────────────────                         ───────────────────                     ────────────────
/app/admin/users  ─────────────────────> /v1/admin/users [404 NOT FOUND] ──────X services/identity (:8081)
/app/dashboard    ──(mock modal)────────> [simulated with setTimeout]   ──────X Tidak panggil API riil
/app/activity     ──(Transfer/Topup)───> /v1/transactions/transfers ──────────> services/transaction (:8086)
                                                                                  │ (Event Outbox)
                                                                                  ▼
                                         Kafka topic: bastion.transaction.events
                                                                                  │ (BELUM ADA CONSUMER)
                                                                                  X
                                                                          services/ledger (:8084)
                                                                          services/wallet (:8083)
                                                                          [Saldo belum termutasi otomatis]
```

---

## Rincian TODO Terstruktur

### Tahap 1: Penyelarasan Jalur Routing API Gateway (Prioritas Segera)
Tujuan: Memastikan seluruh rute admin dan transaksi yang dipanggil oleh frontend dapat diteruskan ke service yang tepat tanpa galat 404.

- [x] **GW-001: Daftarkan Rute Admin Identity di Gateway**
  - **Berkas Target:** [`services/gateway/router/router.go`](file:///c:/Projects/bastion/services/gateway/router/router.go)
  - **Aksi:** Tambahkan pendaftaran reverse proxy untuk rute admin:
    ```go
    r.Any("/v1/admin", proxyIdentity)
    r.Any("/v1/admin/*path", proxyIdentity)
    ```
  - **Hasil:** Permintaan dari `web/src/features/admin/api.ts` (`/v1/admin/users`, `/v1/admin/roles`) berhasil diteruskan ke `services/identity`.

- [x] **GW-002: Tambahkan Unit Test Routing Admin di Gateway**
  - **Berkas Target:** [`services/gateway/router/router_test.go`](file:///c:/Projects/bastion/services/gateway/router/router_test.go)
  - **Aksi:** Buat pengujian otomatis untuk memverifikasi bahwa permintaan dengan prefix `/v1/admin` diteruskan ke `identityServiceURL`.

---

### Tahap 2: Penyelarasan Format Mata Uang & Satuan Terkecil (Minor Units)
Tujuan: Mencegah selisih nilai nominal (100x) antara angka yang dimasukkan pengguna di form dengan angka yang dicatat di database keuangan.

- [x] **CU-001: Konversi Nominal Input Pengguna ke Minor Unit di Modal Transaksi**
  - **Berkas Target:** 
    - [`web/src/components/transaction/TransferModal.tsx`](file:///c:/Projects/bastion/web/src/components/transaction/TransferModal.tsx)
    - [`web/src/components/transaction/TopupModal.tsx`](file:///c:/Projects/bastion/web/src/components/transaction/TopupModal.tsx)
  - **Masalah:** Saat pengguna mengetik `50.000` Rupiah, nilai yang dikirim ke backend harus dikalikan 100 (`50000 * 100 = 5000000` sen/minor unit).
  - **Aksi:**
    - Periksa mata uang: untuk IDR/USD, kalikan input nominal dengan 100 sebelum dikirim ke `createTransfer` / `createTopup`.
    - Pastikan nilai preset tombol (Rp 50.000, Rp 100.000, dst.) dikonversi ke satuan sen yang tepat.
  - **Hasil:** Input Rp 50.000 akan tersimpan sebagai 5.000.000 sen di database, dan diformat kembali secara akurat oleh `formatCurrency()` menjadi `Rp 50.000,00`.

- [x] **CU-002: Uji Validasi Tampilan Saldo dan Riwayat**
  - **Berkas Target:** [`web/src/lib/formatters.ts`](file:///c:/Projects/bastion/web/src/lib/formatters.ts)
  - **Aksi:** Verifikasi fungsi `formatCurrency` bekerja konsisten pada seluruh komponen (Virtual Card, Saldo Utama, Daftar Transaksi, dan Struk Rincian Transaksi).

---

### Tahap 3: Penyelarasan Halaman Dasbor Utama dengan Data Riil
Tujuan: Menghapus data tiruan (*mock/dummy*) dan simulasi waktu tunda (*setTimeout*) di dasbor agar 100% menggunakan data dari backend.

- [x] **DB-001: Hubungkan Widget Mutasi Dasbor ke Data Transaksi Riil**
  - **Berkas Target:** [`web/src/pages/DashboardPage.tsx`](file:///c:/Projects/bastion/web/src/pages/DashboardPage.tsx)
  - **Aksi:** Ganti state lokal `recentActivities` dengan query `useTransactions({ limit: 5 })`.
  - **Hasil:** Transaksi terkini di dasbor langsung mencerminkan data riil dari `services/transaction`.

- [x] **DB-002: Ganti `MoneyMovementModal` dengan `TransferModal` & `TopupModal` Riil**
  - **Berkas Target:** 
    - [`web/src/pages/DashboardPage.tsx`](file:///c:/Projects/bastion/web/src/pages/DashboardPage.tsx)
    - Hapus ketergantungan pada [`web/src/components/dashboard/MoneyMovementModal.tsx`](file:///c:/Projects/bastion/web/src/components/dashboard/MoneyMovementModal.tsx).
  - **Aksi:**
    - Tombol "Kirim Uang" membuka `TransferModal`.
    - Tombol "Isi Saldo" membuka `TopupModal`.
    - Hapus variabel `simulatedOffset` (tidak ada lagi penambahan saldo palsu di memory).

- [x] **DB-003: Agregasi Metrik Arus Kas dari Transaksi Riil**
  - **Berkas Target:** [`web/src/pages/DashboardPage.tsx`](file:///c:/Projects/bastion/web/src/pages/DashboardPage.tsx)
  - **Aksi:** Hitung total uang masuk (*inflow*) dan total uang keluar (*outflow*) langsung dari daftar transaksi pengguna aktif, bukan dari angka perkiraan statis.

---

### Tahap 4: Antarmuka Peninjauan Verifikasi Identitas (KYC Admin Portal)
Tujuan: Memberikan kemampuan bagi staf kepatuhan/admin untuk melihat daftar pengajuan KYC yang sedang pending dan menyetujui atau menolak pengajuan tersebut.

- [ ] **KYC-001: Endpoint Daftar Pengajuan Pending di Backend**
  - **Berkas Target:** [`services/kyc/handler/routes.go`](file:///c:/Projects/bastion/services/kyc/handler/routes.go), [`services/kyc/service/kyc_service.go`](file:///c:/Projects/bastion/services/kyc/service/kyc_service.go)
  - **Aksi:** Tambahkan endpoint `GET /v1/kyc/pending` dengan proteksi peran `ADMIN` atau `KYC_REVIEWER`.
  - **Hasil:** Admin dapat mengambil daftar seluruh berkas KYC yang menunggu peninjauan.

- [ ] **KYC-002: Halaman Antarmuka Peninjau KYC di Frontend**
  - **Berkas Target:** Tambahkan tab atau halaman baru [`web/src/pages/AdminKYCPage.tsx`](file:///c:/Projects/bastion/web/src/pages/AdminKYCPage.tsx) atau modul peninjauan di dalam area admin.
  - **Aksi:**
    - Tabel daftar pengajuan pending: Nama, NIK, Tautan KTP, Tautan Swafoto, Waktu Pengajuan.
    - Tombol aksi: "Setujui (Approve)" dan "Tolak (Reject)" dengan modal pengisian alasan penolakan.
    - Terhubung ke `POST /v1/kyc/:id/review`.

---

### Tahap 5: Orkestrasi Mesin Akuntansi & Pemutasan Saldo Otomatis (Ledger Engine)
Tujuan: Menjalankan pemindahan dana nyata dengan prinsip double-entry buku kas dan menyelaraskan saldo dompet secara asinkron via event streaming Kafka.

- [ ] **EV-001: Worker Consumer Kafka di Ledger Service**
  - **Berkas Target:** `services/ledger/consumer/transaction_consumer.go`
  - **Aksi:**
    - Konsumsi event `TransactionCreated` dari topic `bastion.transaction.events`.
    - Buat jurnal akuntansi double-entry yang seimbang:
      - Untuk Transfer: DEBIT akun pengirim, KREDIT akun penerima.
      - Untuk Top-up: DEBIT akun kas settlement, KREDIT akun dompet nasabah.
    - Terbitkan event outbox `LedgerEntryRecorded` atau `AccountBalanceMutated`.

- [ ] **EV-002: Worker Consumer Kafka di Wallet Service (Proyeksi Saldo)**
  - **Berkas Target:** `services/wallet/consumer/ledger_consumer.go`
  - **Aksi:**
    - Dengarkan event mutasi akun dari ledger.
    - Update kolom `wallets.balance` secara atomik sesuai nilai mutasi ledger.

- [ ] **EV-003: Transisi Status Transaksi di Transaction Service**
  - **Berkas Target:** `services/transaction/consumer/ledger_consumer.go`
  - **Aksi:**
    - Jika mutasi ledger sukses $\rightarrow$ perbarui status transaksi dari `CREATED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED`.
    - Jika gagal (misal saldo tidak mencukupi) $\rightarrow$ perbarui status ke `FAILED` dengan kode alasan.

---

### Tahap 6: Infrastruktur Penyimpanan Berkas Foto (Object Storage)
Tujuan: Memungkinkan pengguna mengunggah berkas foto KTP & Swafoto asli langsung dari perangkat, bukan sekadar mengetik teks URL.

- [ ] **MED-001: Penyimpanan Berkas (S3 / MinIO / Local Blob)**
  - **Berkas Target:** `services/kyc` atau `infrastructure/minio`
  - **Aksi:** Siapkan endpoint upload berkas (`POST /v1/kyc/upload`) yang memvalidasi format (JPEG/PNG/PDF), batas ukuran (maksimal 5MB), dan menyimpan gambar secara aman.

- [ ] **MED-002: Komponen Unggah Berkas di Formulir KYC**
  - **Berkas Target:** [`web/src/components/kyc/KYCVerificationCard.tsx`](file:///c:/Projects/bastion/web/src/components/kyc/KYCVerificationCard.tsx)
  - **Aksi:** Ganti input teks URL dengan area drag-and-drop berkas foto dan pratinjau gambar (*image preview*).

---

## Urutan Eksekusi yang Disarankan

1. **Sprint 1 (Konektivitas Cepat & Perbaikan Frontend)**:
   - Tahap 1 (Rute Admin di Gateway).
   - Tahap 2 (Presisi Minor Unit Rp / Sen).
   - Tahap 3 (Pembersihan mock data di Dasbor).
2. **Sprint 2 (Fitur Kepatuhan & Tinjauan)**:
   - Tahap 4 (Portal Tinjauan KYC untuk Admin).
   - Tahap 6 (Unggah Berkas KTP Langsung).
3. **Sprint 3 (Mesin Finansial Asinkron)**:
   - Tahap 5 (Orkestrasi Event Kafka Ledger $\leftrightarrow$ Wallet $\leftrightarrow$ Transaction).
