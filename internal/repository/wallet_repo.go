package repository

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/jackc/pgx/v5"
)

// WalletRepository defines the persistence interface for managing Wallet entities in the `wallets` table.
type WalletRepository interface {
	Create(ctx context.Context, db DBTX, userID string) error
	FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.Wallet, error)
	FindByID(ctx context.Context, db DBTX, walletID string) (*domain.Wallet, error)
	GetBalanceForUpdate(ctx context.Context, db DBTX, walletID string) (balance int64, maxLimit int64, err error)
	UpdateBalance(ctx context.Context, db DBTX, walletID string, newBalance int64) error
	UpdateMaxLimit(ctx context.Context, db DBTX, userID string, maxLimit int64) error
}

type walletRepo struct{}

// NewWalletRepository creates a new stateless WalletRepository instance.
func NewWalletRepository() WalletRepository {
	return &walletRepo{}
}

// Create inserts a default wallet record for a newly registered user.
func (r *walletRepo) Create(ctx context.Context, db DBTX, userID string) error {
	query := `INSERT INTO wallets (user_id) VALUES ($1)`
	_, err := db.Exec(ctx, query, userID)
	return err
}

// FindByUserID retrieves the wallet associated with a specific user ID.
func (r *walletRepo) FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.Wallet, error) {
	query := `
		SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at 
		FROM wallets 
		WHERE user_id = $1
	`
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrWalletNotFound
		}
		return nil, err
	}
	return wallet, nil
}

// FindByID retrieves a wallet by its unique primary key ID.
func (r *walletRepo) FindByID(ctx context.Context, db DBTX, walletID string) (*domain.Wallet, error) {
	query := `
		SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at 
		FROM wallets 
		WHERE id = $1
	`
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrWalletNotFound
		}
		return nil, err
	}
	return wallet, nil
}

// GetBalanceForUpdate acquires an exclusive row-level lock (`SELECT ... FOR UPDATE`)
// on the specified wallet to prevent concurrent balance modifications and race conditions.
func (r *walletRepo) GetBalanceForUpdate(ctx context.Context, db DBTX, walletID string) (int64, int64, error) {
	var currentBalance int64
	var maxLimit int64

	query := `SELECT balance, max_balance_limit FROM wallets WHERE id = $1 FOR UPDATE`
	err := db.QueryRow(ctx, query, walletID).Scan(&currentBalance, &maxLimit)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, 0, domain.ErrWalletNotFound
		}
		return 0, 0, err
	}

	return currentBalance, maxLimit, nil
}

// UpdateBalance sets a new balance amount for the given wallet ID.
func (r *walletRepo) UpdateBalance(ctx context.Context, db DBTX, walletID string, newBalance int64) error {
	query := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	res, err := db.Exec(ctx, query, newBalance, walletID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrWalletNotFound
	}
	return nil
}

// UpdateMaxLimit updates the maximum balance limit allowed for a user's wallet (e.g. upgraded to 10M on KYC).
func (r *walletRepo) UpdateMaxLimit(ctx context.Context, db DBTX, userID string, maxLimit int64) error {
	query := `UPDATE wallets SET max_balance_limit = $1, updated_at = NOW() WHERE user_id = $2`
	res, err := db.Exec(ctx, query, maxLimit, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrWalletNotFound
	}
	return nil
}
