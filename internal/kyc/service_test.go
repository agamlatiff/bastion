package kyc_test

import (
	"context"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/internal/kyc"
)

type mockKYCRepo struct {
	kycMap map[string]*kyc.KYCVerification
}

func newMockKYCRepo() *mockKYCRepo {
	return &mockKYCRepo{
		kycMap: make(map[string]*kyc.KYCVerification),
	}
}

func (m *mockKYCRepo) Create(ctx context.Context, verification *kyc.KYCVerification) error {
	verification.ID = "kyc_123"
	verification.SubmittedAt = time.Now()
	m.kycMap[verification.ID] = verification
	return nil
}

func (m *mockKYCRepo) FindByUserID(ctx context.Context, userID string) (*kyc.KYCVerification, error) {
	for _, k := range m.kycMap {
		if k.UserID == userID {
			return k, nil
		}
	}
	return nil, nil
}

func (m *mockKYCRepo) FindByID(ctx context.Context, id string) (*kyc.KYCVerification, error) {
	verification, exists := m.kycMap[id]
	if !exists {
		return nil, nil
	}
	return verification, nil
}

func (m *mockKYCRepo) ApproveKYC(ctx context.Context, kycID, userID string) error {
	if verification, exists := m.kycMap[kycID]; exists {
		verification.Status = kyc.KYCStatusApproved
		now := time.Now()
		verification.VerifiedAt = &now
	}
	return nil
}

func (m *mockKYCRepo) RejectKYC(ctx context.Context, kycID, reason string) error {
	if verification, exists := m.kycMap[kycID]; exists {
		verification.Status = kyc.KYCStatusRejected
		verification.RejectionReason = &reason
		now := time.Now()
		verification.VerifiedAt = &now
	}
	return nil
}

func TestKYCService_ReviewStateTransitions(t *testing.T) {
	ctx := context.Background()

	t.Run("Success - Approve Pending KYC", func(t *testing.T) {
		repo := newMockKYCRepo()
		repo.kycMap["kyc_pending"] = &kyc.KYCVerification{
			ID:     "kyc_pending",
			UserID: "usr_1",
			Status: kyc.KYCStatusPending,
		}

		svc := kyc.NewService(repo)
		res, err := svc.ReviewKYC(ctx, "kyc_pending", &kyc.ReviewKYCRequest{
			KYCID:  "kyc_pending",
			Status: kyc.KYCStatusApproved,
		})

		if err != nil {
			t.Fatalf("Expected approve to succeed, got: %v", err)
		}
		if res.Status != kyc.KYCStatusApproved {
			t.Errorf("Expected status %s, got %s", kyc.KYCStatusApproved, res.Status)
		}
	})

	t.Run("State Invariant - Prevent Double Approval on Already Approved KYC", func(t *testing.T) {
		repo := newMockKYCRepo()
		repo.kycMap["kyc_approved"] = &kyc.KYCVerification{
			ID:     "kyc_approved",
			UserID: "usr_2",
			Status: kyc.KYCStatusApproved,
		}

		svc := kyc.NewService(repo)
		_, err := svc.ReviewKYC(ctx, "kyc_approved", &kyc.ReviewKYCRequest{
			KYCID:  "kyc_approved",
			Status: kyc.KYCStatusApproved,
		})

		if err == nil {
			t.Errorf("SECURITY FLAW! System allowed re-reviewing an already approved KYC application!")
		}
	})

	t.Run("Validation - Reject Invalid Status", func(t *testing.T) {
		repo := newMockKYCRepo()
		repo.kycMap["kyc_pending_2"] = &kyc.KYCVerification{
			ID:     "kyc_pending_2",
			UserID: "usr_3",
			Status: kyc.KYCStatusPending,
		}

		svc := kyc.NewService(repo)
		_, err := svc.ReviewKYC(ctx, "kyc_pending_2", &kyc.ReviewKYCRequest{
			KYCID:  "kyc_pending_2",
			Status: "invalid_status_xyz",
		})

		if err == nil {
			t.Errorf("Expected error for invalid status, got nil")
		}
	})
}
