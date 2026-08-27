package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/service"
)

// Mock KYC Repository untuk pengujian mandiri tanpa database
type mockKYCRepo struct {
	kycMap map[string]*domain.KYCVerification
}

func newMockKYCRepo() *mockKYCRepo {
	return &mockKYCRepo{
		kycMap: make(map[string]*domain.KYCVerification),
	}
}

func (m *mockKYCRepo) Create(ctx context.Context, kyc *domain.KYCVerification) error {
	kyc.ID = "kyc_123"
	kyc.SubmittedAt = time.Now()
	m.kycMap[kyc.ID] = kyc
	return nil
}

func (m *mockKYCRepo) FindByUserID(ctx context.Context, userID string) (*domain.KYCVerification, error) {
	for _, k := range m.kycMap {
		if k.UserID == userID {
			return k, nil
		}
	}
	return nil, nil
}

func (m *mockKYCRepo) FindByID(ctx context.Context, id string) (*domain.KYCVerification, error) {
	kyc, exists := m.kycMap[id]
	if !exists {
		return nil, nil
	}
	return kyc, nil
}

func (m *mockKYCRepo) ApproveKYC(ctx context.Context, kycID, userID string) error {
	if kyc, exists := m.kycMap[kycID]; exists {
		kyc.Status = domain.KYCStatusApproved
		now := time.Now()
		kyc.VerifiedAt = &now
	}
	return nil
}

func (m *mockKYCRepo) RejectKYC(ctx context.Context, kycID, reason string) error {
	if kyc, exists := m.kycMap[kycID]; exists {
		kyc.Status = domain.KYCStatusRejected
		kyc.RejectionReason = &reason
		now := time.Now()
		kyc.VerifiedAt = &now
	}
	return nil
}

func TestKYCService_ReviewStateTransitions(t *testing.T) {
	ctx := context.Background()

	t.Run("Success - Approve Pending KYC", func(t *testing.T) {
		repo := newMockKYCRepo()
		repo.kycMap["kyc_pending"] = &domain.KYCVerification{
			ID:     "kyc_pending",
			UserID: "usr_1",
			Status: domain.KYCStatusPending,
		}

		svc := service.NewKYCService(repo)
		res, err := svc.ReviewKYC(ctx, "kyc_pending", &domain.ReviewKYCRequest{
			KYCID:  "kyc_pending",
			Status: domain.KYCStatusApproved,
		})

		if err != nil {
			t.Fatalf("Expected approve to succeed, got: %v", err)
		}
		if res.Status != domain.KYCStatusApproved {
			t.Errorf("Expected status %s, got %s", domain.KYCStatusApproved, res.Status)
		}
	})

	t.Run("State Invariant - Prevent Double Approval on Already Approved KYC", func(t *testing.T) {
		repo := newMockKYCRepo()
		repo.kycMap["kyc_approved"] = &domain.KYCVerification{
			ID:     "kyc_approved",
			UserID: "usr_2",
			Status: domain.KYCStatusApproved,
		}

		svc := service.NewKYCService(repo)
		_, err := svc.ReviewKYC(ctx, "kyc_approved", &domain.ReviewKYCRequest{
			KYCID:  "kyc_approved",
			Status: domain.KYCStatusApproved,
		})

		// Ekspektasi: Wajib gagal karena sudah disetujui sebelumnya
		if err == nil {
			t.Errorf("SECURITY FLAW! System allowed re-reviewing an already approved KYC application!")
		}
	})

	t.Run("Validation - Reject Invalid Status", func(t *testing.T) {
		repo := newMockKYCRepo()
		repo.kycMap["kyc_pending_2"] = &domain.KYCVerification{
			ID:     "kyc_pending_2",
			UserID: "usr_3",
			Status: domain.KYCStatusPending,
		}

		svc := service.NewKYCService(repo)
		_, err := svc.ReviewKYC(ctx, "kyc_pending_2", &domain.ReviewKYCRequest{
			KYCID:  "kyc_pending_2",
			Status: "invalid_status_xyz",
		})

		if err == nil {
			t.Errorf("Expected error for invalid status, got nil")
		}
	})
}
