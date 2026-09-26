package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// CreateTransactionRequest defines the incoming payload for creating a transaction.
type CreateTransactionRequest struct {
	IdempotencyKey   string          `json:"idempotency_key"`
	SenderWalletID   *uuid.UUID      `json:"sender_wallet_id,omitempty"`
	ReceiverWalletID *uuid.UUID      `json:"receiver_wallet_id,omitempty"`
	Amount           int64           `json:"amount" binding:"required"`
	FeeAmount        int64           `json:"fee_amount"`
	Currency         string          `json:"currency" binding:"required"`
	Type             TransactionType `json:"type" binding:"required"`
	Description      *string         `json:"description,omitempty"`
}

// ComputeHash computes a deterministic SHA-256 hash of the request content.
func (r *CreateTransactionRequest) ComputeHash() string {
	senderStr := ""
	if r.SenderWalletID != nil {
		senderStr = r.SenderWalletID.String()
	}
	receiverStr := ""
	if r.ReceiverWalletID != nil {
		receiverStr = r.ReceiverWalletID.String()
	}
	descStr := ""
	if r.Description != nil {
		descStr = *r.Description
	}

	raw := fmt.Sprintf("%s|%s|%s|%d|%d|%s|%s",
		strings.ToUpper(string(r.Type)),
		senderStr,
		receiverStr,
		r.Amount,
		r.FeeAmount,
		strings.ToUpper(strings.TrimSpace(r.Currency)),
		descStr,
	)

	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

// TransferRequest is a specialized DTO for wallet-to-wallet transfers.
type TransferRequest struct {
	IdempotencyKey   string    `json:"idempotency_key"`
	SenderWalletID   uuid.UUID `json:"sender_wallet_id" binding:"required"`
	ReceiverWalletID uuid.UUID `json:"receiver_wallet_id" binding:"required"`
	Amount           int64     `json:"amount" binding:"required"`
	FeeAmount        int64     `json:"fee_amount"`
	Currency         string    `json:"currency" binding:"required"`
	Description      *string   `json:"description,omitempty"`
}

// ToCreateRequest converts a TransferRequest to a generic CreateTransactionRequest.
func (t *TransferRequest) ToCreateRequest() CreateTransactionRequest {
	return CreateTransactionRequest{
		IdempotencyKey:   t.IdempotencyKey,
		SenderWalletID:   &t.SenderWalletID,
		ReceiverWalletID: &t.ReceiverWalletID,
		Amount:           t.Amount,
		FeeAmount:        t.FeeAmount,
		Currency:         t.Currency,
		Type:             TypeTransfer,
		Description:      t.Description,
	}
}

// TopupRequest is a specialized DTO for funding a wallet.
type TopupRequest struct {
	IdempotencyKey   string    `json:"idempotency_key"`
	ReceiverWalletID uuid.UUID `json:"receiver_wallet_id" binding:"required"`
	Amount           int64     `json:"amount" binding:"required"`
	FeeAmount        int64     `json:"fee_amount"`
	Currency         string    `json:"currency" binding:"required"`
	Description      *string   `json:"description,omitempty"`
}

// ToCreateRequest converts a TopupRequest to a generic CreateTransactionRequest.
func (t *TopupRequest) ToCreateRequest() CreateTransactionRequest {
	return CreateTransactionRequest{
		IdempotencyKey:   t.IdempotencyKey,
		SenderWalletID:   nil,
		ReceiverWalletID: &t.ReceiverWalletID,
		Amount:           t.Amount,
		FeeAmount:        t.FeeAmount,
		Currency:         t.Currency,
		Type:             TypeTopup,
		Description:      t.Description,
	}
}

// UpdateTransactionStatusRequest defines the payload for transitioning transaction state.
type UpdateTransactionStatusRequest struct {
	Status        TransactionStatus `json:"status" binding:"required"`
	FailureCode   *string           `json:"failure_code,omitempty"`
	FailureReason *string           `json:"failure_reason,omitempty"`
	Reason        *string           `json:"reason,omitempty"`
}

// TransactionResponse is the public representation of a transaction.
type TransactionResponse struct {
	ID               uuid.UUID         `json:"id"`
	IdempotencyKey   string            `json:"idempotency_key"`
	SenderWalletID   *uuid.UUID        `json:"sender_wallet_id,omitempty"`
	ReceiverWalletID *uuid.UUID        `json:"receiver_wallet_id,omitempty"`
	Amount           int64             `json:"amount"`
	FeeAmount        int64             `json:"fee_amount"`
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

// ToResponse maps a domain entity to TransactionResponse.
func (t *Transaction) ToResponse() TransactionResponse {
	return TransactionResponse{
		ID:               t.ID,
		IdempotencyKey:   t.IdempotencyKey,
		SenderWalletID:   t.SenderWalletID,
		ReceiverWalletID: t.ReceiverWalletID,
		Amount:           t.Amount,
		FeeAmount:        t.FeeAmount,
		Currency:         t.Currency,
		Type:             t.Type,
		Status:           t.Status,
		Description:      t.Description,
		FailureCode:      t.FailureCode,
		FailureReason:    t.FailureReason,
		CreatedAt:        t.CreatedAt,
		UpdatedAt:        t.UpdatedAt,
		CompletedAt:      t.CompletedAt,
	}
}

// TransactionListResponse represents paginated transaction results.
type TransactionListResponse struct {
	Items  []TransactionResponse `json:"items"`
	Total  int                   `json:"total"`
	Limit  int                   `json:"limit"`
	Offset int                   `json:"offset"`
}

// TransactionStatusHistoryResponse is the public representation of status history.
type TransactionStatusHistoryResponse struct {
	ID            uuid.UUID          `json:"id"`
	TransactionID uuid.UUID          `json:"transaction_id"`
	FromStatus    *TransactionStatus `json:"from_status,omitempty"`
	ToStatus      TransactionStatus  `json:"to_status"`
	Reason        *string            `json:"reason,omitempty"`
	CreatedAt     time.Time          `json:"created_at"`
}

// ToResponse maps history entity to DTO.
func (h *TransactionStatusHistory) ToResponse() TransactionStatusHistoryResponse {
	return TransactionStatusHistoryResponse{
		ID:            h.ID,
		TransactionID: h.TransactionID,
		FromStatus:    h.FromStatus,
		ToStatus:      h.ToStatus,
		Reason:        h.Reason,
		CreatedAt:     h.CreatedAt,
	}
}

// Domain Event Payloads

// TransactionEventPayload contains event data published to Kafka.
type TransactionEventPayload struct {
	EventID          string            `json:"event_id"`
	EventType        string            `json:"event_type"`
	AggregateID      string            `json:"aggregate_id"`
	IdempotencyKey   string            `json:"idempotency_key"`
	SenderWalletID   *string           `json:"sender_wallet_id,omitempty"`
	ReceiverWalletID *string           `json:"receiver_wallet_id,omitempty"`
	Amount           int64             `json:"amount"`
	FeeAmount        int64             `json:"fee_amount"`
	Currency         string            `json:"currency"`
	Type             TransactionType   `json:"type"`
	Status           TransactionStatus `json:"status"`
	FailureCode      *string           `json:"failure_code,omitempty"`
	FailureReason    *string           `json:"failure_reason,omitempty"`
	Timestamp        time.Time         `json:"timestamp"`
}
