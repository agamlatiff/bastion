package domain

import "time"

const (
	TxTypeTopUp    = "TOPUP"
	TxTypeTransfer = "TRANSFER"

	TxStatusSuccess = "SUCCESS"
	TxStatusPending = "PENDING"
	TxStatusFailed  = "FAILED"
)

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
