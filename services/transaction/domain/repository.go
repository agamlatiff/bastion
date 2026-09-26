package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TransactionFilter specifies filtering and pagination criteria for listing transactions.
type TransactionFilter struct {
	WalletID         *uuid.UUID
	SenderWalletID   *uuid.UUID
	ReceiverWalletID *uuid.UUID
	Status           *TransactionStatus
	Type             *TransactionType
	Limit            int
	Offset           int
}

// TransactionRepository provides atomic persistence operations for transactions and their audit trails.
type TransactionRepository interface {
	CreateWithHistoryAndOutbox(ctx context.Context, tx *Transaction, history *TransactionStatusHistory, outbox *OutboxEvent) error
	FindByIdempotencyKey(ctx context.Context, key string) (*Transaction, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Transaction, error)
	List(ctx context.Context, filter TransactionFilter) ([]Transaction, int, error)
	UpdateStatusWithHistoryAndOutbox(ctx context.Context, txID uuid.UUID, toStatus TransactionStatus, failureCode, failureReason, reason *string, completedAt *time.Time, outbox *OutboxEvent) (*Transaction, error)
	GetStatusHistory(ctx context.Context, txID uuid.UUID) ([]TransactionStatusHistory, error)
}

// OutboxRepository handles transactional outbox polling and publishing state.
type OutboxRepository interface {
	GetPendingEvents(ctx context.Context, batchSize int) ([]OutboxEvent, error)
	MarkEventPublished(ctx context.Context, id uuid.UUID) error
}
