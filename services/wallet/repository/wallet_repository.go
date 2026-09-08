package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/services/wallet/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// WalletRepository defines persistence operations for wallets and transactional outbox.
type WalletRepository interface {
	Create(ctx context.Context, wallet *domain.Wallet) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Wallet, error)
	GetByCustomerID(ctx context.Context, customerID uuid.UUID) ([]*domain.Wallet, error)
	GetActiveByCustomerAndCurrency(ctx context.Context, customerID uuid.UUID, currency string) (*domain.Wallet, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus) error
	UpdateStatusWithOutbox(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus, event *domain.EventEnvelope) error
	CreateSnapshot(ctx context.Context, walletID uuid.UUID, balance int64) error

	// Outbox operations
	SaveOutboxEvent(ctx context.Context, event *domain.EventEnvelope) error
	GetPendingOutboxEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error)
	MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error
}

type postgresWalletRepository struct {
	pool *pgxpool.Pool
}

func NewWalletRepository(pool *pgxpool.Pool) WalletRepository {
	return &postgresWalletRepository{pool: pool}
}

func (r *postgresWalletRepository) Create(ctx context.Context, wallet *domain.Wallet) error {
	query := `
		INSERT INTO wallets (id, customer_id, currency, balance, max_balance_limit, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	now := time.Now().UTC()
	if wallet.ID == uuid.Nil {
		wallet.ID = uuid.New()
	}
	wallet.CreatedAt = now
	wallet.UpdatedAt = now

	_, err := r.pool.Exec(ctx, query,
		wallet.ID,
		wallet.CustomerID,
		wallet.Currency,
		wallet.Balance,
		wallet.MaxBalanceLimit,
		wallet.Status,
		wallet.CreatedAt,
		wallet.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrDuplicateWallet
		}
		return err
	}
	return nil
}

func (r *postgresWalletRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Wallet, error) {
	query := `
		SELECT id, customer_id, currency, balance, max_balance_limit, status, created_at, updated_at
		FROM wallets
		WHERE id = $1
	`
	var w domain.Wallet
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&w.ID,
		&w.CustomerID,
		&w.Currency,
		&w.Balance,
		&w.MaxBalanceLimit,
		&w.Status,
		&w.CreatedAt,
		&w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrWalletNotFound
		}
		return nil, err
	}
	return &w, nil
}

func (r *postgresWalletRepository) GetByCustomerID(ctx context.Context, customerID uuid.UUID) ([]*domain.Wallet, error) {
	query := `
		SELECT id, customer_id, currency, balance, max_balance_limit, status, created_at, updated_at
		FROM wallets
		WHERE customer_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var wallets []*domain.Wallet
	for rows.Next() {
		var w domain.Wallet
		if err := rows.Scan(
			&w.ID,
			&w.CustomerID,
			&w.Currency,
			&w.Balance,
			&w.MaxBalanceLimit,
			&w.Status,
			&w.CreatedAt,
			&w.UpdatedAt,
		); err != nil {
			return nil, err
		}
		wallets = append(wallets, &w)
	}
	return wallets, rows.Err()
}

func (r *postgresWalletRepository) GetActiveByCustomerAndCurrency(ctx context.Context, customerID uuid.UUID, currency string) (*domain.Wallet, error) {
	query := `
		SELECT id, customer_id, currency, balance, max_balance_limit, status, created_at, updated_at
		FROM wallets
		WHERE customer_id = $1 AND currency = $2 AND status != 'CLOSED'
		LIMIT 1
	`
	var w domain.Wallet
	err := r.pool.QueryRow(ctx, query, customerID, currency).Scan(
		&w.ID,
		&w.CustomerID,
		&w.Currency,
		&w.Balance,
		&w.MaxBalanceLimit,
		&w.Status,
		&w.CreatedAt,
		&w.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrWalletNotFound
		}
		return nil, err
	}
	return &w, nil
}

func (r *postgresWalletRepository) UpdateStatus(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus) error {
	query := `
		UPDATE wallets
		SET status = $1, updated_at = $2
		WHERE id = $3 AND status = $4
	`
	now := time.Now().UTC()
	tag, err := r.pool.Exec(ctx, query, toStatus, now, id, fromStatus)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		existing, getErr := r.GetByID(ctx, id)
		if getErr != nil {
			return getErr
		}
		if existing.Status == domain.StatusClosed {
			return domain.ErrWalletClosed
		}
		return domain.ErrInvalidTransition
	}
	return nil
}

// UpdateStatusWithOutbox atomik memperbarui status wallet dan menyimpan event ke outbox dalam 1 transaksi DB
func (r *postgresWalletRepository) UpdateStatusWithOutbox(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus, event *domain.EventEnvelope) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Update wallet status
	query := `
		UPDATE wallets
		SET status = $1, updated_at = $2
		WHERE id = $3 AND status = $4
	`
	now := time.Now().UTC()
	tag, err := tx.Exec(ctx, query, toStatus, now, id, fromStatus)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrInvalidTransition
	}

	// 2. Insert outbox event in the same ACID transaction
	if event != nil {
		payloadBytes, err := json.Marshal(event)
		if err != nil {
			return err
		}
		outboxQuery := `
			INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at)
			VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
		`
		_, err = tx.Exec(ctx, outboxQuery, event.EventID, "WALLET", event.AggregateID, event.EventType, payloadBytes, now)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *postgresWalletRepository) CreateSnapshot(ctx context.Context, walletID uuid.UUID, balance int64) error {
	query := `
		INSERT INTO wallet_balance_snapshots (id, wallet_id, balance, snapshot_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err := r.pool.Exec(ctx, query, uuid.New(), walletID, balance, time.Now().UTC())
	return err
}

func (r *postgresWalletRepository) SaveOutboxEvent(ctx context.Context, event *domain.EventEnvelope) error {
	payloadBytes, err := json.Marshal(event)
	if err != nil {
		return err
	}
	query := `
		INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at)
		VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)
	`
	_, err = r.pool.Exec(ctx, query, event.EventID, "WALLET", event.AggregateID, event.EventType, payloadBytes, time.Now().UTC())
	return err
}

func (r *postgresWalletRepository) GetPendingOutboxEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	query := `
		SELECT id, aggregate_type, aggregate_id, event_type, payload, status, created_at, published_at
		FROM outbox_events
		WHERE status = 'PENDING'
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*domain.OutboxEvent
	for rows.Next() {
		var e domain.OutboxEvent
		if err := rows.Scan(
			&e.ID,
			&e.AggregateType,
			&e.AggregateID,
			&e.EventType,
			&e.Payload,
			&e.Status,
			&e.CreatedAt,
			&e.PublishedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, &e)
	}
	return events, rows.Err()
}

func (r *postgresWalletRepository) MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE outbox_events
		SET status = 'PUBLISHED', published_at = $1
		WHERE id = $2
	`
	_, err := r.pool.Exec(ctx, query, time.Now().UTC(), id)
	return err
}
