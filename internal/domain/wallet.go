package domain

import "time"

// Wallet default constants and tier-based balance limits
const (
	DefaultCurrency      = "IDR"
	Tier1MaxBalanceLimit = 2_000_000  // 2,000,000 IDR (Bank Indonesia limit for unverified e-money)
	Tier2MaxBalanceLimit = 10_000_000 // 10,000,000 IDR (Bank Indonesia limit for verified e-money)
)

// Wallet represents a user's monetary account containing the active balance and balance limits.
type Wallet struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	Balance         int64     `json:"balance"`
	Currency        string    `json:"currency"`
	MaxBalanceLimit int64     `json:"max_balance_limit"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
