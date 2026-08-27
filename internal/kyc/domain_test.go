package kyc_test

import (
	"testing"

	"github.com/agamlatiff/bastion/internal/kyc"
)

func TestMaskIDCardNumber(t *testing.T) {
	rawNIK := "3171012345678901"
	expectedMasked := "3171********8901"

	masked := kyc.MaskIDCardNumber(rawNIK)
	if masked != expectedMasked {
		t.Errorf("Expected masked NIK %s, got %s", expectedMasked, masked)
	}

	verification := &kyc.KYCVerification{
		ID:           "kyc_123",
		UserID:       "usr_123",
		IDCardNumber: rawNIK,
		Status:       kyc.KYCStatusPending,
	}

	resp := verification.ToKYCResponse()
	if resp.IDCardNumber != expectedMasked {
		t.Errorf("ToKYCResponse did not mask IDCardNumber: got %s", resp.IDCardNumber)
	}
}
