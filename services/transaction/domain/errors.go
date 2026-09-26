package domain

import "errors"

var (
	ErrTransactionNotFound    = errors.New("transaction not found")
	ErrIdempotencyConflict    = errors.New("idempotency key conflict: request payload does not match existing transaction")
	ErrInvalidStateTransition = errors.New("invalid transaction state transition")
	ErrInvalidAmount          = errors.New("transaction amount must be greater than zero")
	ErrInvalidFee             = errors.New("fee amount cannot be negative")
	ErrInvalidCurrency        = errors.New("invalid currency code: must be 3 uppercase letters (e.g. IDR, USD)")
	ErrInvalidTransactionType = errors.New("invalid transaction type: must be TOPUP, TRANSFER, WITHDRAWAL, REFUND, or REVERSAL")
	ErrMissingWalletID        = errors.New("required wallet id is missing for transaction type")
	ErrSameSenderReceiver     = errors.New("sender and receiver wallet ids cannot be identical")
	ErrUnauthorized           = errors.New("unauthorized")
	ErrForbidden              = errors.New("forbidden")
)
