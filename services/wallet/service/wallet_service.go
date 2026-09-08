package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/agamlatiff/bastion/services/wallet/client"
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
	repo         repository.WalletRepository
	ledgerClient client.LedgerClient
}

func NewWalletService(repo repository.WalletRepository, ledgerClient client.LedgerClient) WalletService {
	return &walletService{
		repo:         repo,
		ledgerClient: ledgerClient,
	}
}

func (s *walletService) CreateWallet(ctx context.Context, customerID uuid.UUID, req domain.CreateWalletRequest) (*domain.WalletResponse, error) {
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if !domain.IsValidCurrency(currency) {
		return nil, domain.ErrInvalidCurrency
	}

	// 1. Application-level duplicate check
	existing, err := s.repo.GetActiveByCustomerAndCurrency(ctx, customerID, currency)
	if err == nil && existing != nil {
		return nil, domain.ErrDuplicateWallet
	}

	wallet := &domain.Wallet{
		ID:              uuid.New(),
		CustomerID:      customerID,
		Currency:        currency,
		Balance:         0,          // Minor unit integer
		MaxBalanceLimit: 1000000000, // Default limit
		Status:          domain.StatusCreating,
	}

	// 2. Insert wallet with initial state CREATING
	if err := s.repo.Create(ctx, wallet); err != nil {
		return nil, err
	}

	// 3. Wallet <-> Ledger Handshake: Synchronously create official LIABILITY account in Ledger
	if s.ledgerClient != nil {
		if err := s.ledgerClient.CreateCustomerWalletAccount(ctx, wallet.ID, customerID, currency); err != nil {
			return nil, fmt.Errorf("ledger handshake failed: %w", err)
		}
	}

	// 4. Ledger Account successfully created -> Promote CREATING -> ACTIVE and atomically save WalletCreated to outbox
	createdPayload := domain.WalletCreatedPayload{
		WalletID:   wallet.ID,
		CustomerID: customerID,
		Currency:   wallet.Currency,
		Balance:    wallet.Balance,
		Status:     string(domain.StatusActive),
	}
	event, err := domain.NewEventEnvelope("WalletCreated", wallet.ID, createdPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to create event envelope: %w", err)
	}

	if err := s.repo.UpdateStatusWithOutbox(ctx, wallet.ID, domain.StatusCreating, domain.StatusActive, event); err != nil {
		return nil, err
	}
	wallet.Status = domain.StatusActive

	// 5. Initial balance snapshot
	_ = s.repo.CreateSnapshot(ctx, wallet.ID, wallet.Balance)

	return toWalletResponse(wallet), nil
}

func (s *walletService) GetWallet(ctx context.Context, walletID uuid.UUID, customerID uuid.UUID) (*domain.WalletResponse, error) {
	wallet, err := s.repo.GetByID(ctx, walletID)
	if err != nil {
		return nil, err
	}

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

	if wallet.CustomerID != customerID {
		return nil, domain.ErrUnauthorizedWalletAccess
	}

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

	if !domain.CanTransition(wallet.Status, domain.StatusFrozen) {
		return nil, domain.ErrInvalidTransition
	}

	// Atomically update status to FROZEN and save WalletFrozen event to outbox
	frozenPayload := domain.WalletStatusChangedPayload{
		WalletID:   walletID,
		CustomerID: customerID,
		Currency:   wallet.Currency,
		FromStatus: string(wallet.Status),
		ToStatus:   string(domain.StatusFrozen),
	}
	event, err := domain.NewEventEnvelope("WalletFrozen", walletID, frozenPayload)
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdateStatusWithOutbox(ctx, walletID, wallet.Status, domain.StatusFrozen, event); err != nil {
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

	if !domain.CanTransition(wallet.Status, domain.StatusActive) {
		return nil, domain.ErrInvalidTransition
	}

	// Atomically update status to ACTIVE and save WalletUnfrozen event to outbox
	unfrozenPayload := domain.WalletStatusChangedPayload{
		WalletID:   walletID,
		CustomerID: customerID,
		Currency:   wallet.Currency,
		FromStatus: string(wallet.Status),
		ToStatus:   string(domain.StatusActive),
	}
	event, err := domain.NewEventEnvelope("WalletUnfrozen", walletID, unfrozenPayload)
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdateStatusWithOutbox(ctx, walletID, wallet.Status, domain.StatusActive, event); err != nil {
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
