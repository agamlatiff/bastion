package service

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
)

type WalletService interface {
	GetBalance(ctx context.Context, userID string) (*domain.WalletBalanceResponse, error)
	TopUp(ctx context.Context, userID string, req *domain.TopUpRequest) (*domain.Transaction, error)
	GetTransactionHistory(ctx context.Context, userID string, limit, offset int) ([]*domain.Transaction, error)
}

type walletService struct {
	walletRepo repository.WalletRepository
}

func NewWalletService(walletRepo repository.WalletRepository) WalletService {
	return &walletService{walletRepo: walletRepo}
}

func (s *walletService) GetBalance(ctx context.Context, userID string) (*domain.WalletBalanceResponse, error) {
	// Get User ID
	wallet, err := s.walletRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &domain.WalletBalanceResponse{
		WalletID:        wallet.ID,
		Balance:         wallet.Balance,
		Currency:        wallet.Currency,
		MaxBalanceLimit: wallet.MaxBalanceLimit,
	}, nil
}

func (s *walletService) TopUp(ctx context.Context, userID string, req *domain.TopUpRequest) (*domain.Transaction, error) {
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
	return s.walletRepo.ExecuteTopUp(ctx, wallet.ID, req.Amount, req.IdempotencyKey, req.Description)
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
