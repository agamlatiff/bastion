package service

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/redis/go-redis/v9"
	"time"
)

type WalletService interface {
	GetBalance(ctx context.Context, userID string) (*domain.WalletBalanceResponse, error)
	TopUp(ctx context.Context, userID string, req *domain.TopUpRequest) (*domain.Transaction, error)
	Transfer(ctx context.Context, senderUserID string, req *domain.TransferRequest) (*domain.Transaction, error)
	GetTransactionHistory(ctx context.Context, userID string, limit, offset int) ([]*domain.Transaction, error)
}

type walletService struct {
	walletRepo repository.WalletRepository
	userRepo   repository.UserRepository
	rdb        *redis.Client
}

func NewWalletService(walletRepo repository.WalletRepository, userRepo repository.UserRepository, rdb *redis.Client) WalletService {
	return &walletService{
		walletRepo: walletRepo,
		userRepo:   userRepo,
		rdb:        rdb,
	}

}

func (s *walletService) GetBalance(ctx context.Context, userID string) (*domain.WalletBalanceResponse, error) {
	// Get User ID
	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &domain.WalletBalanceResponse{
		WalletID:        wallet.ID,
		UserID:          wallet.UserID,
		Balance:         wallet.Balance,
		Currency:        wallet.Currency,
		MaxBalanceLimit: wallet.MaxBalanceLimit,
	}, nil
}

func (s *walletService) TopUp(ctx context.Context, userID string, req *domain.TopUpRequest) (*domain.Transaction, error) {

	cacheKey := "idempotency:" + req.IdempotencyKey

	cachedJSON, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil && cachedJSON != "" {
		var cachedTx domain.Transaction
		if err := json.Unmarshal([]byte(cachedJSON), &cachedTx); err != nil {
			return nil, err
		}
		return &cachedTx, nil
	}

	// Checking amount of top up
	if req.Amount <= 0 {
		return nil, errors.New("top-up amount must be greater than 0")
	}

	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Checking bussiness logic, is is over from limiter user tier
	if wallet.Balance+req.Amount > wallet.MaxBalanceLimit {
		return nil, errors.New("top up exceeds maximum wallet balance limit for your account tier")
	}

	// If validations success, execution ACID transaction database
	tx, err := s.walletRepo.ExecuteTopUp(ctx, wallet.ID, req.Amount, req.IdempotencyKey, req.Description)

	if err != nil {
		return nil, err
	}

	if txBytes, err := json.Marshal(tx); err == nil {
		s.rdb.Set(ctx, cacheKey, txBytes, 24*time.Hour)
	}
	return tx, nil
}

func (s *walletService) Transfer(ctx context.Context, senderUserID string, req *domain.TransferRequest) (*domain.Transaction, error) {
	//  Get idk from redis
	cacheKey := "idempotency:" + req.IdempotencyKey

	cachedJSON, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil && cachedJSON != "" {
		var cachedTx domain.Transaction
		if err := json.Unmarshal([]byte(cachedJSON), &cachedTx); err == nil {
			return &cachedTx, nil
		}
	}

	if req.Amount <= 0 {
		return nil, errors.New("transfer amount must be greater than 0")
	}

	senderUser, err := s.userRepo.FindByID(ctx, senderUserID)
	if err != nil {
		return nil, err
	}

	if senderUser.Tier != "tier_2" {
		return nil, errors.New("sender must be tier 2 to make transfers")
	}

	receiverUser, err := s.userRepo.FindByEmail(ctx, req.ReceiverEmail)
	if err != nil {
		return nil, errors.New("receiver email not found")
	}

	if senderUser.ID == receiverUser.ID {
		return nil, errors.New("you cannot transfer to yourself")
	}

	senderWallet, err := s.walletRepo.FindByUserID(ctx, senderUser.ID)
	if err != nil {
		return nil, err
	}

	receiverWallet, err := s.walletRepo.FindByUserID(ctx, receiverUser.ID)
	if err != nil {
		return nil, errors.New("receiver wallet not found")
	}

	tx, err := s.walletRepo.ExecuteTransfer(
		ctx,
		senderWallet.ID,
		receiverWallet.ID,
		req.Amount,
		req.IdempotencyKey,
		req.Description,
	)

	if err != nil {
		return nil, err
	}

	if txBytes, err := json.Marshal(tx); err == nil {
		s.rdb.Set(ctx, cacheKey, txBytes, 24*time.Hour)
	}
	return tx, nil

}

func (s *walletService) GetTransactionHistory(ctx context.Context, userID string, limit, offset int) ([]*domain.Transaction, error) {
	// Get user ID
	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Pagination
	if limit <= 0 {
		limit = 10
	}

	if limit > 50 {
		limit = 50
	}

	if offset < 0 {
		offset = 0
	}

	return s.walletRepo.GetTransaction(ctx, wallet.ID, limit, offset)
}
