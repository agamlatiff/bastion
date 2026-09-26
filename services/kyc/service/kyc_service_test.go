package service

import (
	"context"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/kyc/domain"
	"github.com/google/uuid"
)

// In-memory mock repository for KYC service tests
type mockKYCRepo struct {
	byID       map[uuid.UUID]*domain.KYCVerification
	byUserID   map[uuid.UUID]*domain.KYCVerification
	byCardHash map[string]*domain.KYCVerification
	outbox     []*domain.OutboxEvent
}

func newMockKYCRepo() *mockKYCRepo {
	return &mockKYCRepo{
		byID:       make(map[uuid.UUID]*domain.KYCVerification),
		byUserID:   make(map[uuid.UUID]*domain.KYCVerification),
		byCardHash: make(map[string]*domain.KYCVerification),
	}
}

func (m *mockKYCRepo) Create(ctx context.Context, kyc *domain.KYCVerification) error {
	m.byID[kyc.ID] = kyc
	m.byUserID[kyc.UserID] = kyc
	m.byCardHash[kyc.IDCardHash] = kyc
	return nil
}

func (m *mockKYCRepo) FindByUserID(ctx context.Context, userID uuid.UUID) (*domain.KYCVerification, error) {
	k, ok := m.byUserID[userID]
	if !ok {
		return nil, domain.ErrKYCNotFound
	}
	return k, nil
}

func (m *mockKYCRepo) FindByID(ctx context.Context, id uuid.UUID) (*domain.KYCVerification, error) {
	k, ok := m.byID[id]
	if !ok {
		return nil, domain.ErrKYCNotFound
	}
	return k, nil
}

func (m *mockKYCRepo) FindByIDCardHash(ctx context.Context, hash string) (*domain.KYCVerification, error) {
	k, ok := m.byCardHash[hash]
	if !ok {
		return nil, domain.ErrKYCNotFound
	}
	return k, nil
}

func (m *mockKYCRepo) UpdateStatus(ctx context.Context, kycID uuid.UUID, status domain.KYCStatus, rejectionReason *string, event *domain.OutboxEvent) error {
	k, ok := m.byID[kycID]
	if !ok {
		return domain.ErrKYCNotFound
	}
	k.Status = status
	k.RejectionReason = rejectionReason
	if status == domain.KYCStatusApproved {
		now := time.Now().UTC()
		k.VerifiedAt = &now
	}
	if event != nil {
		m.outbox = append(m.outbox, event)
	}
	return nil
}

func TestKYCService_SubmitKYC(t *testing.T) {
	repo := newMockKYCRepo()
	key := []byte("01234567890123456789012345678901")
	svc := NewKYCService(repo, key)
	ctx := context.Background()

	userID := uuid.New()
	validNIK := "3171012345670001"

	// 1. Invalid NIK length (< 16)
	_, err := svc.SubmitKYC(ctx, userID, domain.SubmitKYCRequest{
		IDCardNumber:   "12345",
		IDCardImageURL: "https://example.com/ktp.jpg",
		SelfieImageURL: "https://example.com/selfie.jpg",
	})
	if err != domain.ErrInvalidNIKLength {
		t.Fatalf("expected ErrInvalidNIKLength, got %v", err)
	}

	// 2. Valid submission
	resp, err := svc.SubmitKYC(ctx, userID, domain.SubmitKYCRequest{
		IDCardNumber:   validNIK,
		IDCardImageURL: "https://example.com/ktp.jpg",
		SelfieImageURL: "https://example.com/selfie.jpg",
	})
	if err != nil {
		t.Fatalf("expected successful submission, got %v", err)
	}
	if resp.Status != domain.KYCStatusPending || resp.IDCardNumber != validNIK {
		t.Fatalf("unexpected submission response: %+v", resp)
	}

	// 3. Duplicate submission while pending
	_, err = svc.SubmitKYC(ctx, userID, domain.SubmitKYCRequest{
		IDCardNumber:   validNIK,
		IDCardImageURL: "https://example.com/ktp.jpg",
		SelfieImageURL: "https://example.com/selfie.jpg",
	})
	if err != domain.ErrKYCAlreadyPending {
		t.Fatalf("expected ErrKYCAlreadyPending, got %v", err)
	}

	// 4. Duplicate NIK by another user
	anotherUser := uuid.New()
	_, err = svc.SubmitKYC(ctx, anotherUser, domain.SubmitKYCRequest{
		IDCardNumber:   validNIK,
		IDCardImageURL: "https://example.com/ktp2.jpg",
		SelfieImageURL: "https://example.com/selfie2.jpg",
	})
	if err != domain.ErrDuplicateNIK {
		t.Fatalf("expected ErrDuplicateNIK, got %v", err)
	}
}

func TestKYCService_ReviewKYC(t *testing.T) {
	repo := newMockKYCRepo()
	key := []byte("01234567890123456789012345678901")
	svc := NewKYCService(repo, key)
	ctx := context.Background()

	userID := uuid.New()
	nik := "3201012345670002"
	sub, _ := svc.SubmitKYC(ctx, userID, domain.SubmitKYCRequest{
		IDCardNumber:   nik,
		IDCardImageURL: "https://example.com/ktp.jpg",
		SelfieImageURL: "https://example.com/selfie.jpg",
	})

	// 1. Approve KYC
	resp, err := svc.ReviewKYC(ctx, sub.ID, domain.ReviewKYCRequest{
		Status: "approved",
	})
	if err != nil {
		t.Fatalf("expected approval to succeed, got %v", err)
	}
	if resp.Status != domain.KYCStatusApproved || resp.VerifiedAt == nil {
		t.Fatalf("expected approved status and non-nil verified_at: %+v", resp)
	}
	if len(repo.outbox) != 1 || repo.outbox[0].EventType != "KYCVerified" {
		t.Fatalf("expected 1 outbox KYCVerified event, got %d", len(repo.outbox))
	}

	// 2. Attempt to review already approved application
	_, err = svc.ReviewKYC(ctx, sub.ID, domain.ReviewKYCRequest{
		Status: "rejected",
	})
	if err != domain.ErrKYCNotPending {
		t.Fatalf("expected ErrKYCNotPending on duplicate review, got %v", err)
	}
}
