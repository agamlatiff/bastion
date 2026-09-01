package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/repository"
	"github.com/redis/go-redis/v9"
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
	rdb        *redis.Client
}

func NewWalletService(
	transactor repository.Transactor,
	walletRepo repository.WalletRepository,
	txRepo repository.TransactionRepository,
	ledgerRepo repository.LedgerRepository,
	userRepo repository.UserRepository,
	rdb *redis.Client,
) WalletService {
	return &walletService{
		transactor: transactor,
		walletRepo: walletRepo,
		txRepo:     txRepo,
		ledgerRepo: ledgerRepo,
		userRepo:   userRepo,
		rdb:        rdb,
	}
}

func (s *walletService) GetBalance(ctx context.Context, userID string) (*dto.WalletBalanceResponse, error) {
	wallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.(repository.DBTX), userID)
	if err != nil {
		return nil, err
	}

	return dto.ToWalletBalanceResponse(wallet), nil
}

func (s *walletService) TopUp(ctx context.Context, userID string, req *dto.TopUpRequest) (*domain.Transaction, error) {
	if req.Amount <= 0 {
		return nil, domain.ErrInvalidAmount
	}

	wallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.(repository.DBTX), userID)
	if err != nil {
		return nil, err
	}

	fullIdmKey := fmt.Sprintf("idempotency:%s:topup:%s", userID, req.IdempotencyKey)
	locked, err := s.rdb.SetNX(ctx, fullIdmKey, "locked", 5*time.Second).Result()
	if err != nil {
		return nil, err
	}
	if !locked {
		return nil, errors.New("concurrent request detected for the same idempotency key")
	}
	defer s.rdb.Del(ctx, fullIdmKey)

	desc := req.Description
	if desc == "" {
		desc = "Top Up Balance"
	}

	var result *domain.Transaction
	err = s.transactor.WithTx(ctx, func(db repository.DBTX) error {
		existing, idmErr := s.txRepo.CheckIdempotency(ctx, db, fullIdmKey)
		if idmErr == nil {
			result = existing
			return nil
		}

		currentBalance, maxLimit, lockErr := s.walletRepo.GetBalanceForUpdate(ctx, db, wallet.ID)
		if lockErr != nil {
			return lockErr
		}

		newBalance := currentBalance + req.Amount
		if newBalance > maxLimit {
			return domain.ErrExceedsMaxLimit
		}

		if updateErr := s.walletRepo.UpdateBalance(ctx, db, wallet.ID, newBalance); updateErr != nil {
			return updateErr
		}

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
	if req.Amount <= 0 {
		return nil, domain.ErrInvalidAmount
	}

	senderUser, err := s.userRepo.FindByID(ctx, senderUserID)
	if err != nil {
		return nil, errors.New("sender user not found")
	}

	if !senderUser.IsVerified {
		return nil, domain.ErrKYCRequired
	}

	senderWallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.(repository.DBTX), senderUserID)
	if err != nil {
		return nil, err
	}

	receiverUser, err := s.userRepo.FindByEmail(ctx, req.ReceiverEmail)
	if err != nil {
		return nil, errors.New("receiver user not found")
	}

	if receiverUser.ID == senderUserID {
		return nil, domain.ErrSelfTransfer
	}

	receiverWallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.(repository.DBTX), receiverUser.ID)
	if err != nil {
		return nil, errors.New("receiver wallet not found")
	}

	fullIdmKey := fmt.Sprintf("idempotency:%s:transfer:%s", senderUserID, req.IdempotencyKey)
	locked, err := s.rdb.SetNX(ctx, fullIdmKey, "locked", 5*time.Second).Result()
	if err != nil {
		return nil, err
	}
	if !locked {
		return nil, errors.New("concurrent request detected for the same idempotency key")
	}
	defer s.rdb.Del(ctx, fullIdmKey)

	var result *domain.Transaction
	err = s.transactor.WithTx(ctx, func(db repository.DBTX) error {
		existing, idmErr := s.txRepo.CheckIdempotency(ctx, db, fullIdmKey)
		if idmErr == nil {
			result = existing
			return nil
		}

		firstID, secondID := senderWallet.ID, receiverWallet.ID
		if senderWallet.ID > receiverWallet.ID {
			firstID, secondID = receiverWallet.ID, senderWallet.ID
		}

		b1, _, lockErr := s.walletRepo.GetBalanceForUpdate(ctx, db, firstID)
		if lockErr != nil {
			return lockErr
		}
		b2, l2, lockErr := s.walletRepo.GetBalanceForUpdate(ctx, db, secondID)
		if lockErr != nil {
			return lockErr
		}

		var senderBalance, receiverBalance, receiverLimit int64
		if senderWallet.ID == firstID {
			senderBalance, receiverBalance, receiverLimit = b1, b2, l2
		} else {
			senderBalance, receiverBalance, receiverLimit = b2, b1, l2
		}

		if senderBalance < req.Amount {
			return domain.ErrInsufficientBalance
		}
		newSenderBalance := senderBalance - req.Amount
		newReceiverBalance := receiverBalance + req.Amount
		if newReceiverBalance > receiverLimit {
			return domain.ErrExceedsMaxLimit
		}

		if err := s.walletRepo.UpdateBalance(ctx, db, senderWallet.ID, newSenderBalance); err != nil {
			return err
		}
		if err := s.walletRepo.UpdateBalance(ctx, db, receiverWallet.ID, newReceiverBalance); err != nil {
			return err
		}

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
	wallet, err := s.walletRepo.FindByUserID(ctx, s.transactor.(repository.DBTX), userID)
	if err != nil {
		return nil, err
	}

	return s.txRepo.GetTransactionsByWalletID(ctx, s.transactor.(repository.DBTX), wallet.ID, limit, offset)
}
