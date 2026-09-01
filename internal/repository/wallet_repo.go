package repository

import (
	"context"

	"github.com/agamlatiff/bastion/internal/domain"
)

type WalletRepository interface {
	Create(ctx context.Context, db DBTX, userID string) error
	FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.Wallet, error)
	FindByID(ctx context.Context, db DBTX, walletID string) (*domain.Wallet, error)
	GetBalanceForUpdate(ctx context.Context, db DBTX, walletID string) (balance int64, maxLimit int64, err error)
	UpdateBalance(ctx context.Context, db DBTX, walletID string, newBalance int64) error
	UpdateMaxLimit(ctx context.Context, db DBTX, userID string, maxLimit int64) error
}

type walletRepo struct{}

func NewWalletRepository() WalletRepository {
	return &walletRepo{}
}

func (r *walletRepo) Create(ctx context.Context, db DBTX, userID string) error {
	query := `INSERT INTO wallets (user_id) VALUES ($1)`
	_, err := db.Exec(ctx, query, userID)
	return err
}

func (r *walletRepo) FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.Wallet, error) {
	query := `SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at FROM wallets WHERE user_id = $1`
	wallet := &domain.Wallet{}
	err := db.QueryRow(ctx, query, userID).Scan(
		&wallet.ID,
		&wallet.UserID,
		&wallet.Balance,
		&wallet.Currency,
		&wallet.MaxBalanceLimit,
		&wallet.CreatedAt,
		&wallet.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return wallet, nil
}

func (r *walletRepo) FindByID(ctx context.Context, db DBTX, walletID string) (*domain.Wallet, error) {
	query := `SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at FROM wallets WHERE id = $1`
	wallet := &domain.Wallet{}
	err := db.QueryRow(ctx, query, walletID).Scan(
		&wallet.ID,
		&wallet.UserID,
		&wallet.Balance,
		&wallet.Currency,
		&wallet.MaxBalanceLimit,
		&wallet.CreatedAt,
		&wallet.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return wallet, nil
}

func (r *walletRepo) GetBalanceForUpdate(ctx context.Context, db DBTX, walletID string) (int64, int64, error) {
	var currentBalance int64
	var maxLimit int64

	query := `SELECT balance, max_balance_limit FROM wallets WHERE id = $1 FOR UPDATE`
	err := db.QueryRow(ctx, query, walletID).Scan(&currentBalance, &maxLimit)

	return currentBalance, maxLimit, err
}

func (r *walletRepo) UpdateBalance(ctx context.Context, db DBTX, walletID string, newBalance int64) error {
	query := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	_, err := db.Exec(ctx, query, newBalance, walletID)
	return err
}

func (r *walletRepo) UpdateMaxLimit(ctx context.Context, db DBTX, userID string, maxLimit int64) error {
	query := `UPDATE wallets SET max_balance_limit = $1, updated_at = NOW() WHERE user_id = $2`
	_, err := db.Exec(ctx, query, maxLimit, userID)
	return err
}
