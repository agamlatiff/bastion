package wallet

import (
	"errors"
	"time"
)

type TransactionState string

const (
	StatePending    TransactionState = "PENDING"
	StateProcessing TransactionState = "PROCESSING"
	StateCompleted  TransactionState = "COMPLETED"
	StateFailed     TransactionState = "FAILED"
)

type TransactionHistory struct {
	ID            string           `json:"id"`
	TransactionID string           `json:"transaction_id"`
	StateFrom     TransactionState `json:"state_from"`
	StateTo       TransactionState `json:"state_to"`
	Reason        string           `json:"reason"`
	CreatedAt     time.Time        `json:"created_at"`
}

var (
	ErrInsufficientBalance    = errors.New("insufficient balance")
	ErrExceedsMaxLimit        = errors.New("balance exceeds maximum wallet limit")
	ErrInvalidAmount          = errors.New("amount must be greater than zero")
	ErrSelfTransfer           = errors.New("cannot transfer to your own account")
	ErrKYCRequired            = errors.New("sender must be KYC verified to perform transfer")
	ErrDailyLimitExceeded     = errors.New("daily transaction limit exceeded")
	ErrMonthlyLimitExceeded   = errors.New("monthly transaction limit exceeded")
	ErrInvalidReceiver        = errors.New("invalid receiver wallet")
	ErrConcurrentRequest      = errors.New("concurrent request detected for the same idempotency key")
	ErrInvalidStateTransition = errors.New("invalid transaction state transition")
)

type Wallet struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	Balance         int64     `json:"balance"`
	Currency        string    `json:"currency"`
	MaxBalanceLimit int64     `json:"max_balance_limit"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Transaction struct {
	ID               string           `json:"id"`
	IdempotencyKey   string           `json:"idempotency_key"`
	SenderWalletID   *string          `json:"sender_wallet_id,omitempty"`
	ReceiverWalletID *string          `json:"receiver_wallet_id,omitempty"`
	Amount           int64            `json:"amount"`
	FeeAmount        int64            `json:"fee_amount"`
	Type             string           `json:"type"`
	Status           TransactionState `json:"status"`
	Description      string           `json:"description"`
	CreatedAt        time.Time        `json:"created_at"`
}

type LedgerEntry struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	EntryType     string    `json:"entry_type"`
	Amount        int64     `json:"amount"`
	BalanceAfter  int64     `json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}

type TransferRequest struct {
	ReceiverEmail  string `json:"receiver_email" binding:"required,email"`
	Amount         int64  `json:"amount" binding:"required,gt=0"`
	IdempotencyKey string `json:"idempotency_key" binding:"required,max=100"`
	Description    string `json:"description" binding:"required,max=255"`
}

type TopUpRequest struct {
	Amount         int64  `json:"amount" binding:"required,gt=0"`
	IdempotencyKey string `json:"idempotency_key" binding:"required,max=100"`
	Description    string `json:"description" binding:"omitempty,max=255"`
}

type GetTransactionRequest struct {
	Limit  int `form:"limit" binding:"omitempty,min=1,max=100"`
	Offset int `form:"offset" binding:"omitempty,min=0"`
}

type WalletBalanceResponse struct {
	WalletID        string `json:"wallet_id"`
	UserID          string `json:"user_id"`
	Balance         int64  `json:"balance"`
	Currency        string `json:"currency"`
	MaxBalanceLimit int64  `json:"max_balance_limit"`
}

func (t *Transaction) TransitionTo(newState TransactionState, reason string) (*TransactionHistory, error) {
	if !t.isValidTransition(newState) {
		return nil, ErrInvalidStateTransition
	}

	// Create the history record BEFORE we overwrite the old state
	history := &TransactionHistory{
		TransactionID: t.ID,
		StateFrom:     t.Status,
		StateTo:       newState,
		Reason:        reason,
	}

	// Update the actual transaction state
	t.Status = newState
	return history, nil
}

func (t *Transaction) isValidTransition(newState TransactionState) bool {
	switch t.Status {
	case StatePending:
		// A pending transaction can only begin processing or fail immediately
		return newState == StateProcessing || newState == StateFailed

	case StateProcessing:
		// A processing transaction can either succeed or fail
		return newState == StateCompleted || newState == StateFailed

	case StateCompleted, StateFailed:
		// Terminal States: Once it reaches here, it can NEVER change again
		return false

	default:
		return false
	}
}
