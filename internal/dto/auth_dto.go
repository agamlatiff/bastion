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

// AuthResponse represents the JSON response returned after successful login or registration.
type AuthResponse struct {
	Token string        `json:"token"`
	User  *UserResponse `json:"user"`
}

// UserResponse represents the safe public user profile excluding sensitive fields.
type UserResponse struct {
	ID         string    `json:"id"`
	Email      string    `json:"email"`
	FullName   string    `json:"full_name"`
	Role       string    `json:"role"`
	Tier       string    `json:"tier"`
	IsVerified bool      `json:"is_verified"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ToUserResponse safely transforms a User domain entity into a UserResponse DTO, stripping sensitive data.
func ToUserResponse(u *domain.User) *UserResponse {
	if u == nil {
		return nil
	}
	return &UserResponse{
		ID:         u.ID,
		Email:      u.Email,
		FullName:   u.FullName,
		Role:       u.Role,
		Tier:       u.Tier,
		IsVerified: u.IsVerified,
		CreatedAt:  u.CreatedAt,
		UpdatedAt:  u.UpdatedAt,
	}
}
