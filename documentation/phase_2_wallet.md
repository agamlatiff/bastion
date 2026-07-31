# 🔵 Phase 2 — Wallet & Transactions
**Timeline**: Week 3–4 | ACID, Race Conditions, Idempotency, Double-Entry Ledger

---

## Goal
Build the financial core of Bastion: wallet balance management and peer-to-peer money transfers — with real-world safety guarantees. This is where most junior developers fail interviews. You'll learn to solve the hard problems.

---

## What You'll Learn

| Concept | Where |
|---|---|
| Database transactions (ACID) | `service/wallet_service.go` |
| Row-level locking (SELECT FOR UPDATE) | `repository/wallet_repository.go` |
| Race conditions — what and how to prevent | `service/wallet_service.go` |
| Idempotency keys (Redis) | `service/wallet_service.go` |
| Double-entry bookkeeping | `repository/transaction_repository.go` |
| Why never use float for money | `domain/wallet.go` |
| SQL pagination (LIMIT + OFFSET) | `repository/transaction_repository.go` |

---

## Core Engineering Problems You'll Solve

### Problem 1 — Race Condition (Concurrent Transfers)

```
Scenario: Alice has Rp100,000. Two requests simultaneously try to deduct Rp80,000.

❌ WITHOUT row locking:
  Request A reads balance: 100,000
  Request B reads balance: 100,000   ← reads stale data!
  Request A writes balance: 20,000
  Request B writes balance: 20,000   ← Alice "spent" Rp160,000 from Rp100,000!

✅ WITH SELECT FOR UPDATE:
  Request A locks Alice's row: FOR UPDATE
  Request B tries to lock Alice's row → BLOCKED (waits)
  Request A deducts, commits → Alice has Rp20,000
  Request B now gets lock → reads Rp20,000
  Request B tries to deduct Rp80,000 → INSUFFICIENT BALANCE error ✅
```

### Problem 2 — Duplicate Request (Network Retry)

```
Scenario: User taps "Send" button. Network timeout. App retries.
          Server actually received the first request and processed it.
          Now the same payment processes twice.

❌ WITHOUT idempotency:
  Request 1: transfer Rp50,000 → SUCCESS, balance: Rp50,000
  Request 2: transfer Rp50,000 → SUCCESS, balance: Rp0      ← double charged!

✅ WITH idempotency key:
  Request 1: idempotency_key="pay-001" → not in Redis → process → SUCCESS
             store "pay-001" in Redis with response (TTL: 24h)
  Request 2: idempotency_key="pay-001" → found in Redis → return cached response
             NO second deduction. Balance stays at Rp50,000 ✅
```

### Problem 3 — Partial Failure (System Crash Mid-Transaction)

```
Scenario: Server crashes after deducting Alice but before crediting Bob.

❌ WITHOUT database transaction:
  UPDATE wallets SET balance = 50000 WHERE id = alice  → done
  [SERVER CRASHES HERE]
  UPDATE wallets SET balance = 100000 WHERE id = bob   → never runs!
  Result: Rp50,000 vanished from the system!

✅ WITH database transaction:
  BEGIN;
    UPDATE wallets SET balance = 50000  WHERE id = alice;
    UPDATE wallets SET balance = 100000 WHERE id = bob;
  COMMIT;  ← either BOTH happen, or NEITHER happen
  If server crashes mid-transaction → PostgreSQL ROLLS BACK automatically ✅
```

---

## Database Migration

### infra/postgres/migrations/002_transactions.sql
```sql
CREATE TABLE IF NOT EXISTS transactions (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key    VARCHAR(255) UNIQUE NOT NULL,
    sender_wallet_id   UUID        REFERENCES wallets(id),
    receiver_wallet_id UUID        REFERENCES wallets(id),
    amount             BIGINT      NOT NULL,
    type               VARCHAR(50) NOT NULL,
    status             VARCHAR(50) NOT NULL DEFAULT 'pending',
    description        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender
    ON transactions(sender_wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_receiver
    ON transactions(receiver_wallet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID        NOT NULL REFERENCES transactions(id),
    wallet_id      UUID        NOT NULL REFERENCES wallets(id),
    entry_type     VARCHAR(10) NOT NULL,
    amount         BIGINT      NOT NULL,
    balance_after  BIGINT      NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet
    ON ledger_entries(wallet_id, created_at DESC);
```

---

## Domain Types

### services/auth/internal/domain/wallet.go
```go
package domain

import "time"

type Transaction struct {
    ID                string    `json:"id"`
    IdempotencyKey    string    `json:"idempotency_key"`
    SenderWalletID    *string   `json:"sender_wallet_id"`
    ReceiverWalletID  *string   `json:"receiver_wallet_id"`
    Amount            int64     `json:"amount"`
    Type              string    `json:"type"`
    Status            string    `json:"status"`
    Description       string    `json:"description"`
    CreatedAt         time.Time `json:"created_at"`
}

type LedgerEntry struct {
    ID            string    `json:"id"`
    TransactionID string    `json:"transaction_id"`
    WalletID      string    `json:"wallet_id"`
    EntryType     string    `json:"entry_type"`  // "debit" | "credit"
    Amount        int64     `json:"amount"`
    BalanceAfter  int64     `json:"balance_after"`
    CreatedAt     time.Time `json:"created_at"`
}

type TopUpRequest struct {
    Amount         int64  `json:"amount"          binding:"required,min=1000"`
    IdempotencyKey string `json:"idempotency_key" binding:"required"`
}

type TransferRequest struct {
    ReceiverEmail  string `json:"receiver_email"  binding:"required,email"`
    Amount         int64  `json:"amount"          binding:"required,min=1000"`
    Description    string `json:"description"`
    IdempotencyKey string `json:"idempotency_key" binding:"required"`
}

type TransactionListRequest struct {
    Page  int    `form:"page"  binding:"min=1"`
    Limit int    `form:"limit" binding:"min=1,max=100"`
    Type  string `form:"type"`
}
```

---

## Repository Layer

### services/auth/internal/repository/wallet_repository.go
```go
package repository

import (
    "context"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/yourusername/bastion/services/auth/internal/domain"
)

type WalletRepository interface {
    GetByUserID(ctx context.Context, userID string) (*domain.Wallet, error)
    GetByIDForUpdate(ctx context.Context, tx pgx.Tx, walletID string) (*domain.Wallet, error)
    UpdateBalance(ctx context.Context, tx pgx.Tx, walletID string, newBalance int64) error
}

type walletRepository struct {
    db *pgxpool.Pool
}

func NewWallet(db *pgxpool.Pool) WalletRepository {
    return &walletRepository{db: db}
}

func (r *walletRepository) GetByUserID(ctx context.Context, userID string) (*domain.Wallet, error) {
    query := `SELECT id, user_id, balance, currency, created_at FROM wallets WHERE user_id = $1`
    w := &domain.Wallet{}
    err := r.db.QueryRow(ctx, query, userID).Scan(&w.ID, &w.UserID, &w.Balance, &w.Currency, &w.CreatedAt)
    return w, err
}

// GetByIDForUpdate locks the row for the duration of the transaction (prevents race conditions)
func (r *walletRepository) GetByIDForUpdate(ctx context.Context, tx pgx.Tx, walletID string) (*domain.Wallet, error) {
    query := `SELECT id, user_id, balance, currency, created_at FROM wallets WHERE id = $1 FOR UPDATE`
    w := &domain.Wallet{}
    err := tx.QueryRow(ctx, query, walletID).Scan(&w.ID, &w.UserID, &w.Balance, &w.Currency, &w.CreatedAt)
    return w, err
}

func (r *walletRepository) UpdateBalance(ctx context.Context, tx pgx.Tx, walletID string, newBalance int64) error {
    query := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
    _, err := tx.Exec(ctx, query, newBalance, walletID)
    return err
}
```

### services/auth/internal/repository/transaction_repository.go
```go
package repository

import (
    "context"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/yourusername/bastion/services/auth/internal/domain"
)

type TransactionRepository interface {
    Create(ctx context.Context, tx pgx.Tx, t *domain.Transaction) error
    CreateLedgerEntry(ctx context.Context, tx pgx.Tx, entry *domain.LedgerEntry) error
    GetByID(ctx context.Context, id string) (*domain.Transaction, error)
    ListByWalletID(ctx context.Context, walletID string, page, limit int) ([]*domain.Transaction, int, error)
    BeginTx(ctx context.Context) (pgx.Tx, error)
}

type transactionRepository struct {
    db *pgxpool.Pool
}

func NewTransaction(db *pgxpool.Pool) TransactionRepository {
    return &transactionRepository{db: db}
}

func (r *transactionRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
    return r.db.Begin(ctx)
}

func (r *transactionRepository) Create(ctx context.Context, tx pgx.Tx, t *domain.Transaction) error {
    query := `
        INSERT INTO transactions (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, type, status, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
    `
    return tx.QueryRow(ctx, query,
        t.IdempotencyKey, t.SenderWalletID, t.ReceiverWalletID,
        t.Amount, t.Type, t.Status, t.Description,
    ).Scan(&t.ID, &t.CreatedAt)
}

func (r *transactionRepository) CreateLedgerEntry(ctx context.Context, tx pgx.Tx, e *domain.LedgerEntry) error {
    query := `
        INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
        VALUES ($1, $2, $3, $4, $5)
    `
    _, err := tx.Exec(ctx, query, e.TransactionID, e.WalletID, e.EntryType, e.Amount, e.BalanceAfter)
    return err
}

func (r *transactionRepository) GetByID(ctx context.Context, id string) (*domain.Transaction, error) {
    query := `
        SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, type, status, description, created_at
        FROM transactions WHERE id = $1
    `
    t := &domain.Transaction{}
    err := r.db.QueryRow(ctx, query, id).Scan(
        &t.ID, &t.IdempotencyKey, &t.SenderWalletID, &t.ReceiverWalletID,
        &t.Amount, &t.Type, &t.Status, &t.Description, &t.CreatedAt,
    )
    return t, err
}

func (r *transactionRepository) ListByWalletID(ctx context.Context, walletID string, page, limit int) ([]*domain.Transaction, int, error) {
    offset := (page - 1) * limit

    var total int
    countQuery := `SELECT COUNT(*) FROM transactions WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1`
    r.db.QueryRow(ctx, countQuery, walletID).Scan(&total)

    query := `
        SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, type, status, description, created_at
        FROM transactions
        WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    `
    rows, err := r.db.Query(ctx, query, walletID, limit, offset)
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()

    var transactions []*domain.Transaction
    for rows.Next() {
        t := &domain.Transaction{}
        err := rows.Scan(&t.ID, &t.IdempotencyKey, &t.SenderWalletID, &t.ReceiverWalletID,
            &t.Amount, &t.Type, &t.Status, &t.Description, &t.CreatedAt)
        if err != nil {
            return nil, 0, err
        }
        transactions = append(transactions, t)
    }
    return transactions, total, nil
}
```

---

## Service Layer

### services/auth/internal/service/wallet_service.go
```go
package service

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
    "github.com/yourusername/bastion/services/auth/internal/domain"
    "github.com/yourusername/bastion/services/auth/internal/repository"
)

var (
    ErrInsufficientBalance = errors.New("insufficient balance")
    ErrSelfTransfer        = errors.New("cannot transfer to yourself")
    ErrReceiverNotFound    = errors.New("receiver not found")
)

type WalletService interface {
    GetWallet(ctx context.Context, userID string) (*domain.Wallet, error)
    TopUp(ctx context.Context, userID string, req domain.TopUpRequest) (*domain.Transaction, error)
    Transfer(ctx context.Context, senderUserID string, req domain.TransferRequest) (*domain.Transaction, error)
    ListTransactions(ctx context.Context, userID string, page, limit int) ([]*domain.Transaction, int, error)
    GetTransaction(ctx context.Context, id string) (*domain.Transaction, error)
}

type walletService struct {
    walletRepo  repository.WalletRepository
    txRepo      repository.TransactionRepository
    userRepo    repository.UserRepository
    redis       *redis.Client
}

func NewWallet(walletRepo repository.WalletRepository, txRepo repository.TransactionRepository,
    userRepo repository.UserRepository, rdb *redis.Client) WalletService {
    return &walletService{walletRepo: walletRepo, txRepo: txRepo, userRepo: userRepo, redis: rdb}
}

func (s *walletService) GetWallet(ctx context.Context, userID string) (*domain.Wallet, error) {
    return s.walletRepo.GetByUserID(ctx, userID)
}

func (s *walletService) TopUp(ctx context.Context, userID string, req domain.TopUpRequest) (*domain.Transaction, error) {
    // Check idempotency
    if cached, err := s.redis.Get(ctx, "idempotency:"+req.IdempotencyKey).Result(); err == nil {
        var tx domain.Transaction
        json.Unmarshal([]byte(cached), &tx)
        return &tx, nil
    }

    wallet, err := s.walletRepo.GetByUserID(ctx, userID)
    if err != nil {
        return nil, fmt.Errorf("wallet not found: %w", err)
    }

    // Begin database transaction
    dbTx, err := s.txRepo.BeginTx(ctx)
    if err != nil {
        return nil, fmt.Errorf("begin transaction: %w", err)
    }
    defer dbTx.Rollback(ctx) // no-op if committed

    // Lock wallet row
    lockedWallet, err := s.walletRepo.GetByIDForUpdate(ctx, dbTx, wallet.ID)
    if err != nil {
        return nil, fmt.Errorf("locking wallet: %w", err)
    }

    newBalance := lockedWallet.Balance + req.Amount

    // Update balance
    if err := s.walletRepo.UpdateBalance(ctx, dbTx, wallet.ID, newBalance); err != nil {
        return nil, fmt.Errorf("updating balance: %w", err)
    }

    // Record transaction
    receiverID := wallet.ID
    tx := &domain.Transaction{
        IdempotencyKey:   req.IdempotencyKey,
        ReceiverWalletID: &receiverID,
        Amount:           req.Amount,
        Type:             "topup",
        Status:           "success",
        Description:      "Wallet top-up",
    }
    if err := s.txRepo.Create(ctx, dbTx, tx); err != nil {
        return nil, fmt.Errorf("creating transaction: %w", err)
    }

    // Record ledger entry
    entry := &domain.LedgerEntry{
        TransactionID: tx.ID,
        WalletID:      wallet.ID,
        EntryType:     "credit",
        Amount:        req.Amount,
        BalanceAfter:  newBalance,
    }
    if err := s.txRepo.CreateLedgerEntry(ctx, dbTx, entry); err != nil {
        return nil, fmt.Errorf("creating ledger entry: %w", err)
    }

    if err := dbTx.Commit(ctx); err != nil {
        return nil, fmt.Errorf("committing transaction: %w", err)
    }

    // Cache idempotency key
    cached, _ := json.Marshal(tx)
    s.redis.Set(ctx, "idempotency:"+req.IdempotencyKey, cached, 24*time.Hour)

    return tx, nil
}

func (s *walletService) Transfer(ctx context.Context, senderUserID string, req domain.TransferRequest) (*domain.Transaction, error) {
    // Check idempotency
    if cached, err := s.redis.Get(ctx, "idempotency:"+req.IdempotencyKey).Result(); err == nil {
        var tx domain.Transaction
        json.Unmarshal([]byte(cached), &tx)
        return &tx, nil
    }

    // Get receiver
    receiver, err := s.userRepo.FindByEmail(ctx, req.ReceiverEmail)
    if err != nil {
        return nil, ErrReceiverNotFound
    }
    if receiver.ID == senderUserID {
        return nil, ErrSelfTransfer
    }

    // Get sender and receiver wallets
    senderWallet, err := s.walletRepo.GetByUserID(ctx, senderUserID)
    if err != nil {
        return nil, fmt.Errorf("sender wallet not found: %w", err)
    }
    receiverWallet, err := s.walletRepo.GetByUserID(ctx, receiver.ID)
    if err != nil {
        return nil, fmt.Errorf("receiver wallet not found: %w", err)
    }

    // Begin DB transaction
    dbTx, err := s.txRepo.BeginTx(ctx)
    if err != nil {
        return nil, fmt.Errorf("begin transaction: %w", err)
    }
    defer dbTx.Rollback(ctx)

    // Lock BOTH wallets (consistent order prevents deadlock: always lock lower ID first)
    firstID, secondID := senderWallet.ID, receiverWallet.ID
    if firstID > secondID {
        firstID, secondID = secondID, firstID
    }
    lockedFirst, _ := s.walletRepo.GetByIDForUpdate(ctx, dbTx, firstID)
    lockedSecond, _ := s.walletRepo.GetByIDForUpdate(ctx, dbTx, secondID)

    // Re-map to sender/receiver
    var lockedSender, lockedReceiver *domain.Wallet
    if lockedFirst.ID == senderWallet.ID {
        lockedSender, lockedReceiver = lockedFirst, lockedSecond
    } else {
        lockedSender, lockedReceiver = lockedSecond, lockedFirst
    }

    // Check balance
    if lockedSender.Balance < req.Amount {
        return nil, ErrInsufficientBalance
    }

    senderNewBalance := lockedSender.Balance - req.Amount
    receiverNewBalance := lockedReceiver.Balance + req.Amount

    // Update both balances
    s.walletRepo.UpdateBalance(ctx, dbTx, senderWallet.ID, senderNewBalance)
    s.walletRepo.UpdateBalance(ctx, dbTx, receiverWallet.ID, receiverNewBalance)

    // Record transaction
    tx := &domain.Transaction{
        IdempotencyKey:   req.IdempotencyKey,
        SenderWalletID:   &senderWallet.ID,
        ReceiverWalletID: &receiverWallet.ID,
        Amount:           req.Amount,
        Type:             "transfer",
        Status:           "success",
        Description:      req.Description,
    }
    s.txRepo.Create(ctx, dbTx, tx)

    // Record ledger entries (debit sender, credit receiver)
    s.txRepo.CreateLedgerEntry(ctx, dbTx, &domain.LedgerEntry{
        TransactionID: tx.ID, WalletID: senderWallet.ID,
        EntryType: "debit", Amount: req.Amount, BalanceAfter: senderNewBalance,
    })
    s.txRepo.CreateLedgerEntry(ctx, dbTx, &domain.LedgerEntry{
        TransactionID: tx.ID, WalletID: receiverWallet.ID,
        EntryType: "credit", Amount: req.Amount, BalanceAfter: receiverNewBalance,
    })

    if err := dbTx.Commit(ctx); err != nil {
        return nil, fmt.Errorf("committing transaction: %w", err)
    }

    // Cache idempotency key
    cached, _ := json.Marshal(tx)
    s.redis.Set(ctx, "idempotency:"+req.IdempotencyKey, cached, 24*time.Hour)

    return tx, nil
}

func (s *walletService) ListTransactions(ctx context.Context, userID string, page, limit int) ([]*domain.Transaction, int, error) {
    wallet, err := s.walletRepo.GetByUserID(ctx, userID)
    if err != nil {
        return nil, 0, err
    }
    return s.txRepo.ListByWalletID(ctx, wallet.ID, page, limit)
}

func (s *walletService) GetTransaction(ctx context.Context, id string) (*domain.Transaction, error) {
    return s.txRepo.GetByID(ctx, id)
}
```

---

## Done Checklist

```
[ ] 002_transactions.sql created (transactions + ledger tables)
[ ] docker-compose down && docker-compose up -d (to apply new migration)
[ ] domain/wallet.go created
[ ] repository/wallet_repository.go created
[ ] repository/transaction_repository.go created
[ ] service/wallet_service.go created
[ ] handler/wallet_handler.go created
[ ] handler/transaction_handler.go created
[ ] Routes added in main.go
[ ] GET /wallet returns balance
[ ] POST /wallet/topup adds balance
[ ] POST /transactions/transfer moves money
[ ] GET /transactions returns paginated list
[ ] GET /transactions/:id returns single tx
[ ] Duplicate idempotency_key returns same response (no double-charge)
[ ] Insufficient balance returns 422
[ ] Transfer to self returns 422
[ ] Transfer to unknown email returns 404
[ ] Ledger has 2 entries per transfer (debit + credit)
```

When every box is ticked → move to [Phase 3 →](./phase_3_grpc.md)
