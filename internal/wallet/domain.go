package wallet

import "time"

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
	ID               string    `json:"id"`
	IdempotencyKey   string    `json:"idempotency_key"`
	SenderWalletID   *string   `json:"sender_wallet_id,omitempty"`
	ReceiverWalletID *string   `json:"receiver_wallet_id,omitempty"`
	Amount           int64     `json:"amount"`
	FeeAmount        int64     `json:"fee_amount"`
	Type             string    `json:"type"`
	Status           string    `json:"status"`
	Description      string    `json:"description"`
	CreatedAt        time.Time `json:"created_at"`
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
	IdempotencyKey string `json:"idempotency_key" binding:"required"`
	Description    string `json:"description" binding:"required"`
}

type TopUpRequest struct {
	Amount         int64  `json:"amount" binding:"required,gt=0"`
	IdempotencyKey string `json:"idempotency_key" binding:"required"`
	Description    string `json:"description"`
}

type WalletBalanceResponse struct {
	WalletID        string `json:"wallet_id"`
	UserID          string `json:"user_id"`
	Balance         int64  `json:"balance"`
	Currency        string `json:"currency"`
	MaxBalanceLimit int64  `json:"max_balance_limit"`
}
