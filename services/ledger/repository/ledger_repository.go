package repository

import (
	"context"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/services/ledger/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LedgerRepository interface {
	CreateAccountWithBalance(ctx context.Context, account *domain.LedgerAccount) error
	GetAccountByID(ctx context.Context, id uuid.UUID) (*domain.LedgerAccount, error)
	GetAccountByCode(ctx context.Context, code string) (*domain.LedgerAccount, error)
	GetAccountBalance(ctx context.Context, accountID uuid.UUID) (*domain.AccountBalance, error)
}

type postgresLedgerRepository struct {
	pool *pgxpool.Pool
}

func NewLedgerRepository(pool *pgxpool.Pool) LedgerRepository {
	return &postgresLedgerRepository{pool: pool}
}

func (r *postgresLedgerRepository) CreateAccountWithBalance(ctx context.Context, account *domain.LedgerAccount) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	now := time.Now().UTC()
	if account.ID == uuid.Nil {
		account.ID = uuid.New()
	}
	account.CreatedAt = now
	account.UpdatedAt = now
	if account.Status == "" {
		account.Status = domain.AccountStatusActive
	}

	// 1. Insert Ledger Account
	accountQuery := `
		INSERT INTO ledger_accounts (id, account_code, account_type, owner_type, owner_id, currency, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err = tx.Exec(ctx, accountQuery,
		account.ID,
		account.AccountCode,
		account.AccountType,
		account.OwnerType,
		account.OwnerID,
		account.Currency,
		account.Status,
		account.CreatedAt,
		account.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation on account_code
			return domain.ErrDuplicateAccountCode
		}
		return err
	}

	// 2. Initialize Read Projection Balance = 0
	balanceQuery := `
		INSERT INTO account_balances (account_id, balance, version, updated_at)
		VALUES ($1, 0, 0, $2)
	`
	_, err = tx.Exec(ctx, balanceQuery, account.ID, now)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *postgresLedgerRepository) GetAccountByID(ctx context.Context, id uuid.UUID) (*domain.LedgerAccount, error) {
	query := `
		SELECT id, account_code, account_type, owner_type, owner_id, currency, status, created_at, updated_at
		FROM ledger_accounts
		WHERE id = $1
	`
	var acc domain.LedgerAccount
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&acc.ID,
		&acc.AccountCode,
		&acc.AccountType,
		&acc.OwnerType,
		&acc.OwnerID,
		&acc.Currency,
		&acc.Status,
		&acc.CreatedAt,
		&acc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, err
	}
	return &acc, nil
}

func (r *postgresLedgerRepository) GetAccountByCode(ctx context.Context, code string) (*domain.LedgerAccount, error) {
	query := `
		SELECT id, account_code, account_type, owner_type, owner_id, currency, status, created_at, updated_at
		FROM ledger_accounts
		WHERE account_code = $1
	`
	var acc domain.LedgerAccount
	err := r.pool.QueryRow(ctx, query, code).Scan(
		&acc.ID,
		&acc.AccountCode,
		&acc.AccountType,
		&acc.OwnerType,
		&acc.OwnerID,
		&acc.Currency,
		&acc.Status,
		&acc.CreatedAt,
		&acc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, err
	}
	return &acc, nil
}

func (r *postgresLedgerRepository) GetAccountBalance(ctx context.Context, accountID uuid.UUID) (*domain.AccountBalance, error) {
	query := `
		SELECT account_id, balance, version, updated_at
		FROM account_balances
		WHERE account_id = $1
	`
	var bal domain.AccountBalance
	err := r.pool.QueryRow(ctx, query, accountID).Scan(
		&bal.AccountID,
		&bal.Balance,
		&bal.Version,
		&bal.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, err
	}
	return &bal, nil
}
