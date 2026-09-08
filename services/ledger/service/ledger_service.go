package service

import (
	"context"
	"strings"

	"github.com/agamlatiff/bastion/services/ledger/domain"
	"github.com/agamlatiff/bastion/services/ledger/repository"
	"github.com/google/uuid"
)

type LedgerService interface {
	CreateAccount(ctx context.Context, req domain.CreateAccountRequest) (*domain.AccountResponse, error)
	GetAccountByID(ctx context.Context, id uuid.UUID) (*domain.AccountResponse, error)
	GetAccountByCode(ctx context.Context, code string) (*domain.AccountResponse, error)
}

type ledgerService struct {
	repo repository.LedgerRepository
}

func NewLedgerService(repo repository.LedgerRepository) LedgerService {
	return &ledgerService{repo: repo}
}

func (s *ledgerService) CreateAccount(ctx context.Context, req domain.CreateAccountRequest) (*domain.AccountResponse, error) {
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if !domain.IsValidCurrency(currency) {
		return nil, domain.ErrInvalidCurrency
	}

	if !req.AccountType.IsValid() {
		return nil, domain.ErrInvalidAccountType
	}

	accountCode := strings.TrimSpace(req.AccountCode)
	// Check duplicate code at service level
	existing, err := s.repo.GetAccountByCode(ctx, accountCode)
	if err == nil && existing != nil {
		return nil, domain.ErrDuplicateAccountCode
	}

	account := &domain.LedgerAccount{
		ID:          uuid.New(),
		AccountCode: accountCode,
		AccountType: req.AccountType,
		OwnerType:   strings.TrimSpace(req.OwnerType),
		OwnerID:     req.OwnerID,
		Currency:    currency,
		Status:      domain.AccountStatusActive,
	}

	if err := s.repo.CreateAccountWithBalance(ctx, account); err != nil {
		return nil, err
	}

	return toAccountResponse(account, 0), nil
}

func (s *ledgerService) GetAccountByID(ctx context.Context, id uuid.UUID) (*domain.AccountResponse, error) {
	account, err := s.repo.GetAccountByID(ctx, id)
	if err != nil {
		return nil, err
	}

	var balance int64 = 0
	if bal, err := s.repo.GetAccountBalance(ctx, account.ID); err == nil && bal != nil {
		balance = bal.Balance
	}

	return toAccountResponse(account, balance), nil
}

func (s *ledgerService) GetAccountByCode(ctx context.Context, code string) (*domain.AccountResponse, error) {
	account, err := s.repo.GetAccountByCode(ctx, strings.TrimSpace(code))
	if err != nil {
		return nil, err
	}

	var balance int64 = 0
	if bal, err := s.repo.GetAccountBalance(ctx, account.ID); err == nil && bal != nil {
		balance = bal.Balance
	}

	return toAccountResponse(account, balance), nil
}

func toAccountResponse(acc *domain.LedgerAccount, balance int64) *domain.AccountResponse {
	return &domain.AccountResponse{
		ID:          acc.ID,
		AccountCode: acc.AccountCode,
		AccountType: acc.AccountType,
		OwnerType:   acc.OwnerType,
		OwnerID:     acc.OwnerID,
		Currency:    acc.Currency,
		Status:      acc.Status,
		Balance:     balance,
		CreatedAt:   acc.CreatedAt,
		UpdatedAt:   acc.UpdatedAt,
	}
}
