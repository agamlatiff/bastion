package domain

import (
	"time"

	"github.com/google/uuid"
)

// SubmitKYCRequest represents the payload submitted by an end user.
type SubmitKYCRequest struct {
	IDCardNumber   string `json:"id_card_number" binding:"required"`
	IDCardImageURL string `json:"id_card_image_url" binding:"required"`
	SelfieImageURL string `json:"selfie_image_url" binding:"required"`
}

// ReviewKYCRequest represents review decisions submitted by reviewers or admins.
type ReviewKYCRequest struct {
	Status          string `json:"status" binding:"required"` // approved or rejected
	RejectionReason string `json:"rejection_reason"`
}

// KYCResponse is the safe public representation of a KYC verification application.
type KYCResponse struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	IDCardNumber    string     `json:"id_card_number"`
	IDCardImageURL  string     `json:"id_card_image_url"`
	SelfieImageURL  string     `json:"selfie_image_url"`
	Status          KYCStatus  `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	SubmittedAt     time.Time  `json:"submitted_at"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty"`
}

// ToResponse maps a domain entity to KYCResponse.
func (k *KYCVerification) ToResponse() KYCResponse {
	return KYCResponse{
		ID:              k.ID,
		UserID:          k.UserID,
		IDCardNumber:    k.IDCardNumber,
		IDCardImageURL:  k.IDCardImageURL,
		SelfieImageURL:  k.SelfieImageURL,
		Status:          k.Status,
		RejectionReason: k.RejectionReason,
		SubmittedAt:     k.SubmittedAt,
		VerifiedAt:      k.VerifiedAt,
	}
}

// KYCVerifiedEvent is dispatched when an application is approved.
type KYCVerifiedEvent struct {
	EventID     string    `json:"event_id"`
	EventType   string    `json:"event_type"`
	AggregateID string    `json:"aggregate_id"`
	UserID      string    `json:"user_id"`
	Status      string    `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
}
