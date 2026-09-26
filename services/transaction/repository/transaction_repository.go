package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agamlatiff/bastion/services/transaction/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type transactionRepository struct {
	pool *pgxpool.Pool
}

// NewTransactionRepository instantiates a PostgreSQL transaction repository.
func NewTransactionRepository(pool *pgxpool.Pool) domain.TransactionRepository {
	return &transactionRepository{pool: pool}
}

func (r *transactionRepository) CreateWithHistoryAndOutbox(
	ctx context.Context,
	tx *domain.Transaction,
	history *domain.TransactionStatusHistory,
	outbox *domain.OutboxEvent,
) error {
	dbTx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin db tx: %w", err)
	}
	defer func() { _ = dbTx.Rollback(ctx) }()

	if tx.ID == uuid.Nil {
		tx.ID = uuid.New()
	}
	now := time.Now().UTC()
	if tx.CreatedAt.IsZero() {
		tx.CreatedAt = now
	}
	tx.UpdatedAt = now

	insertTxQuery := `
		INSERT INTO transactions (
			id, idempotency_key, request_hash, sender_wallet_id, receiver_wallet_id,
			amount, fee_amount, currency, type, status, description, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
	`
	_, err = dbTx.Exec(ctx, insertTxQuery,
		tx.ID,
		tx.IdempotencyKey,
		tx.RequestHash,
		tx.SenderWalletID,
		tx.ReceiverWalletID,
		tx.Amount,
		tx.FeeAmount,
		tx.Currency,
		string(tx.Type),
		string(tx.Status),
		tx.Description,
		tx.CreatedAt,
		tx.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("failed to insert transaction: %w", err)
	}

	// 2. Insert audit history
	if history != nil {
		if history.ID == uuid.Nil {
			history.ID = uuid.New()
		}
		if history.CreatedAt.IsZero() {
			history.CreatedAt = now
		}
		history.TransactionID = tx.ID

		var fromStatusStr *string
		if history.FromStatus != nil {
			s := string(*history.FromStatus)
			fromStatusStr = &s
		}

		insertHistoryQuery := `
			INSERT INTO transaction_status_history (
				id, transaction_id, from_status, to_status, reason, created_at
			) VALUES ($1, $2, $3, $4, $5, $6)
		`
		_, err = dbTx.Exec(ctx, insertHistoryQuery,
			history.ID,
			history.TransactionID,
			fromStatusStr,
			string(history.ToStatus),
			history.Reason,
			history.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert status history: %w", err)
		}
	}

	// 3. Insert outbox event if present
	if outbox != nil {
		if outbox.ID == uuid.Nil {
			outbox.ID = uuid.New()
		}
		if outbox.CreatedAt.IsZero() {
			outbox.CreatedAt = now
		}
		if outbox.Status == "" {
			outbox.Status = domain.OutboxStatusPending
		}

		insertOutboxQuery := `
			INSERT INTO outbox_events (
				id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		_, err = dbTx.Exec(ctx, insertOutboxQuery,
			outbox.ID,
			outbox.AggregateType,
			outbox.AggregateID,
			outbox.EventType,
			outbox.Payload,
			string(outbox.Status),
			outbox.RetryCount,
			outbox.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to insert outbox event: %w", err)
		}
	}

	return dbTx.Commit(ctx)
}

func (r *transactionRepository) FindByIdempotencyKey(ctx context.Context, key string) (*domain.Transaction, error) {
	query := `
		SELECT id, idempotency_key, request_hash, sender_wallet_id, receiver_wallet_id,
		       amount, fee_amount, currency, type, status, description, failure_code,
		       failure_reason, created_at, updated_at, completed_at
		FROM transactions
		WHERE idempotency_key = $1
	`
	var tx domain.Transaction
	var txType, txStatus string
	err := r.pool.QueryRow(ctx, query, key).Scan(
		&tx.ID,
		&tx.IdempotencyKey,
		&tx.RequestHash,
		&tx.SenderWalletID,
		&tx.ReceiverWalletID,
		&tx.Amount,
		&tx.FeeAmount,
		&tx.Currency,
		&txType,
		&txStatus,
		&tx.Description,
		&tx.FailureCode,
		&tx.FailureReason,
		&tx.CreatedAt,
		&tx.UpdatedAt,
		&tx.CompletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTransactionNotFound
		}
		return nil, fmt.Errorf("failed to find transaction by idempotency key: %w", err)
	}
	tx.Type = domain.TransactionType(txType)
	tx.Status = domain.TransactionStatus(txStatus)
	return &tx, nil
}

func (r *transactionRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.Transaction, error) {
	query := `
		SELECT id, idempotency_key, request_hash, sender_wallet_id, receiver_wallet_id,
		       amount, fee_amount, currency, type, status, description, failure_code,
		       failure_reason, created_at, updated_at, completed_at
		FROM transactions
		WHERE id = $1
	`
	var tx domain.Transaction
	var txType, txStatus string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&tx.ID,
		&tx.IdempotencyKey,
		&tx.RequestHash,
		&tx.SenderWalletID,
		&tx.ReceiverWalletID,
		&tx.Amount,
		&tx.FeeAmount,
		&tx.Currency,
		&txType,
		&txStatus,
		&tx.Description,
		&tx.FailureCode,
		&tx.FailureReason,
		&tx.CreatedAt,
		&tx.UpdatedAt,
		&tx.CompletedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTransactionNotFound
		}
		return nil, fmt.Errorf("failed to find transaction by id: %w", err)
	}
	tx.Type = domain.TransactionType(txType)
	tx.Status = domain.TransactionStatus(txStatus)
	return &tx, nil
}

func (r *transactionRepository) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, int, error) {
	var whereClauses []string
	var args []any
	argIdx := 1

	if filter.WalletID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("(sender_wallet_id = $%d OR receiver_wallet_id = $%d)", argIdx, argIdx))
		args = append(args, *filter.WalletID)
		argIdx++
	}
	if filter.SenderWalletID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("sender_wallet_id = $%d", argIdx))
		args = append(args, *filter.SenderWalletID)
		argIdx++
	}
	if filter.ReceiverWalletID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("receiver_wallet_id = $%d", argIdx))
		args = append(args, *filter.ReceiverWalletID)
		argIdx++
	}
	if filter.Status != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, string(*filter.Status))
		argIdx++
	}
	if filter.Type != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("type = $%d", argIdx))
		args = append(args, string(*filter.Type))
		argIdx++
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM transactions %s", whereSQL)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count transactions: %w", err)
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	listQuery := fmt.Sprintf(`
		SELECT id, idempotency_key, request_hash, sender_wallet_id, receiver_wallet_id,
		       amount, fee_amount, currency, type, status, description, failure_code,
		       failure_reason, created_at, updated_at, completed_at
		FROM transactions
		%s
		ORDER BY created_at DESC, id
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list transactions: %w", err)
	}
	defer rows.Close()

	var results []domain.Transaction
	for rows.Next() {
		var tx domain.Transaction
		var txType, txStatus string
		if err := rows.Scan(
			&tx.ID,
			&tx.IdempotencyKey,
			&tx.RequestHash,
			&tx.SenderWalletID,
			&tx.ReceiverWalletID,
			&tx.Amount,
			&tx.FeeAmount,
			&tx.Currency,
			&txType,
			&txStatus,
			&tx.Description,
			&tx.FailureCode,
			&tx.FailureReason,
			&tx.CreatedAt,
			&tx.UpdatedAt,
			&tx.CompletedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan transaction row: %w", err)
		}
		tx.Type = domain.TransactionType(txType)
		tx.Status = domain.TransactionStatus(txStatus)
		results = append(results, tx)
	}

	return results, total, nil
}

func (r *transactionRepository) UpdateStatusWithHistoryAndOutbox(
	ctx context.Context,
	txID uuid.UUID,
	toStatus domain.TransactionStatus,
	failureCode, failureReason, reason *string,
	completedAt *time.Time,
	outbox *domain.OutboxEvent,
) (*domain.Transaction, error) {
	dbTx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin db tx: %w", err)
	}
	defer func() { _ = dbTx.Rollback(ctx) }()

	// Lock the row to prevent concurrent transitions
	var currentStatusStr string
	err = dbTx.QueryRow(ctx, "SELECT status FROM transactions WHERE id = $1 FOR UPDATE", txID).Scan(&currentStatusStr)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTransactionNotFound
		}
		return nil, fmt.Errorf("failed to lock transaction for update: %w", err)
	}
	fromStatus := domain.TransactionStatus(currentStatusStr)

	now := time.Now().UTC()
	updateQuery := `
		UPDATE transactions
		SET status = $1, failure_code = $2, failure_reason = $3, completed_at = $4, updated_at = $5
		WHERE id = $6
		RETURNING id, idempotency_key, request_hash, sender_wallet_id, receiver_wallet_id,
		          amount, fee_amount, currency, type, status, description, failure_code,
		          failure_reason, created_at, updated_at, completed_at
	`
	var updatedTx domain.Transaction
	var txType, txStatus string
	err = dbTx.QueryRow(ctx, updateQuery,
		string(toStatus),
		failureCode,
		failureReason,
		completedAt,
		now,
		txID,
	).Scan(
		&updatedTx.ID,
		&updatedTx.IdempotencyKey,
		&updatedTx.RequestHash,
		&updatedTx.SenderWalletID,
		&updatedTx.ReceiverWalletID,
		&updatedTx.Amount,
		&updatedTx.FeeAmount,
		&updatedTx.Currency,
		&txType,
		&txStatus,
		&updatedTx.Description,
		&updatedTx.FailureCode,
		&updatedTx.FailureReason,
		&updatedTx.CreatedAt,
		&updatedTx.UpdatedAt,
		&updatedTx.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update transaction: %w", err)
	}
	updatedTx.Type = domain.TransactionType(txType)
	updatedTx.Status = domain.TransactionStatus(txStatus)

	// Insert history
	historyID := uuid.New()
	fromStatusVal := string(fromStatus)
	insertHistoryQuery := `
		INSERT INTO transaction_status_history (
			id, transaction_id, from_status, to_status, reason, created_at
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err = dbTx.Exec(ctx, insertHistoryQuery,
		historyID,
		txID,
		&fromStatusVal,
		string(toStatus),
		reason,
		now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to record status history: %w", err)
	}

	// Insert outbox event if present
	if outbox != nil {
		if outbox.ID == uuid.Nil {
			outbox.ID = uuid.New()
		}
		if outbox.CreatedAt.IsZero() {
			outbox.CreatedAt = now
		}
		if outbox.Status == "" {
			outbox.Status = domain.OutboxStatusPending
		}

		insertOutboxQuery := `
			INSERT INTO outbox_events (
				id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		_, err = dbTx.Exec(ctx, insertOutboxQuery,
			outbox.ID,
			outbox.AggregateType,
			outbox.AggregateID,
			outbox.EventType,
			outbox.Payload,
			string(outbox.Status),
			outbox.RetryCount,
			outbox.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to record outbox event: %w", err)
		}
	}

	if err := dbTx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit status update tx: %w", err)
	}

	return &updatedTx, nil
}

func (r *transactionRepository) GetStatusHistory(ctx context.Context, txID uuid.UUID) ([]domain.TransactionStatusHistory, error) {
	query := `
		SELECT id, transaction_id, from_status, to_status, reason, created_at
		FROM transaction_status_history
		WHERE transaction_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, txID)
	if err != nil {
		return nil, fmt.Errorf("failed to query status history: %w", err)
	}
	defer rows.Close()

	var history []domain.TransactionStatusHistory
	for rows.Next() {
		var h domain.TransactionStatusHistory
		var fromStatusStr *string
		var toStatusStr string
		if err := rows.Scan(
			&h.ID,
			&h.TransactionID,
			&fromStatusStr,
			&toStatusStr,
			&h.Reason,
			&h.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan status history row: %w", err)
		}
		if fromStatusStr != nil {
			fs := domain.TransactionStatus(*fromStatusStr)
			h.FromStatus = &fs
		}
		h.ToStatus = domain.TransactionStatus(toStatusStr)
		history = append(history, h)
	}

	return history, nil
}
