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
	// Store a copy in the map to simulate DB persistence
	stored := *verification
	m.kycMap[verification.ID] = &stored
	return nil
}

func (m *mockKYCRepo) FindByUserID(ctx context.Context, db repository.DBTX, userID string) (*domain.KYCVerification, error) {
	for _, k := range m.kycMap {
		if k.UserID == userID {
			res := *k
			return &res, nil
		}
	}
	return nil, domain.ErrKYCNotFound
}

func (m *mockKYCRepo) FindByID(ctx context.Context, db repository.DBTX, id string) (*domain.KYCVerification, error) {
	verification, exists := m.kycMap[id]
	if !exists {
		return nil, domain.ErrKYCNotFound
	}
	res := *verification
	return &res, nil
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

func TestKYCService_SubmitAndReviewKYC(t *testing.T) {
	kycRepo := newMockKYCRepo()
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	transactor := &mockTransactor{}
	encKey := []byte("01234567890123456789012345678901")

	svc := NewKYCService(transactor, kycRepo, userRepo, walletRepo, encKey)

	user := &domain.User{
		ID:         "usr_123",
		Tier:       domain.Tier1,
		IsVerified: false,
	}
	userRepo.users[user.ID] = user

	wallet := &domain.Wallet{
		ID:              "wal_123",
		UserID:          user.ID,
		Balance:         0,
		Currency:        domain.DefaultCurrency,
		MaxBalanceLimit: domain.Tier1MaxBalanceLimit,
	}
	walletRepo.wallets[user.ID] = wallet

	t.Run("Submit KYC Success with Field-Level Encryption", func(t *testing.T) {
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

		// Verify that raw plaintext NIK was NOT stored directly in database repository
		storedRecord := kycRepo.kycMap["kyc_123"]
		if storedRecord.IDCardNumber == "3171012345678901" {
			t.Errorf("expected IDCardNumber in database to be encrypted ciphertext, but found plaintext")
		}
	})

	t.Run("GetKYCStatus Decrypts NIK for Response", func(t *testing.T) {
		status, err := svc.GetKYCStatus(context.Background(), user.ID)
		if err != nil {
			t.Fatalf("expected get kyc status success, got error: %v", err)
		}

		if status.IDCardNumber != "3171012345678901" {
			t.Errorf("expected decrypted IDCardNumber 3171012345678901, got %s", status.IDCardNumber)
		}
	})

	t.Run("ReviewKYC Approval Decrypts NIK and Upgrades Tier", func(t *testing.T) {
		reviewed, err := svc.ReviewKYC(context.Background(), "kyc_123", &dto.ReviewKYCRequest{
			Status: domain.KYCStatusApproved,
		})
		if err != nil {
			t.Fatalf("expected review approval success, got error: %v", err)
		}

		if reviewed.Status != domain.KYCStatusApproved {
			t.Errorf("expected status approved, got %s", reviewed.Status)
		}

		if reviewed.IDCardNumber != "3171012345678901" {
			t.Errorf("expected decrypted NIK in review result, got %s", reviewed.IDCardNumber)
		}

		// Check if user was upgraded to tier 2 and verified
		if user.Tier != domain.Tier2 || !user.IsVerified {
			t.Errorf("expected user tier 2 and verified, got tier %s, verified %v", user.Tier, user.IsVerified)
		}

		// Check if wallet limit was upgraded
		if wallet.MaxBalanceLimit != domain.Tier2MaxBalanceLimit {
			t.Errorf("expected wallet limit %d, got %d", domain.Tier2MaxBalanceLimit, wallet.MaxBalanceLimit)
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
