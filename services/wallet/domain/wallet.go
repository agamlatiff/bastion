package domain

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Common Domain Errors
var (
	ErrWalletNotFound           = errors.New("wallet not found")
	ErrDuplicateWallet          = errors.New("active wallet for this currency already exists")
	ErrInvalidCurrency          = errors.New("currency must be a valid 3-letter uppercase ISO 4217 code")
	ErrInvalidTransition        = errors.New("invalid wallet state transition")
	ErrWalletClosed             = errors.New("wallet is permanently closed")
	ErrUnauthorizedWalletAccess = errors.New("forbidden: you do not own this wallet")
)

// WalletStatus represents lifecycle state in the wallet state machine.
type WalletStatus string

const (
	StatusCreating WalletStatus = "CREATING"
	StatusActive   WalletStatus = "ACTIVE"
	StatusFrozen   WalletStatus = "FROZEN"
	StatusClosed   WalletStatus = "CLOSED"
)

// Regex for strict 3-letter uppercase ISO 4217 currency code (e.g. IDR, USD, SGD)
var currencyRegex = regexp.MustCompile(`^[A-Z]{3}$`)

// IsValidCurrency checks if a string is a valid 3-letter ISO 4217 currency code.
func IsValidCurrency(code string) bool {
	return currencyRegex.MatchString(strings.TrimSpace(code))
}

// CanTransition validates the strict financial state machine rules.
func CanTransition(from, to WalletStatus) bool {
	switch from {
	case StatusCreating:
		return to == StatusActive
	case StatusActive:
		return to == StatusFrozen || to == StatusClosed
	case StatusFrozen:
		return to == StatusActive || to == StatusClosed
	case StatusClosed:
		// CLOSED is a terminal state; no transitions are allowed out of CLOSED
		return false
	default:
		return false
	}
}

// Wallet entity mapped directly to the PostgreSQL `wallets` table.
type Wallet struct {
	ID              uuid.UUID    `json:"id"`
	CustomerID      uuid.UUID    `json:"customer_id"`
	Currency        string       `json:"currency"`
	Balance         int64        `json:"balance"` // Minor unit integer, never float!
	MaxBalanceLimit int64        `json:"max_balance_limit"`
	Status          WalletStatus `json:"status"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

// Request and Response DTOs
type CreateWalletRequest struct {
	Currency string `json:"currency" binding:"required,len=3"`
}

type WalletResponse struct {
	ID              uuid.UUID    `json:"id"`
	CustomerID      uuid.UUID    `json:"customer_id"`
	Currency        string       `json:"currency"`
	Balance         int64        `json:"balance"`
	MaxBalanceLimit int64        `json:"max_balance_limit"`
	Status          WalletStatus `json:"status"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
}

type WalletBalanceResponse struct {
	WalletID uuid.UUID `json:"wallet_id"`
	Currency string    `json:"currency"`
	Balance  int64     `json:"balance"`
}
