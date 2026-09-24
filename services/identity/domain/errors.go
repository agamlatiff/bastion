package domain

import "errors"

// Common domain sentinel errors for identity operations.
var (
	ErrDuplicateEmail  = errors.New("email already registered")
	ErrUserNotFound    = errors.New("user not found")
	ErrSessionNotFound = errors.New("session not found")
	ErrRoleNotFound    = errors.New("role not found")
)
