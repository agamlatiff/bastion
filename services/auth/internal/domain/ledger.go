package domain

import "time"

type TransferRequest struct {
	ReceiverEmail  string `json:"receiver_email" binding:"required, email"`
	Amount         int64 `json:"amount"  binding:"required, gt=0"`
	IdempotencyKey string `json:"idempotency_key" binding:"required"`
	Description    string `json:"description" binding:"required"`
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