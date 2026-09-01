package dto

import (
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
)

// SubmitKYCRequest defines the incoming payload for user KYC verification submission.
type SubmitKYCRequest struct {
	IDCardNumber   string `json:"id_card_number" binding:"required"`
	IDCardImageURL string `json:"id_card_image_url" binding:"required"`
	SelfieImageURL string `json:"selfie_image_url" binding:"required"`
}

// ToKYCVerification converts SubmitKYCRequest into a pending KYCVerification domain entity.
func (r *SubmitKYCRequest) ToKYCVerification(userID string) *domain.KYCVerification {
	return &domain.KYCVerification{
		UserID:         userID,
		IDCardNumber:   r.IDCardNumber,
		IDCardImageURL: r.IDCardImageURL,
		SelfieImageURL: r.SelfieImageURL,
		Status:         domain.KYCStatusPending,
	}
}

// ReviewKYCRequest defines the incoming payload for reviewers to approve or reject a KYC application.
type ReviewKYCRequest struct {
	KYCID           string `json:"kyc_id" binding:"required"`
	Status          string `json:"status" binding:"required,oneof=approved rejected"`
	RejectionReason string `json:"rejection_reason"`
}

// KYCResponse represents the safe public KYC status output with masked NIK.
type KYCResponse struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	IDCardNumber    string     `json:"id_card_number"` // Masked NIK (e.g. 3171********0001)
	IDCardImageURL  string     `json:"id_card_image_url"`
	SelfieImageURL  string     `json:"selfie_image_url"`
	Status          string     `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	SubmittedAt     time.Time  `json:"submitted_at"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty"`
}

// MaskIDCardNumber masks the middle digits of an ID card number for privacy protection.
func MaskIDCardNumber(nik string) string {
	if len(nik) < 8 {
		return "****************"
	}
	return nik[:4] + "********" + nik[len(nik)-4:]
}

// ToKYCResponse transforms a KYCVerification domain entity into a sanitized KYCResponse DTO.
func ToKYCResponse(k *domain.KYCVerification) *KYCResponse {
	if k == nil {
		return nil
	}
	return &KYCResponse{
		ID:              k.ID,
		UserID:          k.UserID,
		IDCardNumber:    MaskIDCardNumber(k.IDCardNumber),
		IDCardImageURL:  k.IDCardImageURL,
		SelfieImageURL:  k.SelfieImageURL,
		Status:          k.Status,
		RejectionReason: k.RejectionReason,
		SubmittedAt:     k.SubmittedAt,
		VerifiedAt:      k.VerifiedAt,
	}
}
