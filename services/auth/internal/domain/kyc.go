package domain

import "time"

type KYCVerification struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	IDCardNumber    string    `json:"id_card_number"`
	IDCardImageURL  string    `json:"id_card_image_url"`
	SelfieImageURL  string    `json:"selfie_image_url"`
	Status          string    `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	SubmittedAt     time.Time `json:"submitted_at"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty"`
}

type SubmitKYCRequest struct {
	IDCardNumber   string `json:"id_card_number" binding:"required"`
	IDCardImageURL string `json:"id_card_image_url" binding:"required"`
	SelfieImageURL string `json:"selfie_image_url" binding:"required"`
}

type ReviewKYCRequest struct {
	Status          string    `json:"status"`
	RejectionReason string    `json:"rejection_reason"`
}
 