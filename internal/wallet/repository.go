package wallet

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	FindByUserID(ctx context.Context, userID string) (*Wallet, error)
	FindByID(ctx context.Context, walletID string) (*Wallet, error)
	ExecuteTopUp(ctx context.Context, walletID string, amount int64, idmKey string, desc string) (*Transaction, error)
	ExecuteTransfer(ctx context.Context, senderWalletID string, receiverWalletID string, amount int64, idmKey string, desc string) (*Transaction, error)
	GetTransaction(ctx context.Context, walletID string, limit int, offset int) ([]*Transaction, error)
}

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &repository{db: db}
}

func (r *repository) FindByUserID(ctx context.Context, userID string) (*Wallet, error) {
	query := `SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at FROM wallets WHERE user_id = $1`

	wallet := &Wallet{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
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

func (r *repository) FindByID(ctx context.Context, walletID string) (*Wallet, error) {
	query := `SELECT id, user_id, balance, currency, max_balance_limit, created_at, updated_at FROM wallets WHERE id = $1`

	wallet := &Wallet{}
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

func (r *repository) ExecuteTopUp(ctx context.Context, walletID string, amount int64, idmKey string, desc string) (*Transaction, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var existingTx Transaction
	checkIDMQuery := `SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at FROM transactions WHERE idempotency_key = $1`
	err = tx.QueryRow(ctx, checkIDMQuery, idmKey).Scan(
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
	if err == nil {
		return &existingTx, nil
	}

	var currentBalance int64
	var maxLimit int64
	lockWalletQuery := `SELECT balance, max_balance_limit FROM wallets WHERE id = $1 FOR UPDATE`
	err = tx.QueryRow(ctx, lockWalletQuery, walletID).Scan(&currentBalance, &maxLimit)
	if err != nil {
		return nil, err
	}

	newBalance := currentBalance + amount
	if newBalance > maxLimit {
		return nil, errors.New("balance exceeds maximum wallet limit")
	}

	updateWalletQuery := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	_, err = tx.Exec(ctx, updateWalletQuery, newBalance, walletID)
	if err != nil {
		return nil, err
	}

	var transaction Transaction
	createTxQuery := `
		INSERT INTO transactions (idempotency_key, receiver_wallet_id, amount, fee_amount, type, status, description)
		VALUES ($1, $2, $3, 0, 'TOPUP', 'SUCCESS', $4)
		RETURNING id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at
	`
	err = tx.QueryRow(ctx, createTxQuery, idmKey, walletID, amount, desc).Scan(
		&transaction.ID,
		&transaction.IdempotencyKey,
		&transaction.SenderWalletID,
		&transaction.ReceiverWalletID,
		&transaction.Amount,
		&transaction.FeeAmount,
		&transaction.Type,
		&transaction.Status,
		&transaction.Description,
		&transaction.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	createLedgerQuery := `
		INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
		VALUES ($1, $2, 'CREDIT', $3, $4)
	`
	_, err = tx.Exec(ctx, createLedgerQuery, transaction.ID, walletID, amount, newBalance)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &transaction, nil
}

func (r *repository) ExecuteTransfer(ctx context.Context, senderWalletID string, receiverWalletID string, amount int64, idmKey string, desc string) (*Transaction, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var existingTx Transaction
	checkIDMQuery := `SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at FROM transactions WHERE idempotency_key = $1`
	err = tx.QueryRow(ctx, checkIDMQuery, idmKey).Scan(
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
	if err == nil {
		return &existingTx, nil
	}

	firstLockID := senderWalletID
	secondLockID := receiverWalletID
	if senderWalletID > receiverWalletID {
		firstLockID = receiverWalletID
		secondLockID = senderWalletID
	}

	var b1, l1 int64
	lock1Query := `SELECT balance, max_balance_limit FROM wallets WHERE id = $1 FOR UPDATE`
	if err := tx.QueryRow(ctx, lock1Query, firstLockID).Scan(&b1, &l1); err != nil {
		return nil, err
	}

	var b2, l2 int64
	lock2Query := `SELECT balance, max_balance_limit FROM wallets WHERE id = $1 FOR UPDATE`
	if err := tx.QueryRow(ctx, lock2Query, secondLockID).Scan(&b2, &l2); err != nil {
		return nil, err
	}

	var senderBalance, receiverBalance, receiverLimit int64
	if senderWalletID == firstLockID {
		senderBalance = b1
		receiverBalance = b2
		receiverLimit = l2
	} else {
		senderBalance = b2
		receiverBalance = b1
		receiverLimit = l1
	}

	if senderBalance < amount {
		return nil, errors.New("insufficient balance")
	}

	newSenderBalance := senderBalance - amount
	newReceiverBalance := receiverBalance + amount

	if newReceiverBalance > receiverLimit {
		return nil, errors.New("receiver balance exceeds maximum wallet limit")
	}

	updateSenderQuery := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	if _, err := tx.Exec(ctx, updateSenderQuery, newSenderBalance, senderWalletID); err != nil {
		return nil, err
	}

	updateReceiverQuery := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	if _, err := tx.Exec(ctx, updateReceiverQuery, newReceiverBalance, receiverWalletID); err != nil {
		return nil, err
	}

	var transaction Transaction
	createTxQuery := `
		INSERT INTO transactions (idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description)
		VALUES ($1, $2, $3, $4, 0, 'TRANSFER', 'SUCCESS', $5)
		RETURNING id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at
	`
	err = tx.QueryRow(ctx, createTxQuery, idmKey, senderWalletID, receiverWalletID, amount, desc).Scan(
		&transaction.ID,
		&transaction.IdempotencyKey,
		&transaction.SenderWalletID,
		&transaction.ReceiverWalletID,
		&transaction.Amount,
		&transaction.FeeAmount,
		&transaction.Type,
		&transaction.Status,
		&transaction.Description,
		&transaction.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	createSenderLedgerQuery := `
		INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
		VALUES ($1, $2, 'DEBIT', $3, $4)
	`
	if _, err := tx.Exec(ctx, createSenderLedgerQuery, transaction.ID, senderWalletID, amount, newSenderBalance); err != nil {
		return nil, err
	}

	createReceiverLedgerQuery := `
		INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
		VALUES ($1, $2, 'CREDIT', $3, $4)
	`
	if _, err := tx.Exec(ctx, createReceiverLedgerQuery, transaction.ID, receiverWalletID, amount, newReceiverBalance); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &transaction, nil
}

func (r *repository) GetTransaction(ctx context.Context, walletID string, limit int, offset int) ([]*Transaction, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT id, idempotency_key, sender_wallet_id, receiver_wallet_id, amount, fee_amount, type, status, description, created_at
		FROM transactions
		WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, walletID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []*Transaction
	for rows.Next() {
		var tx Transaction
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
