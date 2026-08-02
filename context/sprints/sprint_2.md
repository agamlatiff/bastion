# 🏃 Sprint 2 — Financial Core & Concurrency (Wallet Service)

> **Module**: Phase 2 — Wallet, Transactions, & KYC
> **Timeline**: Week 3–4 (14 Days)
> **Goal**: Build the core financial engine handling Virtual Accounts, KYC Tiering, ACID P2P Transfers with Deadlock Prevention, Double-Entry Ledgers, and Idempotency.

---

## 🎯 Sprint Goal

Extend the application to handle money safely. By the end of this sprint, a user can submit KYC to upgrade their tier, generate a Virtual Account, receive simulated top-up callbacks, and transfer money to other users. All financial mutations must be ACID-compliant, avoid deadlocks, generate double-entry ledger records, and emit outbox events.

---

## 📋 Detailed Task Breakdown

---

### Task 1: Database Migration Update (Full Schema)

**File**: `infra/postgres/migrations/002_financial_core.sql`

**SQL to execute**:
Ensure these tables are fully defined with their constraints:
1. `kyc_verifications`: `id`, `user_id` (FK), `id_card_number` (UNIQUE), `id_card_image_url`, `selfie_image_url`, `status` (DEFAULT 'pending'), `submitted_at`, `verified_at`.
2. `virtual_accounts`: `id`, `user_id` (FK), `bank_code`, `va_number` (UNIQUE), `is_active`, `expires_at`, `created_at`.
3. `transactions`: `id`, `idempotency_key` (UNIQUE), `sender_wallet_id`, `receiver_wallet_id`, `amount` (CHECK > 0), `fee_amount` (CHECK >= 0), `type`, `status`, `created_at`.
4. `ledger_entries`: `id`, `transaction_id` (FK), `wallet_id` (FK), `entry_type`, `amount`, `balance_after`, `created_at`.
5. `outbox_events`: `id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload` (JSONB), `status` (DEFAULT 'pending'), `created_at`.

**Definition of Done**:
- [ ] Migration runs successfully.
- [ ] Tables exist in `bastion_db`.

---

### Task 2: Domain Layer (Structs & DTOs)

**File**: `services/wallet/internal/domain/wallet.go`, `transaction.go`, `kyc.go`

**Structs to define**:

| Struct | Fields | Validation / Tags |
|---|---|---|
| `VirtualAccount` | `ID`, `UserID`, `BankCode`, `VANumber`, `IsActive`, `CreatedAt` | JSON tags |
| `Transaction` | `ID`, `IdempotencyKey`, `SenderWalletID`, `ReceiverWalletID`, `Amount`, `FeeAmount`, `Type`, `Status`, `CreatedAt` | `Amount` is `int64` |
| `LedgerEntry` | `ID`, `TransactionID`, `WalletID`, `EntryType` ("debit"/"credit"), `Amount`, `BalanceAfter`, `CreatedAt` | `BalanceAfter` is `int64` |
| `OutboxEvent` | `ID`, `AggregateType`, `AggregateID`, `EventType`, `Payload` (JSON/String), `Status` | |
| `SubmitKYCReq` | `IDCardNumber`, `IDCardImageURL`, `SelfieImageURL` | `binding:"required,len=16"` for KTP |
| `GenerateVAReq` | `BankCode` | `binding:"required,oneof=BCA MANDIRI BRI"` |
| `TopUpCallbackReq`| `VANumber`, `Amount` | `binding:"required"`, `binding:"required,min=10000"` |
| `TransferReq` | `ReceiverEmail`, `Amount`, `Description` | `binding:"required,email"`, `binding:"required,min=10000"` |

**Definition of Done**:
- [ ] All structs and DTOs defined with proper Gin validation tags (`binding`).

---

### Task 3: Repository Layer (The Data Access & Locks)

**Package**: `repository`

**Key SQL Queries to Implement**:

| Method | SQL Query / Logic | Notes |
|---|---|---|
| `GetWalletForUpdate` | `SELECT id, user_id, balance, max_balance_limit FROM wallets WHERE id = $1 FOR UPDATE` | **CRITICAL**: Requires `pgx.Tx` to hold the lock until commit/rollback. |
| `UpdateBalance` | `UPDATE wallets SET balance = $1 WHERE id = $2` | Requires `pgx.Tx`. |
| `InsertLedgerEntry`| `INSERT INTO ledger_entries (...) VALUES (...)` | Requires `pgx.Tx`. |
| `InsertOutboxEvent`| `INSERT INTO outbox_events (..., payload, ...) VALUES (..., $5, ...)` | Requires `pgx.Tx`. |
| `UpdateUserTier` | `UPDATE users SET tier = $1 WHERE id = $2` | Used for KYC Approval. |
| `UpdateWalletLimit`| `UPDATE wallets SET max_balance_limit = $1 WHERE user_id = $2` | Used for KYC Approval. |

**Definition of Done**:
- [ ] All mutations use `pgx.Tx` to guarantee ACID compliance.
- [ ] Parameterized queries used everywhere.

---

### Task 4: KYC Logic Flow

**Package**: `service`

**`SubmitKYC(ctx, req, userID)`**:
1. Check if user already has pending/approved KYC.
2. Insert into `kyc_verifications` with status `pending`.

**`ApproveKYC(ctx, kycID)` (Run in DB Transaction)**:
1. Update `kyc_verifications` status to `approved`.
2. `repo.UpdateUserTier(tx, userID, "tier_2")`.
3. `repo.UpdateWalletLimit(tx, userID, 20000000)`. // 20 Juta
4. Commit.

---

### Task 5: Wallet Top-Up Webhook Logic

**Package**: `service`

**`ProcessBankCallback(ctx, req TopUpCallbackReq)`**:
1. Find VA by `req.VANumber`. If not found, return `404`.
2. Start DB Transaction `tx`.
3. **Lock Wallet**: `repo.GetWalletForUpdate(tx, va.UserID)`.
4. **Limit Check**: `if wallet.Balance + req.Amount > wallet.MaxBalanceLimit` → return `422` (Exceeds limit).
5. **Mutate**: `newBalance = wallet.Balance + req.Amount`. Update wallet.
6. **Audit**: 
   - `InsertTransaction(tx, type: "topup", amount: req.Amount)`
   - `InsertLedgerEntry(tx, type: "credit", amount: req.Amount, balanceAfter: newBalance)`
   - `InsertOutboxEvent(tx, eventType: "TOPUP_SUCCESS", payload: {...})`
7. Commit `tx`.

---

### Task 6: P2P Transfer (Deadlock-Free Engine)

**Package**: `service`

**`Transfer(ctx, req, senderID, idempotencyKey)`**:
1. **Idempotency**: `redis.Get("idempotency:" + idempotencyKey)`. If exists, return early with `200 OK`.
2. Fetch Sender User & Wallet.
3. **Tier Gate**: `if senderUser.Tier == "tier_1"` → return `403 Forbidden`.
4. Fetch Receiver User (by `req.ReceiverEmail`) & Wallet.
5. Start DB Transaction `tx`.
6. **Deadlock Prevention (Ascending Sort)**:
   ```go
   firstLock, secondLock := senderWallet.ID, receiverWallet.ID
   if firstLock > secondLock { firstLock, secondLock = secondLock, firstLock }
   repo.GetWalletForUpdate(tx, firstLock)
   repo.GetWalletForUpdate(tx, secondLock)
   ```
7. **Balance Checks**:
   - `if senderWallet.Balance < req.Amount` → return `422` (Insufficient funds).
   - `if receiverWallet.Balance + req.Amount > receiver.MaxBalanceLimit` → return `422` (Receiver limit hit).
8. **Mutate**: Deduct sender balance, add receiver balance.
9. **Audit Trail**:
   - `InsertTransaction`
   - `InsertLedgerEntry` (Debit for Sender, BalanceAfter)
   - `InsertLedgerEntry` (Credit for Receiver, BalanceAfter)
   - `InsertOutboxEvent(TRANSFER_SUCCESS)`
10. Commit `tx`.
11. **Cache Result**: `redis.Set("idempotency:" + idempotencyKey, successResponse, 24h)`.

---

### Task 7: HTTP Handlers & Router

**Package**: `handler`

**Routes**:
| Route | Middleware | HTTP Code | Notes |
|---|---|---|---|
| `POST /api/v1/kyc/submit` | `Auth` | `201` | Returns created KYC ID |
| `POST /api/v1/admin/kyc/:id/approve` | `AdminAuth` | `200` | Upgrades limit to 20 Juta |
| `POST /api/v1/wallet/virtual-account`| `Auth` | `201` | Generate VA |
| `POST /api/v1/webhooks/bank-callback`| None (Public)| `200` | Triggered by Bank |
| `POST /api/v1/transactions/transfer` | `Auth` | `200` | Requires `Idempotency-Key` header |
| `GET /api/v1/transactions` | `Auth` | `200` | Supports `?page=1&limit=20` |

---

## 🧪 Sprint Acceptance Test Suite (curl)

**1. Generate Virtual Account**
```bash
curl -X POST http://localhost:8080/api/v1/wallet/virtual-account \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"bank_code":"BCA"}'
```
*(Copy the generated `va_number`)*

**2. Simulate Bank Top-Up Callback (Rp 5.000.000)** - *Will fail for Tier 1*
```bash
curl -X POST http://localhost:8080/api/v1/webhooks/bank-callback \
  -H "Content-Type: application/json" \
  -d '{"va_number":"<VA_NUMBER>", "amount":5000000}'
```
*Expected*: `422 Unprocessable Entity` (Because Tier 1 max limit is 2.000.000).

**3. Submit KYC**
```bash
curl -X POST http://localhost:8080/api/v1/kyc/submit \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"id_card_number":"1234567890123456", "id_card_image_url":"...", "selfie_image_url":"..."}'
```

**4. Approve KYC (Admin)**
```bash
curl -X POST http://localhost:8080/api/v1/admin/kyc/<KYC_ID>/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**5. Retry Bank Top-Up (Rp 5.000.000)**
*Expected*: `200 OK` (Because Tier 2 limit is 20.000.000).

**6. Transfer P2P (Rp 1.000.000)**
```bash
curl -X POST http://localhost:8080/api/v1/transactions/transfer \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: tx-12345" \
  -H "Content-Type: application/json" \
  -d '{"receiver_email":"friend@example.com", "amount":1000000, "description":"Lunch"}'
```
*Expected*: `200 OK`. Ledger entries created.

**7. Test Idempotency**
Run the EXACT SAME curl command from Step 6 again.
*Expected*: `200 OK` instantly. Check balance → **Money should NOT be deducted twice**.
