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


// User represents an identity credentials record.
type User struct {
	ID                        uuid.UUID  `json:"id"`
	Email                     string     `json:"email"`
	PasswordHash              string     `json:"-"`
	Status                    UserStatus `json:"status"`
	TwoFactorEnabled          bool       `json:"two_factor_enabled"`
	TwoFactorSecretEncrypted  *string    `json:"-"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
	Roles                     []string   `json:"roles,omitempty"`
}

// Session tracks an active refresh token session for a device.
type Session struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	RefreshTokenHash string     `json:"-"`
	DeviceID         *string    `json:"device_id,omitempty"`
	UserAgent        *string    `json:"user_agent,omitempty"`
	IPAddress        *string    `json:"ip_address,omitempty"`
	ExpiresAt        time.Time  `json:"expires_at"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// UserResponse is the safe public representation of a user without sensitive hashes.
type UserResponse struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Status    UserStatus `json:"status"`
	Roles     []string   `json:"roles,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// DTOs (Data Transfer Objects) for API requests and responses:
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginRequest struct {
	Email    string  `json:"email" binding:"required,email"`
	Password string  `json:"password" binding:"required"`
	DeviceID *string `json:"device_id,omitempty"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type AuthResponse struct {
	AccessToken        string       `json:"access_token,omitempty"`
	RefreshToken       string       `json:"refresh_token,omitempty"`
	TokenType          string       `json:"token_type,omitempty"`
	ExpiresIn          int64        `json:"expires_in,omitempty"`
	User               UserResponse `json:"user,omitempty"`
	TwoFactorRequired  bool         `json:"two_factor_required,omitempty"`
	TempToken          string       `json:"temp_token,omitempty"`
}

type TwoFactorSetupResponse struct {
	Secret    string `json:"secret"`
	QRCodeURI string `json:"qr_code_uri"`
}

type TwoFactorEnableRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

type TwoFactorDisableRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

type TwoFactorVerifyRequest struct {
	TempToken string `json:"temp_token" binding:"required"`
	Code      string `json:"code" binding:"required,len=6"`
}

