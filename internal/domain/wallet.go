package domain

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
