package domain_test
import (
	"testing"
	"github.com/agamlatiff/bastion/services/auth/internal/domain"
)

func TestMaskIDCardNumber(t *testing.T) {
	rawNIK := "3171012345678901"
	expectedMasked := "3171********8901"
	masked := domain.MaskIDCardNumber(rawNIK)
	if masked != expectedMasked {
		t.Errorf("Expected masked NIK %s, got %s", expectedMasked, masked)
	}
	kyc := &domain.KYCVerification{
		ID:           "kyc_123",
		UserID:       "usr_123",
		IDCardNumber: rawNIK,
		Status:       domain.KYCStatusPending,
	}
	resp := kyc.ToKYCResponse()
	if resp.IDCardNumber != expectedMasked {
		t.Errorf("ToKYCResponse did not mask IDCardNumber: got %s", resp.IDCardNumber)
	}
}