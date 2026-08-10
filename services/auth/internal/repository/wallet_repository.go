package repository

import (
	"context"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WalletRepository interface {
	FindByUserID(ctx context.Context, userID string) (*domain.Wallet, error)
	FindByID(ctx context.Context, walletID string) (*domain.Wallet, error)
	ExecuteTopUp(ctx context.Context, walletID string, amount int64, idmKey string, desc string) (*domain.Transaction, error)
	GetTransaction(ctx context.Context, walletID string, limit int, offset int) ([]*domain.Transaction, error)
}

type walletRepository struct {
	db *pgxpool.Pool
}


func NewWalletRepository(db *pgxpool.Pool) WalletRepository {
	return &walletRepository{db: db}
}

func (r *walletRepository) FindByUserID(ctx context.Context, userID string) (*domain.Wallet, error) {
	query := `SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at FROM wallets WHERE user_id = $1`

	user := &domain.Wallet{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&user.ID,
		&user.UserID,
		&user.Balance,
		&user.Currency,
		&user.MaxBalanceLimit,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (r *walletRepository) FindByID(ctx context.Context, walletID string) (*domain.Wallet, error) {
	query := `SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at FROM wallets WHERE id = $1`

	wallet := &domain.Wallet{}
	err := r.db.QueryRow(ctx, query, walletID).Scan(
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

func (r *walletRepository) ExecuteTopUp(ctx context.Context, walletID string, amount int64, idmKey string, desc string) (*domain.Transaction, error) {
	// Open the transaction of database
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}

	// Ensure rollback automatically, if any error before tx.Commit
	defer tx.Rollback(ctx)

	// Update Wallet Balance & take a new Balance
	var newBalance int64
	updateWalletQuery := `
		UPDATE wallets
		SET balance = balance + $1, updated_at = NOW()
		WHERE id = $2
		RETURNING balance
	`

	err = tx.QueryRow(ctx, updateWalletQuery, amount, walletID).Scan(&newBalance)

	if err != nil {
		return nil, err
	}

	// Keep proof of the transaction into the table Transaction
	txRecord := &domain.Transaction{
		IdempotencyKey:   idmKey,
		ReceiverWalletID: &walletID,
		Amount:           amount,
		FeeAmount:        0,
		Type:             "topup",
		Status:           "success",
		Description:      desc,
	}

	insertTxQuery := `INSERT INTO transactions(idempotency_key, receiver_wallet_id, amount, fee_amount, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`

	err = tx.QueryRow(ctx, insertTxQuery,
		txRecord.IdempotencyKey,
		txRecord.ReceiverWalletID,
		txRecord.Amount,
		txRecord.FeeAmount,
		txRecord.Type,
		txRecord.Status,
		txRecord.Description,
	).Scan(&txRecord.ID, &txRecord.CreatedAt)

	if err != nil {
		return nil, err
	}

	// Record a credit entry into Ledger Entries
	insertLedgerQuery := ` INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after) VALUES ($1, $2, 'credit', $3, $4)`

	_, err = tx.Exec(ctx, insertLedgerQuery, txRecord.ID, walletID, amount, newBalance)

	if err != nil {
		return nil, err
	}

	// Lock & save all permanent data changes
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return txRecord, nil
}


// TODO: DEEP UNDERSTANDING THIS FUNC
func (r *walletRepository) GetTransaction(ctx context.Context, walletID string, limit int, offset int) ([]*domain.Transaction, error) {
	query := `
		SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at 
		FROM transactions 
		WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1		
		ORDER BY created_at DESC 
		LIMIT $2 OFFSET $3		
	`

	// Execution many rows query
	rows, err := r.db.Query(ctx, query, walletID, limit, offset) 
	if err != nil {
		return nil, err
	}

	// Ensure the connection automatically close when we have been read all rows
	defer rows.Close()

	// Create slice for keep the list transactions
	var transactions []*domain.Transaction

	// Looping each row from database
	for rows.Next() {
		tx := &domain.Transaction{}
		err := rows.Scan(
			&tx.ID,
			&tx.IdempotencyKey,
			&tx.SenderWalletID,
			&tx.ReceiverWalletID,
			&tx.Amount,
			&tx.FeeAmount,
			&tx.Type,
			&tx.Status,
			&tx.Description,
			&tx.CreatedAt,
		)

		if err != nil {
			return nil, err
		}

		// Insert into the list slices
		transactions = append(transactions, tx)
	}

	// Checking is there any error while looping
	if err := rows.Err(); err != nil {
		return nil, err
	} 

	return transactions, nil

}