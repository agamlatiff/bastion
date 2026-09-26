package domain

import (
	"time"

	"github.com/google/uuid"
)

// TransactionType classifies the business transaction.
type TransactionType string

const (
	TypeTopup      TransactionType = "TOPUP"
	TypeTransfer   TransactionType = "TRANSFER"
	TypeWithdrawal TransactionType = "WITHDRAWAL"
	TypeRefund     TransactionType = "REFUND"
	TypeReversal   TransactionType = "REVERSAL"
)

// TransactionStatus models the state machine of the business transaction.
type TransactionStatus string

const (
	StatusCreated    TransactionStatus = "CREATED"
	StatusProcessing TransactionStatus = "PROCESSING"
	StatusCompleted  TransactionStatus = "COMPLETED"
	StatusFailed     TransactionStatus = "FAILED"
	StatusReversed   TransactionStatus = "REVERSED"
)

// Transaction represents the core business transaction entity.
type Transaction struct {
	ID               uuid.UUID         `json:"id"`
	IdempotencyKey   string            `json:"idempotency_key"`
	RequestHash      string            `json:"request_hash"`
	SenderWalletID   *uuid.UUID        `json:"sender_wallet_id,omitempty"`
	ReceiverWalletID *uuid.UUID        `json:"receiver_wallet_id,omitempty"`
	Amount           int64             `json:"amount"`     // stored in minor currency units
	FeeAmount        int64             `json:"fee_amount"` // stored in minor currency units
	Currency         string            `json:"currency"`
	Type             TransactionType   `json:"type"`
	Status           TransactionStatus `json:"status"`
	Description      *string           `json:"description,omitempty"`
	FailureCode      *string           `json:"failure_code,omitempty"`
	FailureReason    *string           `json:"failure_reason,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
	CompletedAt      *time.Time        `json:"completed_at,omitempty"`
}

// TransactionStatusHistory records state machine transitions for auditing.
type TransactionStatusHistory struct {
	ID            uuid.UUID          `json:"id"`
	TransactionID uuid.UUID          `json:"transaction_id"`
	FromStatus    *TransactionStatus `json:"from_status,omitempty"`
	ToStatus      TransactionStatus  `json:"to_status"`
	Reason        *string            `json:"reason,omitempty"`
	CreatedAt     time.Time          `json:"created_at"`
}

// OutboxStatus defines outbox event delivery states.
type OutboxStatus string

const (
	OutboxStatusPending   OutboxStatus = "PENDING"
	OutboxStatusPublished OutboxStatus = "PUBLISHED"
	OutboxStatusFailed    OutboxStatus = "FAILED"
)

// OutboxEvent models a transactional outbox domain event.
type OutboxEvent struct {
	ID            uuid.UUID    `json:"id"`
	AggregateType string       `json:"aggregate_type"`
	AggregateID   uuid.UUID    `json:"aggregate_id"`
	EventType     string       `json:"event_type"`
	Payload       []byte       `json:"payload"`
	Status        OutboxStatus `json:"status"`
	RetryCount    int          `json:"retry_count"`
	CreatedAt     time.Time    `json:"created_at"`
	PublishedAt   *time.Time   `json:"published_at,omitempty"`
}
