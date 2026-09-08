package domain

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrAccountNotFound      = errors.New("ledger account not found")
	ErrDuplicateAccountCode = errors.New("ledger account code already exists")
	ErrInvalidAccountType   = errors.New("invalid ledger account type")
	ErrInvalidCurrency      = errors.New("currency must be a valid 3-letter uppercase ISO 4217 code")
	ErrAccountNotActive     = errors.New("ledger account is not active")
)

type AccountType string

const (
	AccountTypeAsset     AccountType = "ASSET"
	AccountTypeLiability AccountType = "LIABILITY"
	AccountTypeEquity    AccountType = "EQUITY"
	AccountTypeRevenue   AccountType = "REVENUE"
	AccountTypeExpense   AccountType = "EXPENSE"
)

func (t AccountType) IsValid() bool {
	switch t {
	case AccountTypeAsset, AccountTypeLiability, AccountTypeEquity, AccountTypeRevenue, AccountTypeExpense:
		return true
	default:
		return false
	}
}

type AccountStatus string

const (
	AccountStatusActive AccountStatus = "ACTIVE"
	AccountStatusFrozen AccountStatus = "FROZEN"
	AccountStatusClosed AccountStatus = "CLOSED"
)

var currencyRegex = regexp.MustCompile(`^[A-Z]{3}$`)

func IsValidCurrency(code string) bool {
	return currencyRegex.MatchString(strings.TrimSpace(code))
}

// LedgerAccount entity mapped to `ledger_accounts` table
type LedgerAccount struct {
	ID          uuid.UUID     `json:"id"`
	AccountCode string        `json:"account_code"`
	AccountType AccountType   `json:"account_type"`
	OwnerType   string        `json:"owner_type,omitempty"`
	OwnerID     *uuid.UUID    `json:"owner_id,omitempty"`
	Currency    string        `json:"currency"`
	Status      AccountStatus `json:"status"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// AccountBalance entity mapped to `account_balances` read-projection table
type AccountBalance struct {
	AccountID uuid.UUID `json:"account_id"`
	Balance   int64     `json:"balance"` // Minor units
	Version   int64     `json:"version"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Request & Response DTOs
type CreateAccountRequest struct {
	AccountCode string      `json:"account_code" binding:"required"`
	AccountType AccountType `json:"account_type" binding:"required"`
	OwnerType   string      `json:"owner_type"`
	OwnerID     *uuid.UUID  `json:"owner_id"`
	Currency    string      `json:"currency" binding:"required,len=3"`
}

type AccountResponse struct {
	ID          uuid.UUID     `json:"id"`
	AccountCode string        `json:"account_code"`
	AccountType AccountType   `json:"account_type"`
	OwnerType   string        `json:"owner_type,omitempty"`
	OwnerID     *uuid.UUID    `json:"owner_id,omitempty"`
	Currency    string        `json:"currency"`
	Status      AccountStatus `json:"status"`
	Balance     int64         `json:"balance"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}
