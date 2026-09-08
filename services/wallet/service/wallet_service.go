package service

import (
	"context"
	"strings"

	"github.com/agamlatiff/bastion/services/wallet/domain"
	"github.com/agamlatiff/bastion/services/wallet/repository"
	"github.com/google/uuid"
)

type WalletService interface {
	CreateWallet(ctx context.Context, customerID uuid.UUID, req domain.CreateWalletRequest) (*domain.WalletResponse, error)
	GetWallet(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletResponse, error)
	GetBalance(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletBalanceResponse, error)
	FreezeWallet(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletResponse, error)
	UnfreezeWallet(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletResponse, error)
	ListCustomerWallets(ctx context.Context, customerID uuid.UUID) ([]*domain.WalletResponse, error)
}

type walletService struct {
	repo repository.WalletRepository
}

func NewWalletService(repo repository.WalletRepository) WalletService {
	return &walletService{repo: repo}
}

func (s *walletService) CreateWallet(ctx context.Context, customerID uuid.UUID, req domain.CreateWalletRequest) (*domain.WalletResponse, error) {
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if !domain.IsValidCurrency(currency) {
		return nil, domain.ErrInvalidCurrency
	}

	// 1. Application-level duplicate check (database unique index also protects at DB level)
	existing, err := s.repo.GetActiveByCustomerAndCurrency(ctx, customerID, currency)
	if err == nil && existing != nil {
		return nil, domain.ErrDuplicateWallet
	}

	wallet := &domain.Wallet{
		ID:              uuid.New(),
		CustomerID:      customerID,
		Currency:        currency,
		Balance:         0,          // Minor unit integer, always starts at zero
		MaxBalanceLimit: 1000000000, // Default limit
		Status:          domain.StatusCreating,
	}

	if err := s.repo.Create(ctx, wallet); err != nil {
		return nil, err
	}

	// 2. State Machine transition: CREATING -> ACTIVE
	// Note: In Phase 8, this step will be driven by synchronous Ledger account creation handshake.
	// For Phase 7 standalone verification, we transition the newly created wallet to ACTIVE.
	if err := s.repo.UpdateStatus(ctx, wallet.ID, domain.StatusCreating, domain.StatusActive); err != nil {
		return nil, err
	}
	wallet.Status = domain.StatusActive

	// 3. Initial balance snapshot
	_ = s.repo.CreateSnapshot(ctx, wallet.ID, wallet.Balance)

	return toWalletResponse(wallet), nil
}

func (s *walletService) GetWallet(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletResponse, error) {
	wallet, err := s.repo.GetByID(ctx, walletID)
	if err != nil {
		return nil, err
	}

	// Authorization / Ownership check
	if wallet.CustomerID != customerID {
		return nil, domain.ErrUnauthorizedWalletAccess
	}

	return toWalletResponse(wallet), nil
}

func (s *walletService) GetBalance(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletBalanceResponse, error) {
	wallet, err := s.repo.GetByID(ctx, walletID)
	if err != nil {
		return nil, err
	}

	// Ownership check
	if wallet.CustomerID != customerID {
		return nil, domain.ErrUnauthorizedWalletAccess
	}

	// Source of truth is PostgreSQL integer balance, never Redis or floating point
	return &domain.WalletBalanceResponse{
		WalletID: wallet.ID,
		Currency: wallet.Currency,
		Balance:  wallet.Balance,
	}, nil
}

func (s *walletService) FreezeWallet(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletResponse, error) {
	wallet, err := s.repo.GetByID(ctx, walletID)
	if err != nil {
		return nil, err
	}

	if wallet.CustomerID != customerID {
		return nil, domain.ErrUnauthorizedWalletAccess
	}

	// Validate state machine rule: ACTIVE -> FROZEN
	if !domain.CanTransition(wallet.Status, domain.StatusFrozen) {
		return nil, domain.ErrInvalidTransition
	}

	if err := s.repo.UpdateStatus(ctx, walletID, wallet.Status, domain.StatusFrozen); err != nil {
		return nil, err
	}

	wallet.Status = domain.StatusFrozen
	return toWalletResponse(wallet), nil
}

func (s *walletService) UnfreezeWallet(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletResponse, error) {
	wallet, err := s.repo.GetByID(ctx, walletID)
	if err != nil {
		return nil, err
	}

	if wallet.CustomerID != customerID {
		return nil, domain.ErrUnauthorizedWalletAccess
	}

	// Validate state machine rule: FROZEN -> ACTIVE
	if !domain.CanTransition(wallet.Status, domain.StatusActive) {
		return nil, domain.ErrInvalidTransition
	}

	if err := s.repo.UpdateStatus(ctx, walletID, wallet.Status, domain.StatusActive); err != nil {
		return nil, err
	}

	wallet.Status = domain.StatusActive
	return toWalletResponse(wallet), nil
}

func (s *walletService) ListCustomerWallets(ctx context.Context, customerID uuid.UUID) ([]*domain.WalletResponse, error) {
	wallets, err := s.repo.GetByCustomerID(ctx, customerID)
	if err != nil {
		return nil, err
	}

	responses := make([]*domain.WalletResponse, 0, len(wallets))
	for _, w := range wallets {
		responses = append(responses, toWalletResponse(w))
	}
	return responses, nil
}

func toWalletResponse(w *domain.Wallet) *domain.WalletResponse {
	return &domain.WalletResponse{
		ID:              w.ID,
		CustomerID:      w.CustomerID,
		Currency:        w.Currency,
		Balance:         w.Balance,
		MaxBalanceLimit: w.MaxBalanceLimit,
		Status:          w.Status,
		CreatedAt:       w.CreatedAt,
		UpdatedAt:       w.UpdatedAt,
	}
}
