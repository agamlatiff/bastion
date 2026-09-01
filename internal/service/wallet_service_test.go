package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/agamlatiff/bastion/internal/repository"
)

type mockLocker struct {
	lockedKeys map[string]bool
}

func newMockLocker() *mockLocker {
	return &mockLocker{lockedKeys: make(map[string]bool)}
}

func (m *mockLocker) AcquireLock(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	if m.lockedKeys[key] {
		return false, nil
	}
	m.lockedKeys[key] = true
	return true, nil
}

func (m *mockLocker) ReleaseLock(ctx context.Context, key string) error {
	delete(m.lockedKeys, key)
	return nil
}

type mockTxRepo struct {
	transactions map[string]*domain.Transaction
	txList       []*domain.Transaction
}

func newMockTxRepo() *mockTxRepo {
	return &mockTxRepo{
		transactions: make(map[string]*domain.Transaction),
		txList:       make([]*domain.Transaction, 0),
	}
}

func (m *mockTxRepo) CheckIdempotency(ctx context.Context, db repository.DBTX, idempotencyKey string) (*domain.Transaction, error) {
	if tx, ok := m.transactions[idempotencyKey]; ok {
		return tx, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockTxRepo) Insert(ctx context.Context, db repository.DBTX, tx *domain.Transaction) error {
	tx.ID = "tx_" + tx.IdempotencyKey
	tx.CreatedAt = time.Now()
	m.transactions[tx.IdempotencyKey] = tx
	m.txList = append(m.txList, tx)
	return nil
}

func (m *mockTxRepo) GetTransactionsByWalletID(ctx context.Context, db repository.DBTX, walletID string, limit int, offset int) ([]*domain.Transaction, error) {
	var result []*domain.Transaction
	for _, tx := range m.txList {
		if (tx.SenderWalletID != nil && *tx.SenderWalletID == walletID) ||
			(tx.ReceiverWalletID != nil && *tx.ReceiverWalletID == walletID) {
			result = append(result, tx)
		}
	}
	return result, nil
}

type mockLedgerRepo struct {
	entries []*domain.LedgerEntry
}

func (m *mockLedgerRepo) Insert(ctx context.Context, db repository.DBTX, entry *domain.LedgerEntry) error {
	entry.ID = "led_" + string(rune(len(m.entries)+1))
	entry.CreatedAt = time.Now()
	m.entries = append(m.entries, entry)
	return nil
}

func TestWalletService_GetBalance(t *testing.T) {
	transactor := &mockTransactor{}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	txRepo := newMockTxRepo()
	ledgerRepo := &mockLedgerRepo{}
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	locker := newMockLocker()

	svc := NewWalletService(transactor, walletRepo, txRepo, ledgerRepo, userRepo, locker)

	wallet := &domain.Wallet{
		ID:              "wal_1",
		UserID:          "usr_1",
		Balance:         500000,
		Currency:        domain.DefaultCurrency,
		MaxBalanceLimit: domain.Tier1MaxBalanceLimit,
	}
	walletRepo.wallets["usr_1"] = wallet

	t.Run("Success", func(t *testing.T) {
		res, err := svc.GetBalance(context.Background(), "usr_1")
		if err != nil {
			t.Fatalf("expected success, got error: %v", err)
		}
		if res.Balance != 500000 {
			t.Errorf("expected balance 500000, got %d", res.Balance)
		}
	})

	t.Run("Wallet Not Found", func(t *testing.T) {
		_, err := svc.GetBalance(context.Background(), "usr_unknown")
		if err == nil {
			t.Errorf("expected wallet not found error, got nil")
		}
	})
}

func TestWalletService_TopUp(t *testing.T) {
	transactor := &mockTransactor{}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	txRepo := newMockTxRepo()
	ledgerRepo := &mockLedgerRepo{}
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	locker := newMockLocker()

	svc := NewWalletService(transactor, walletRepo, txRepo, ledgerRepo, userRepo, locker)

	wallet := &domain.Wallet{
		ID:              "wal_topup_1",
		UserID:          "usr_topup_1",
		Balance:         100000,
		Currency:        domain.DefaultCurrency,
		MaxBalanceLimit: domain.Tier1MaxBalanceLimit, // 2,000,000
	}
	walletRepo.wallets["usr_topup_1"] = wallet

	t.Run("Success", func(t *testing.T) {
		req := &dto.TopUpRequest{
			Amount:         50000,
			IdempotencyKey: "idm_topup_1",
			Description:    "Top Up 50k",
		}

		tx, err := svc.TopUp(context.Background(), "usr_topup_1", req)
		if err != nil {
			t.Fatalf("expected success, got error: %v", err)
		}
		if tx.Amount != 50000 {
			t.Errorf("expected amount 50000, got %d", tx.Amount)
		}
		if tx.Status != domain.TxStatusSuccess {
			t.Errorf("expected status SUCCESS, got %s", tx.Status)
		}

		// Check new balance
		if wallet.Balance != 150000 {
			t.Errorf("expected wallet balance 150000, got %d", wallet.Balance)
		}
	})

	t.Run("Idempotency Replay", func(t *testing.T) {
		req := &dto.TopUpRequest{
			Amount:         50000,
			IdempotencyKey: "idm_topup_1",
			Description:    "Top Up 50k",
		}

		tx, err := svc.TopUp(context.Background(), "usr_topup_1", req)
		if err != nil {
			t.Fatalf("expected replay success, got error: %v", err)
		}
		if tx.Amount != 50000 {
			t.Errorf("expected amount 50000, got %d", tx.Amount)
		}

		// Balance should NOT increase again
		if wallet.Balance != 150000 {
			t.Errorf("expected wallet balance remain 150000, got %d", wallet.Balance)
		}
	})

	t.Run("Invalid Amount Zero Or Negative", func(t *testing.T) {
		req := &dto.TopUpRequest{
			Amount:         0,
			IdempotencyKey: "idm_topup_invalid",
		}
		_, err := svc.TopUp(context.Background(), "usr_topup_1", req)
		if !errors.Is(err, domain.ErrInvalidAmount) {
			t.Errorf("expected ErrInvalidAmount, got %v", err)
		}
	})

	t.Run("Exceeds Max Balance Limit", func(t *testing.T) {
		req := &dto.TopUpRequest{
			Amount:         3000000, // 3 million exceeds 2 million limit
			IdempotencyKey: "idm_topup_exceed",
		}
		_, err := svc.TopUp(context.Background(), "usr_topup_1", req)
		if !errors.Is(err, domain.ErrExceedsMaxLimit) {
			t.Errorf("expected ErrExceedsMaxLimit, got %v", err)
		}
	})
}

func TestWalletService_Transfer(t *testing.T) {
	transactor := &mockTransactor{}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	txRepo := newMockTxRepo()
	ledgerRepo := &mockLedgerRepo{}
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	locker := newMockLocker()

	svc := NewWalletService(transactor, walletRepo, txRepo, ledgerRepo, userRepo, locker)

	senderPinHash, _ := security.HashPIN("123456")
	senderUser := &domain.User{
		ID:         "usr_sender",
		Email:      "sender@bastion.com",
		PINHash:    &senderPinHash,
		Tier:       domain.Tier2,
		IsVerified: true,
	}
	receiverUser := &domain.User{
		ID:         "usr_receiver",
		Email:      "receiver@bastion.com",
		Tier:       domain.Tier1,
		IsVerified: false,
	}

	userRepo.users[senderUser.Email] = senderUser
	userRepo.users[senderUser.ID] = senderUser
	userRepo.users[receiverUser.Email] = receiverUser
	userRepo.users[receiverUser.ID] = receiverUser

	senderWallet := &domain.Wallet{
		ID:              "wal_sender",
		UserID:          "usr_sender",
		Balance:         500000,
		Currency:        domain.DefaultCurrency,
		MaxBalanceLimit: domain.Tier2MaxBalanceLimit,
	}
	receiverWallet := &domain.Wallet{
		ID:              "wal_receiver",
		UserID:          "usr_receiver",
		Balance:         100000,
		Currency:        domain.DefaultCurrency,
		MaxBalanceLimit: domain.Tier1MaxBalanceLimit,
	}

	walletRepo.wallets["usr_sender"] = senderWallet
	walletRepo.wallets["wal_sender"] = senderWallet
	walletRepo.wallets["usr_receiver"] = receiverWallet
	walletRepo.wallets["wal_receiver"] = receiverWallet

	t.Run("Success", func(t *testing.T) {
		req := &dto.TransferRequest{
			ReceiverEmail:  "receiver@bastion.com",
			Amount:         100000,
			PIN:            "123456",
			IdempotencyKey: "idm_tf_1",
			Description:    "Transfer to receiver",
		}

		tx, err := svc.Transfer(context.Background(), "usr_sender", req)
		if err != nil {
			t.Fatalf("expected success, got error: %v", err)
		}
		if tx.Type != domain.TxTypeTransfer {
			t.Errorf("expected type TRANSFER, got %s", tx.Type)
		}
		if tx.Status != domain.TxStatusSuccess {
			t.Errorf("expected status SUCCESS, got %s", tx.Status)
		}

		// Check balances
		if senderWallet.Balance != 400000 {
			t.Errorf("expected sender balance 400000, got %d", senderWallet.Balance)
		}
		if receiverWallet.Balance != 200000 {
			t.Errorf("expected receiver balance 200000, got %d", receiverWallet.Balance)
		}
	})

	t.Run("Invalid PIN Error", func(t *testing.T) {
		req := &dto.TransferRequest{
			ReceiverEmail:  "receiver@bastion.com",
			Amount:         50000,
			PIN:            "999999",
			IdempotencyKey: "idm_tf_wrong_pin",
			Description:    "Transfer wrong pin",
		}

		_, err := svc.Transfer(context.Background(), "usr_sender", req)
		if !errors.Is(err, domain.ErrInvalidPIN) {
			t.Errorf("expected ErrInvalidPIN, got %v", err)
		}
	})

	t.Run("Insufficient Balance", func(t *testing.T) {
		req := &dto.TransferRequest{
			ReceiverEmail:  "receiver@bastion.com",
			Amount:         1000000, // Sender only has 400k
			PIN:            "123456",
			IdempotencyKey: "idm_tf_insufficient",
			Description:    "Transfer too much",
		}

		_, err := svc.Transfer(context.Background(), "usr_sender", req)
		if !errors.Is(err, domain.ErrInsufficientBalance) {
			t.Errorf("expected ErrInsufficientBalance, got %v", err)
		}
	})

	t.Run("Self Transfer Rejected", func(t *testing.T) {
		req := &dto.TransferRequest{
			ReceiverEmail:  "sender@bastion.com",
			Amount:         50000,
			PIN:            "123456",
			IdempotencyKey: "idm_tf_self",
			Description:    "Self transfer",
		}

		_, err := svc.Transfer(context.Background(), "usr_sender", req)
		if !errors.Is(err, domain.ErrSelfTransfer) {
			t.Errorf("expected ErrSelfTransfer, got %v", err)
		}
	})

	t.Run("Unverified Sender KYC Required", func(t *testing.T) {
		unverifiedUser := &domain.User{
			ID:         "usr_unverified",
			Email:      "unverified@bastion.com",
			PINHash:    &senderPinHash,
			Tier:       domain.Tier1,
			IsVerified: false,
		}
		userRepo.users[unverifiedUser.Email] = unverifiedUser
		userRepo.users[unverifiedUser.ID] = unverifiedUser

		req := &dto.TransferRequest{
			ReceiverEmail:  "receiver@bastion.com",
			Amount:         50000,
			PIN:            "123456",
			IdempotencyKey: "idm_tf_unverified",
			Description:    "Transfer from unverified",
		}

		_, err := svc.Transfer(context.Background(), "usr_unverified", req)
		if !errors.Is(err, domain.ErrKYCRequired) {
			t.Errorf("expected ErrKYCRequired, got %v", err)
		}
	})
}
