package domain

import "errors"

var (
	// --- Common Generic Errors ---
	ErrNotFound             = errors.New("resource not found")

	// --- Auth & User Errors ---
	ErrUserNotFound         = errors.New("user not found")
	ErrEmailAlreadyExists   = errors.New("email already registered")
	ErrInvalidCredentials   = errors.New("invalid email or password")
	ErrTokenRevoked         = errors.New("token has been logged out")
	ErrInvalidRefreshToken  = errors.New("invalid or expired refresh token")
	ErrTokenReuseDetected   = errors.New("token reuse detected: all sessions revoked for security")

	// --- PIN Errors ---
	ErrPINNotSet            = errors.New("transaction pin has not been set, please set up your pin first")
	ErrPINAlreadySet        = errors.New("transaction pin is already set, use change pin instead")
	ErrInvalidPINFormat     = errors.New("pin must be exactly 6 numeric digits")
	ErrInvalidPIN           = errors.New("invalid transaction pin")
	ErrSameOldAndNewPIN     = errors.New("new pin cannot be the same as old pin")

	// --- KYC Errors ---
	ErrKYCNotFound          = errors.New("kyc application not found")
	ErrKYCRequired          = errors.New("sender must be KYC verified to perform transfer")
	ErrKYCAlreadyPending    = errors.New("kyc application already pending")
	ErrKYCAlreadyApproved   = errors.New("kyc is already approved")
	ErrKYCNotPending        = errors.New("only pending kyc applications can be reviewed")
	ErrInvalidKYCStatus     = errors.New("invalid status: must be either 'approved' or 'rejected'")
	ErrInvalidNIKLength     = errors.New("id card number (NIK) must be exactly 16 digits")
	ErrAlreadyVerified      = errors.New("user is already verified as tier 2")
	ErrDuplicateNIK         = errors.New("id card number (NIK) is already registered by another account")

	// --- Wallet & Balance Errors ---
	ErrWalletNotFound       = errors.New("wallet not found")
	ErrInsufficientBalance  = errors.New("insufficient balance")
	ErrExceedsMaxLimit      = errors.New("balance exceeds maximum wallet limit")
	ErrInvalidAmount        = errors.New("amount must be greater than zero")

	// --- Transfer & Transaction Errors ---
	ErrSelfTransfer         = errors.New("cannot transfer to your own account")
	ErrInvalidReceiver      = errors.New("invalid receiver wallet")
	ErrReceiverNotFound     = errors.New("receiver user not found")
	ErrReceiverWalletNotFound = errors.New("receiver wallet not found")
	ErrDailyLimitExceeded   = errors.New("daily transaction limit exceeded")
	ErrMonthlyLimitExceeded = errors.New("monthly transaction limit exceeded")
	ErrConcurrentRequest    = errors.New("concurrent request detected for the same idempotency key")
)