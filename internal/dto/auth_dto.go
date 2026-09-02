package dto

import (
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
)

// RegisterRequest defines the incoming payload for new user registration.
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required,min=4"`
}

// ToUser converts RegisterRequest into a User domain entity with hashed password.
func (r *RegisterRequest) ToUser(hashedPassword string) *domain.User {
	return &domain.User{
		Email:        r.Email,
		PasswordHash: hashedPassword,
		FullName:     r.FullName,
		Role:         domain.RoleUser,
		Tier:         domain.Tier1,
	}
}

// LoginRequest defines the incoming payload for user authentication.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshTokenRequest defines the incoming payload to refresh expired access tokens.
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthResponse represents the JSON response returned after successful login, registration, or token refresh.
type AuthResponse struct {
	AccessToken       string        `json:"access_token,omitempty"`
	RefreshToken      string        `json:"refresh_token,omitempty"`
	TwoFactorRequired bool          `json:"two_factor_required,omitempty"`
	TempToken         string        `json:"temp_token,omitempty"`
	User              *UserResponse `json:"user,omitempty"`
}

// UserResponse represents the safe public user profile excluding sensitive fields.
type UserResponse struct {
	ID                 string    `json:"id"`
	Email              string    `json:"email"`
	FullName           string    `json:"full_name"`
	Role               string    `json:"role"`
	Tier               string    `json:"tier"`
	IsVerified         bool      `json:"is_verified"`
	IsTwoFactorEnabled bool      `json:"is_two_factor_enabled"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// ToUserResponse safely transforms a User domain entity into a UserResponse DTO, stripping sensitive data.
func ToUserResponse(u *domain.User) *UserResponse {
	if u == nil {
		return nil
	}
	return &UserResponse{
		ID:                 u.ID,
		Email:              u.Email,
		FullName:           u.FullName,
		Role:               u.Role,
		Tier:               u.Tier,
		IsVerified:         u.IsVerified,
		IsTwoFactorEnabled: u.IsTwoFactorEnabled,
		CreatedAt:          u.CreatedAt,
		UpdatedAt:          u.UpdatedAt,
	}
}

type SetPINRequest struct {
	PIN string `json:"pin" binding:"required,len=6"`
}

type ChangePINRequest struct {
	OldPIN string `json:"old_pin" binding:"required,len=6"`
	NewPIN string `json:"new_pin" binding:"required,len=6"`
}

// TwoFactorSetupResponse represents the QR code setup payload for 2FA activation.
type TwoFactorSetupResponse struct {
	Secret    string `json:"secret"`
	QRCodeURI string `json:"qr_code_uri"`
}

// Verify2FALoginRequest defines the payload to complete 2FA login challenge.
type Verify2FALoginRequest struct {
	TempToken string `json:"temp_token" binding:"required"`
	Code      string `json:"code" binding:"required,len=6"`
}

// TwoFactorCodeRequest defines the payload for enabling or disabling 2FA.
type TwoFactorCodeRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}