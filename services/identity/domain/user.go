package domain

import (
	"time"

	"github.com/google/uuid"
)

// UserStatus defines the lifecycle state of an account.
type UserStatus string

const (
	StatusActive    UserStatus = "ACTIVE"
	StatusSuspended UserStatus = "SUSPENDED"
	StatusLocked    UserStatus = "LOCKED"
	StatusClosed    UserStatus = "CLOSED"
)

// User represents an identity credentials domain entity.
type User struct {
	ID                       uuid.UUID  `json:"id"`
	Email                    string     `json:"email"`
	PasswordHash             string     `json:"-"`
	Status                   UserStatus `json:"status"`
	TwoFactorEnabled         bool       `json:"two_factor_enabled"`
	TwoFactorSecretEncrypted *string    `json:"-"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
	Roles                    []string   `json:"roles,omitempty"`
}

// UserResponse is the safe public representation of a user without sensitive hashes.
type UserResponse struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Status    UserStatus `json:"status"`
	Roles     []string   `json:"roles,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}
