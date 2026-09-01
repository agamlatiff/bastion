package domain

import "errors"

var (
	// --- Auth & User Errors ---
	ErrUserNotFound         = errors.New("user not found")
	ErrEmailAlreadyExists   = errors.New("email already registered")
	ErrInvalidCredentials   = errors.New("invalid email or password")

	// --- KYC Errors ---
	ErrKYCRequired          = errors.New("sender must be KYC verified to perform transfer")
	ErrKYCAlreadyPending    = errors.New("kyc application already pending")

	// --- Wallet & Balance Errors ---
	ErrInsufficientBalance  = errors.New("insufficient balance")
	ErrExceedsMaxLimit      = errors.New("balance exceeds maximum wallet limit")
	ErrInvalidAmount        = errors.New("amount must be greater than zero")

	// --- Transfer & Transaction Errors ---
	ErrSelfTransfer         = errors.New("cannot transfer to your own account")
	ErrInvalidReceiver      = errors.New("invalid receiver wallet")
	ErrDailyLimitExceeded   = errors.New("daily transaction limit exceeded")
	ErrMonthlyLimitExceeded = errors.New("monthly transaction limit exceeded")
	ErrConcurrentRequest    = errors.New("concurrent request detected for the same idempotency key")
)