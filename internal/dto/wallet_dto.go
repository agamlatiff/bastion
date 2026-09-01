package dto

import "github.com/agamlatiff/bastion/internal/domain"

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

func ToWalletBalanceResponse(w *domain.Wallet) *WalletBalanceResponse {
	if w == nil {
		return nil
	}
	return &WalletBalanceResponse{
		WalletID:        w.ID,
		UserID:          w.UserID,
		Balance:         w.Balance,
		Currency:        w.Currency,
		MaxBalanceLimit: w.MaxBalanceLimit,
	}
}
