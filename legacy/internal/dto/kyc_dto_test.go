package dto_test

import (
	"testing"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
)

func TestMaskIDCardNumber(t *testing.T) {
	rawNIK := "3171012345678901"
	expectedMasked := "3171********8901"

	masked := dto.MaskIDCardNumber(rawNIK)
	if masked != expectedMasked {
		t.Errorf("Expected masked NIK %s, got %s", expectedMasked, masked)
	}

	verification := &domain.KYCVerification{
		ID:           "kyc_123",
		UserID:       "usr_123",
		IDCardNumber: rawNIK,
		Status:       domain.KYCStatusPending,
	}

	resp := dto.ToKYCResponse(verification)
	if resp.IDCardNumber != expectedMasked {
		t.Errorf("ToKYCResponse did not mask IDCardNumber: got %s", resp.IDCardNumber)
	}
}
