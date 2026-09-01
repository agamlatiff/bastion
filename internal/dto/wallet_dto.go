package dto

import "github.com/agamlatiff/bastion/internal/domain"

// TransferRequest defines the payload for transferring balance between wallets.
type TransferRequest struct {
	ReceiverEmail  string `json:"receiver_email" binding:"required,email"`
	Amount         int64  `json:"amount" binding:"required,gt=0"`
	PIN            string `json:"pin" binding:"required,len=6"`
	IdempotencyKey string `json:"idempotency_key" binding:"required,max=100"`
	Description    string `json:"description" binding:"required,max=255"`
}

// TopUpRequest defines the payload for topping up a wallet balance.
type TopUpRequest struct {
	Amount         int64  `json:"amount" binding:"required,gt=0"`
	IdempotencyKey string `json:"idempotency_key" binding:"required,max=100"`
	Description    string `json:"description" binding:"omitempty,max=255"`
}

// GetTransactionRequest defines the query parameters for paginating transaction history.
type GetTransactionRequest struct {
	Limit  int `form:"limit" binding:"omitempty,min=1,max=100"`
	Offset int `form:"offset" binding:"omitempty,min=0"`
}

// WalletBalanceResponse represents the output payload for wallet balance queries.
type WalletBalanceResponse struct {
	WalletID        string `json:"wallet_id"`
	UserID          string `json:"user_id"`
	Balance         int64  `json:"balance"`
	Currency        string `json:"currency"`
	MaxBalanceLimit int64  `json:"max_balance_limit"`
}

// ToWalletBalanceResponse converts a Wallet domain entity into a WalletBalanceResponse DTO.
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
