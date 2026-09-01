package dto

import (
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
)

type SubmitKYCRequest struct {
	IDCardNumber   string `json:"id_card_number" binding:"required"`
	IDCardImageURL string `json:"id_card_image_url" binding:"required"`
	SelfieImageURL string `json:"selfie_image_url" binding:"required"`
}

type ReviewKYCRequest struct {
	KYCID           string `json:"kyc_id" binding:"required"`
	Status          string `json:"status" binding:"required,oneof=approved rejected"`
	RejectionReason string `json:"rejection_reason"`
}

type KYCResponse struct {
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

func MaskIDCardNumber(nik string) string {
	if len(nik) < 8 {
		return "****************"
	}
	return nik[:4] + "********" + nik[len(nik)-4:]
}

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
