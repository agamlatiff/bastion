package domain

import "time"

const (
	KYCStatusPending  = "pending"
	KYCStatusApproved = "approved"
	KYCStatusRejected = "rejected"
)

type KYCVerification struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	IDCardNumber    string     `json:"id_card_number"`
	IDCardImageURL  string     `json:"id_card_image_url"`
	SelfieImageURL  string     `json:"selfie_image_url"`
	Status          string     `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	SubmittedAt     time.Time  `json:"submitted_at"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty"`
}
