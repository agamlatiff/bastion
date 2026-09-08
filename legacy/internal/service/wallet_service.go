package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/agamlatiff/bastion/internal/repository"
)

type WalletService interface {
	GetBalance(ctx context.Context, userID string) (*dto.WalletBalanceResponse, error)
	TopUp(ctx context.Context, userID string, req *dto.TopUpRequest) (*domain.Transaction, error)
	Transfer(ctx context.Context, senderUserID string, req *dto.TransferRequest) (*domain.Transaction, error)
	GetTransaction(ctx context.Context, userID string, limit int, offset int) ([]*domain.Transaction, error)
}

type walletService struct {
	transactor repository.Transactor
	walletRepo repository.WalletRepository
	txRepo     repository.TransactionRepository
	ledgerRepo repository.LedgerRepository
	userRepo   repository.UserRepository
	locker     repository.Locker
}

func NewWalletService(
	transactor repository.Transactor,
	walletRepo repository.WalletRepository,
	txRepo repository.TransactionRepository,
	ledgerRepo repository.LedgerRepository,
	userRepo repository.UserRepository,
	locker repository.Locker,
) WalletService {
	return &walletService{
		transactor: transactor,
		walletRepo: walletRepo,
		txRepo:     txRepo,
		ledgerRepo: ledgerRepo,
		userRepo:   userRepo,
		locker:     locker,
	}
}

func (s *walletService) GetBalance(ctx context.Context, userID string) (*dto.WalletBalanceResponse, error) {
	// Step 1: Query wallet record for user
	wallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return nil, err
	}

	// Step 2: Return formatted wallet balance response DTO
	return dto.ToWalletBalanceResponse(wallet), nil
}

func (s *walletService) TopUp(ctx context.Context, userID string, req *dto.TopUpRequest) (*domain.Transaction, error) {
	// Step 1: Validate top up amount is strictly positive
	if req.Amount <= 0 {
		return nil, domain.ErrInvalidAmount
	}

	// Step 2: Fetch user's wallet
	wallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return nil, err
	}

	// Step 3: Acquire distributed lock to prevent concurrent duplicate top-up requests
	fullIdmKey := fmt.Sprintf("idempotency:%s:topup:%s", userID, req.IdempotencyKey)
	locked, err := s.locker.AcquireLock(ctx, fullIdmKey, 5*time.Second)
	if err != nil {
		return nil, err
	}
	if !locked {
		return nil, domain.ErrConcurrentRequest
	}
	defer s.locker.ReleaseLock(ctx, fullIdmKey)

	// Step 4: Set default description fallback
	desc := req.Description
	if desc == "" {
		desc = "Top Up Balance"
	}

	// Step 5: Execute atomic database transaction (Lock row -> Validate limit -> Update balance -> Insert Tx -> Insert Ledger)
	var result *domain.Transaction
	err = s.transactor.WithTx(ctx, func(db repository.DBTX) error {
		// 5a. Idempotency Check: Return existing transaction if already processed
		existing, idmErr := s.txRepo.CheckIdempotency(ctx, db, fullIdmKey)
		if idmErr == nil {
			result = existing
			return nil
		}

		// 5b. Lock the wallet row with `SELECT ... FOR UPDATE`
		currentBalance, maxLimit, lockErr := s.walletRepo.GetBalanceForUpdate(ctx, db, wallet.ID)
		if lockErr != nil {
			return lockErr
		}

		// 5c. Validate new balance does not exceed the wallet limit
		newBalance := currentBalance + req.Amount
		if newBalance > maxLimit {
			return domain.ErrExceedsMaxLimit
		}

		// 5d. Update wallet balance
		if updateErr := s.walletRepo.UpdateBalance(ctx, db, wallet.ID, newBalance); updateErr != nil {
			return updateErr
		}

		// 5e. Insert transaction record
		tx := &domain.Transaction{
			IdempotencyKey:   fullIdmKey,
			ReceiverWalletID: &wallet.ID,
			Amount:           req.Amount,
			FeeAmount:        0,
			Type:             domain.TxTypeTopUp,
			Status:           domain.TxStatusSuccess,
			Description:      desc,
		}
		if insertErr := s.txRepo.Insert(ctx, db, tx); insertErr != nil {
			return insertErr
		}

		// 5f. Insert double-entry CREDIT ledger entry
		entry := &domain.LedgerEntry{
			TransactionID: tx.ID,
			WalletID:      wallet.ID,
			EntryType:     domain.EntryTypeCredit,
			Amount:        req.Amount,
			BalanceAfter:  newBalance,
		}
		if ledgerErr := s.ledgerRepo.Insert(ctx, db, entry); ledgerErr != nil {
			return ledgerErr
		}

		result = tx
		return nil
	})

	return result, err
}

func (s *walletService) Transfer(ctx context.Context, senderUserID string, req *dto.TransferRequest) (*domain.Transaction, error) {
	// Step 1: Validate transfer amount is strictly positive
	if req.Amount <= 0 {
		return nil, domain.ErrInvalidAmount
	}

	// Step 2: Validate sender exists and is KYC verified (Tier 2 requirement)
	senderUser, err := s.userRepo.FindByID(ctx, s.transactor.DB(), senderUserID)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, domain.ErrUserNotFound
		}
		return nil, err
	}
	if !senderUser.IsVerified {
		return nil, domain.ErrKYCRequired
	}

	// Step 3: Verify sender's transaction PIN
	if senderUser.PINHash == nil || *senderUser.PINHash == "" {
		return nil, domain.ErrPINNotSet
	}
	if err := security.ComparePIN(*senderUser.PINHash, req.PIN); err != nil {
		return nil, domain.ErrInvalidPIN
	}

	// Step 4: Fetch sender's wallet
	senderWallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.DB(), senderUserID)
	if err != nil {
		return nil, err
	}

	// Step 5: Validate receiver exists and is not the sender themselves
	receiverUser, err := s.userRepo.FindByEmail(ctx, s.transactor.DB(), req.ReceiverEmail)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, domain.ErrReceiverNotFound
		}
		return nil, err
	}
	if receiverUser.ID == senderUserID {
		return nil, domain.ErrSelfTransfer
	}

	// Step 6: Fetch receiver's wallet
	receiverWallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.DB(), receiverUser.ID)
	if err != nil {
		if errors.Is(err, domain.ErrWalletNotFound) {
			return nil, domain.ErrReceiverWalletNotFound
		}
		return nil, err
	}

	// Step 7: Acquire distributed lock to prevent race conditions on idempotency key
	fullIdmKey := fmt.Sprintf("idempotency:%s:transfer:%s", senderUserID, req.IdempotencyKey)
	locked, err := s.locker.AcquireLock(ctx, fullIdmKey, 5*time.Second)
	if err != nil {
		return nil, err
	}
	if !locked {
		return nil, domain.ErrConcurrentRequest
	}
	defer s.locker.ReleaseLock(ctx, fullIdmKey)

	// Step 8: Execute atomic transfer in a database transaction with deadlock prevention
	var result *domain.Transaction
	err = s.transactor.WithTx(ctx, func(db repository.DBTX) error {
		// 8a. Check if this transfer was already processed
		existing, idmErr := s.txRepo.CheckIdempotency(ctx, db, fullIdmKey)
		if idmErr == nil {
			result = existing
			return nil
		}

		// 8b. Deadlock Prevention: Order wallet locks lexicographically by UUID
		firstID, secondID := senderWallet.ID, receiverWallet.ID
		if senderWallet.ID > receiverWallet.ID {
			firstID, secondID = receiverWallet.ID, senderWallet.ID
		}

		// 8c. Lock both wallet rows with `SELECT ... FOR UPDATE`
		b1, _, lockErr := s.walletRepo.GetBalanceForUpdate(ctx, db, firstID)
		if lockErr != nil {
			return lockErr
		}
		b2, l2, lockErr := s.walletRepo.GetBalanceForUpdate(ctx, db, secondID)
		if lockErr != nil {
			return lockErr
		}

		// 8d. Assign locked balance variables back to sender and receiver
		var senderBalance, receiverBalance, receiverLimit int64
		if senderWallet.ID == firstID {
			senderBalance, receiverBalance, receiverLimit = b1, b2, l2
		} else {
			senderBalance, receiverBalance, receiverLimit = b2, b1, l2
		}

		// 8e. Check sender's sufficient balance
		if senderBalance < req.Amount {
			return domain.ErrInsufficientBalance
		}

		// 8f. Calculate new balances and check receiver's wallet limit
		newSenderBalance := senderBalance - req.Amount
		newReceiverBalance := receiverBalance + req.Amount
		if newReceiverBalance > receiverLimit {
			return domain.ErrExceedsMaxLimit
		}

		// 8g. Update balances for both sender and receiver wallets
		if err := s.walletRepo.UpdateBalance(ctx, db, senderWallet.ID, newSenderBalance); err != nil {
			return err
		}
		if err := s.walletRepo.UpdateBalance(ctx, db, receiverWallet.ID, newReceiverBalance); err != nil {
			return err
		}

		// 8h. Record the transaction in `transactions` table
		tx := &domain.Transaction{
			IdempotencyKey:   fullIdmKey,
			SenderWalletID:   &senderWallet.ID,
			ReceiverWalletID: &receiverWallet.ID,
			Amount:           req.Amount,
			FeeAmount:        0,
			Type:             domain.TxTypeTransfer,
			Status:           domain.TxStatusSuccess,
			Description:      req.Description,
		}
		if err := s.txRepo.Insert(ctx, db, tx); err != nil {
			return err
		}

		// 8i. Insert double-entry ledger records (DEBIT on sender, CREDIT on receiver)
		if err := s.ledgerRepo.Insert(ctx, db, &domain.LedgerEntry{
			TransactionID: tx.ID,
			WalletID:      senderWallet.ID,
			EntryType:     domain.EntryTypeDebit,
			Amount:        req.Amount,
			BalanceAfter:  newSenderBalance,
		}); err != nil {
			return err
		}
		if err := s.ledgerRepo.Insert(ctx, db, &domain.LedgerEntry{
			TransactionID: tx.ID,
			WalletID:      receiverWallet.ID,
			EntryType:     domain.EntryTypeCredit,
			Amount:        req.Amount,
			BalanceAfter:  newReceiverBalance,
		}); err != nil {
			return err
		}

		result = tx
		return nil
	})

	return result, err
}

func (s *walletService) GetTransaction(ctx context.Context, userID string, limit int, offset int) ([]*domain.Transaction, error) {
	// Step 1: Find user's wallet ID
	wallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return nil, err
	}

	// Step 2: Fetch paginated transaction history from repository
	return s.txRepo.GetTransactionsByWalletID(ctx, s.transactor.DB(), wallet.ID, limit, offset)
}
