package domain

import "errors"

var (
	ErrKYCNotFound        = errors.New("kyc application not found")
	ErrKYCAlreadyPending  = errors.New("kyc application already pending review")
	ErrKYCAlreadyApproved = errors.New("kyc application already approved")
	ErrKYCNotPending      = errors.New("only pending kyc applications can be reviewed")
	ErrInvalidKYCStatus   = errors.New("invalid status: must be either 'approved' or 'rejected'")
	ErrInvalidNIKLength   = errors.New("id_card_number must be exactly 16 digits")
	ErrDuplicateNIK       = errors.New("id card number is already registered to another account")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden: insufficient permissions")
)
