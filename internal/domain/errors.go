package domain

import "errors"

var (
	ErrInsufficientBalance  = errors.New("insufficient balance")
	ErrExceedsMaxLimit      = errors.New("balance exceeds maximum wallet limit")
	ErrInvalidAmount        = errors.New("amount must be greater than zero")
	ErrSelfTransfer         = errors.New("cannot transfer to your own account")
	ErrKYCRequired          = errors.New("sender must be KYC verified to perform transfer")
	ErrDailyLimitExceeded   = errors.New("daily transaction limit exceeded")
	ErrMonthlyLimitExceeded = errors.New("monthly transaction limit exceeded")
	ErrInvalidReceiver      = errors.New("invalid receiver wallet")
	ErrConcurrentRequest    = errors.New("concurrent request detected for the same idempotency key")
)
