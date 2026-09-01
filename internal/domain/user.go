package domain

import "time"

const (
	RoleUser        = "USER"
	RoleAdmin       = "ADMIN"
	RoleKYCReviewer = "KYC_REVIEWER"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	Role         string    `json:"role"`
	Tier         string    `json:"tier"`
	IsVerified   bool      `json:"is_verified"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
