package domain

import "errors"

var (
	ErrCustomerNotFound = errors.New("customer profile not found")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrInvalidPayload   = errors.New("invalid payload")
)
