package domain

import "time"

// User system roles for Role-Based Access Control (RBAC)
const (
	RoleUser        = "USER"
	RoleAdmin       = "ADMIN"
	RoleKYCReviewer = "KYC_REVIEWER"
)

// User tier levels based on verification status
const (
	Tier1 = "tier_1" // Unverified user (standard limits)
	Tier2 = "tier_2" // KYC verified user (upgraded limits & transfer capability)
)

// User represents the core user domain entity in the system.
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
