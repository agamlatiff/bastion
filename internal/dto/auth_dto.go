package dto

import (
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
)

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name" binding:"required,min=4"`
}

func (r *RegisterRequest) ToUser(hashedPassword string) *domain.User {
	return &domain.User{
		Email:        r.Email,
		PasswordHash: hashedPassword,
		FullName:     r.FullName,
		Role:         domain.RoleUser,
		Tier:         "tier_1",
	}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string        `json:"token"`
	User  *UserResponse `json:"user"`
}

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
