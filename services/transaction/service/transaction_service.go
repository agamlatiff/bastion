package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agamlatiff/bastion/services/transaction/domain"
	"github.com/google/uuid"
)

// TransactionService defines business workflows for transaction orchestration and state tracking.
type TransactionService interface {
	CreateTransaction(ctx context.Context, req domain.CreateTransactionRequest) (*domain.Transaction, bool, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Transaction, error)
	GetStatusHistory(ctx context.Context, id uuid.UUID) ([]domain.TransactionStatusHistory, error)
	ListTransactions(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, req domain.UpdateTransactionStatusRequest) (*domain.Transaction, error)
}

type transactionService struct {
	repo domain.TransactionRepository
}

// NewTransactionService instantiates the domain transaction orchestration service.
func NewTransactionService(repo domain.TransactionRepository) TransactionService {
	return &transactionService{repo: repo}
}

func (s *transactionService) CreateTransaction(
	ctx context.Context,
	req domain.CreateTransactionRequest,
) (*domain.Transaction, bool, error) {
	// 1. Validate Idempotency Key
	idempotencyKey := strings.TrimSpace(req.IdempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = uuid.New().String()
		req.IdempotencyKey = idempotencyKey
	}

	requestHash := req.ComputeHash()

	// 2. Check for existing idempotency key
	existing, err := s.repo.FindByIdempotencyKey(ctx, idempotencyKey)
	if err == nil && existing != nil {
		// Existing record found: verify payload equality
		if existing.RequestHash != requestHash {
			return nil, false, domain.ErrIdempotencyConflict
		}
		// Exact replay: return existing entity safely
		return existing, true, nil
	} else if err != nil && !errors.Is(err, domain.ErrTransactionNotFound) {
		return nil, false, fmt.Errorf("failed to query existing transaction: %w", err)
	}

	// 3. Validate monetary rules and domain invariants
	if req.Amount <= 0 {
		return nil, false, domain.ErrInvalidAmount
	}
	if req.FeeAmount < 0 {
		return nil, false, domain.ErrInvalidFee
	}
	currency := strings.ToUpper(strings.TrimSpace(req.Currency))
	if len(currency) != 3 {
		return nil, false, domain.ErrInvalidCurrency
	}
	req.Currency = currency

	// 4. Validate transaction type specifics
	switch req.Type {
	case domain.TypeTopup:
		if req.ReceiverWalletID == nil {
			return nil, false, domain.ErrMissingWalletID
		}
	case domain.TypeWithdrawal:
		if req.SenderWalletID == nil {
			return nil, false, domain.ErrMissingWalletID
		}
	case domain.TypeTransfer:
		if req.SenderWalletID == nil || req.ReceiverWalletID == nil {
			return nil, false, domain.ErrMissingWalletID
		}
		if *req.SenderWalletID == *req.ReceiverWalletID {
			return nil, false, domain.ErrSameSenderReceiver
		}
	case domain.TypeRefund, domain.TypeReversal:
		if req.SenderWalletID == nil && req.ReceiverWalletID == nil {
			return nil, false, domain.ErrMissingWalletID
		}
	default:
		return nil, false, domain.ErrInvalidTransactionType
	}

	// 5. Construct domain transaction entity
	now := time.Now().UTC()
	tx := &domain.Transaction{
		ID:               uuid.New(),
		IdempotencyKey:   idempotencyKey,
		RequestHash:      requestHash,
		SenderWalletID:   req.SenderWalletID,
		ReceiverWalletID: req.ReceiverWalletID,
		Amount:           req.Amount,
		FeeAmount:        req.FeeAmount,
		Currency:         currency,
		Type:             req.Type,
		Status:           domain.StatusCreated,
		Description:      req.Description,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	// 6. Audit trail entry
	reason := "Transaction initiated"
	history := &domain.TransactionStatusHistory{
		ID:            uuid.New(),
		TransactionID: tx.ID,
		FromStatus:    nil,
		ToStatus:      domain.StatusCreated,
		Reason:        &reason,
		CreatedAt:     now,
	}

	// 7. Transactional Outbox Event
	var senderStr, receiverStr *string
	if tx.SenderWalletID != nil {
		s := tx.SenderWalletID.String()
		senderStr = &s
	}
	if tx.ReceiverWalletID != nil {
		r := tx.ReceiverWalletID.String()
		receiverStr = &r
	}

	eventPayload := domain.TransactionEventPayload{
		EventID:          uuid.New().String(),
		EventType:        "TransactionCreated",
		AggregateID:      tx.ID.String(),
		IdempotencyKey:   tx.IdempotencyKey,
		SenderWalletID:   senderStr,
		ReceiverWalletID: receiverStr,
		Amount:           tx.Amount,
		FeeAmount:        tx.FeeAmount,
		Currency:         tx.Currency,
		Type:             tx.Type,
		Status:           tx.Status,
		Timestamp:        now,
	}

	payloadBytes, err := json.Marshal(eventPayload)
	if err != nil {
		return nil, false, fmt.Errorf("failed to marshal outbox event: %w", err)
	}

	outbox := &domain.OutboxEvent{
		ID:            uuid.New(),
		AggregateType: "TRANSACTION",
		AggregateID:   tx.ID,
		EventType:     "TransactionCreated",
		Payload:       payloadBytes,
		Status:        domain.OutboxStatusPending,
		RetryCount:    0,
		CreatedAt:     now,
	}

	// 8. Commit atomically
	if err := s.repo.CreateWithHistoryAndOutbox(ctx, tx, history, outbox); err != nil {
		return nil, false, fmt.Errorf("failed to persist transaction: %w", err)
	}

	return tx, false, nil
}

func (s *transactionService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Transaction, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *transactionService) GetStatusHistory(ctx context.Context, id uuid.UUID) ([]domain.TransactionStatusHistory, error) {
	// Ensure transaction exists
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return nil, err
	}
	return s.repo.GetStatusHistory(ctx, id)
}

func (s *transactionService) ListTransactions(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, int, error) {
	return s.repo.List(ctx, filter)
}

func (s *transactionService) UpdateStatus(
	ctx context.Context,
	id uuid.UUID,
	req domain.UpdateTransactionStatusRequest,
) (*domain.Transaction, error) {
	current, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Validate State Machine Transitions
	validTransition := false
	switch current.Status {
	case domain.StatusCreated:
		validTransition = (req.Status == domain.StatusProcessing || req.Status == domain.StatusFailed)
	case domain.StatusProcessing:
		validTransition = (req.Status == domain.StatusCompleted || req.Status == domain.StatusFailed)
	case domain.StatusCompleted:
		validTransition = (req.Status == domain.StatusReversed)
	case domain.StatusFailed, domain.StatusReversed:
		// Terminal states cannot transition further
		validTransition = false
	}

	if !validTransition {
		return nil, domain.ErrInvalidStateTransition
	}

	now := time.Now().UTC()
	var completedAt *time.Time
	if req.Status == domain.StatusCompleted {
		completedAt = &now
	}

	// Generate Outbox Event
	eventType := fmt.Sprintf("Transaction%s", strings.Title(strings.ToLower(string(req.Status))))
	var senderStr, receiverStr *string
	if current.SenderWalletID != nil {
		s := current.SenderWalletID.String()
		senderStr = &s
	}
	if current.ReceiverWalletID != nil {
		r := current.ReceiverWalletID.String()
		receiverStr = &r
	}

	payload := domain.TransactionEventPayload{
		EventID:          uuid.New().String(),
		EventType:        eventType,
		AggregateID:      current.ID.String(),
		IdempotencyKey:   current.IdempotencyKey,
		SenderWalletID:   senderStr,
		ReceiverWalletID: receiverStr,
		Amount:           current.Amount,
		FeeAmount:        current.FeeAmount,
		Currency:         current.Currency,
		Type:             current.Type,
		Status:           req.Status,
		FailureCode:      req.FailureCode,
		FailureReason:    req.FailureReason,
		Timestamp:        now,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal status event payload: %w", err)
	}

	outbox := &domain.OutboxEvent{
		ID:            uuid.New(),
		AggregateType: "TRANSACTION",
		AggregateID:   current.ID,
		EventType:     eventType,
		Payload:       payloadBytes,
		Status:        domain.OutboxStatusPending,
		RetryCount:    0,
		CreatedAt:     now,
	}

	return s.repo.UpdateStatusWithHistoryAndOutbox(
		ctx,
		id,
		req.Status,
		req.FailureCode,
		req.FailureReason,
		req.Reason,
		completedAt,
		outbox,
	)
}
