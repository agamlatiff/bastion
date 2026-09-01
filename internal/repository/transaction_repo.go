package repository

import (
	"github.com/agamlatiff/bastion/internal/domain"
	"context"
)

type TransactionRepository interface {
	CheckIdempotency(ctx context.Context, db DBTX, idempotencyKey string) (*domain.Transaction, error)
	Insert(ctx context.Context, db DBTX, transaction *domain.Transaction) error
	GetTransactionsByWalletID(ctx context.Context, db DBTX, walletID string, limit int, offset int) ([]*domain.Transaction, error)
}

type transactionRepo struct{}

func NewTransactionRepository() TransactionRepository {
	return &transactionRepo{}
}

func (r *transactionRepo) CheckIdempotency(ctx context.Context, db DBTX, idempotencyKey string) (*domain.Transaction, error) {
	var existingTx domain.Transaction
	query := `
		SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at 
		FROM transactions 
		WHERE idempotency_key = $1
	`
	err := db.QueryRow(ctx, query, idempotencyKey).Scan(
		&existingTx.ID,
		&existingTx.IdempotencyKey,
		&existingTx.SenderWalletID,
		&existingTx.ReceiverWalletID,
		&existingTx.Amount,
		&existingTx.FeeAmount,
		&existingTx.Type,
		&existingTx.Status,
		&existingTx.Description,
		&existingTx.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &existingTx, nil
}

func (r *transactionRepo) Insert(ctx context.Context, db DBTX, tx *domain.Transaction) error {
	query := `
		INSERT INTO transactions (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`
	err := db.QueryRow(ctx, query, 
		tx.IdempotencyKey, 
		tx.SenderWalletID, 
		tx.ReceiverWalletID, 
		tx.Amount, 
		tx.FeeAmount, 
		tx.Type, 
		tx.Status, 
		tx.Description,
	).Scan(&tx.ID, &tx.CreatedAt)
	
	return err
}

func (r *transactionRepo) GetTransactionsByWalletID(ctx context.Context, db DBTX, walletID string, limit int, offset int) ([]*domain.Transaction, error) {
	if limit <= 0 { limit = 20 }
	if limit > 100 { limit = 100 }

	query := `
		SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at
		FROM transactions
		WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := db.Query(ctx, query, walletID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*domain.Transaction
	for rows.Next() {
		var tx domain.Transaction
		if err := rows.Scan(
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
		); err != nil {
			return nil, err
		}
		transactions = append(transactions, &tx)
	}

	return transactions, nil
}

