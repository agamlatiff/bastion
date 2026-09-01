package service

import (
	"context"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/repository"
)

type mockKYCRepo struct {
	kycMap map[string]*domain.KYCVerification
}

func newMockKYCRepo() *mockKYCRepo {
	return &mockKYCRepo{
		kycMap: make(map[string]*domain.KYCVerification),
	}
}

func (m *mockKYCRepo) Create(ctx context.Context, db repository.DBTX, verification *domain.KYCVerification) error {
	verification.ID = "kyc_123"
	verification.SubmittedAt = time.Now()
	m.kycMap[verification.ID] = verification
	return nil
}

func (m *mockKYCRepo) FindByUserID(ctx context.Context, db repository.DBTX, userID string) (*domain.KYCVerification, error) {
	for _, k := range m.kycMap {
		if k.UserID == userID {
			return k, nil
		}
	}
	return nil, domain.ErrKYCNotFound
}

func (m *mockKYCRepo) FindByID(ctx context.Context, db repository.DBTX, id string) (*domain.KYCVerification, error) {
	verification, exists := m.kycMap[id]
	if !exists {
		return nil, domain.ErrKYCNotFound
	}
	return verification, nil
}

func (m *mockKYCRepo) UpdateStatus(ctx context.Context, db repository.DBTX, kycID, status string, rejectionReason *string) error {
	if verification, exists := m.kycMap[kycID]; exists {
		verification.Status = status
		verification.RejectionReason = rejectionReason
		now := time.Now()
		verification.VerifiedAt = &now
		return nil
	}
	return domain.ErrKYCNotFound
}

func TestKYCService_SubmitKYC(t *testing.T) {
	kycRepo := newMockKYCRepo()
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	transactor := &mockTransactor{}

	svc := NewKYCService(transactor, kycRepo, userRepo, walletRepo)

	user := &domain.User{
		ID:         "usr_123",
		Tier:       domain.Tier1,
		IsVerified: false,
	}

	t.Run("Success", func(t *testing.T) {
		req := &dto.SubmitKYCRequest{
			IDCardNumber:   "3171012345678901",
			IDCardImageURL: "https://bucket.com/id.jpg",
			SelfieImageURL: "https://bucket.com/selfie.jpg",
		}

		res, err := svc.SubmitKYC(context.Background(), user, req)
		if err != nil {
			t.Fatalf("expected success, got error: %v", err)
		}

		if res.Status != domain.KYCStatusPending {
			t.Errorf("expected status pending, got %s", res.Status)
		}
	})

	t.Run("Invalid NIK Length", func(t *testing.T) {
		req := &dto.SubmitKYCRequest{
			IDCardNumber:   "123",
			IDCardImageURL: "https://bucket.com/id.jpg",
			SelfieImageURL: "https://bucket.com/selfie.jpg",
		}

		_, err := svc.SubmitKYC(context.Background(), user, req)
		if err == nil {
			t.Errorf("expected error invalid NIK length, got nil")
		}
	})
}
