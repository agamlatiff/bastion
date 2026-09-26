package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agamlatiff/bastion/services/kyc/domain"
	"github.com/agamlatiff/bastion/services/kyc/security"
	"github.com/google/uuid"
)

// KYCService defines the use cases for managing KYC submissions and reviews.
type KYCService interface {
	SubmitKYC(ctx context.Context, userID uuid.UUID, req domain.SubmitKYCRequest) (*domain.KYCResponse, error)
	GetKYCStatus(ctx context.Context, userID uuid.UUID) (*domain.KYCResponse, error)
	ReviewKYC(ctx context.Context, kycID uuid.UUID, req domain.ReviewKYCRequest) (*domain.KYCResponse, error)
}

type kycService struct {
	kycRepo       domain.KYCRepository
	encryptionKey []byte
}

// NewKYCService instantiates a new KYC business logic service.
func NewKYCService(repo domain.KYCRepository, encryptionKey []byte) KYCService {
	return &kycService{
		kycRepo:       repo,
		encryptionKey: encryptionKey,
	}
}

// SubmitKYC validates, encrypts, and records a new identity verification application.
func (s *kycService) SubmitKYC(ctx context.Context, userID uuid.UUID, req domain.SubmitKYCRequest) (*domain.KYCResponse, error) {
	trimmedNIK := strings.TrimSpace(req.IDCardNumber)

	// Step 1: Validate Indonesian NIK length (strictly 16 digits)
	if len(trimmedNIK) != 16 {
		return nil, domain.ErrInvalidNIKLength
	}

	// Step 2: Check for existing pending or approved KYC submissions
	existingKYC, err := s.kycRepo.FindByUserID(ctx, userID)
	if err != nil && !errors.Is(err, domain.ErrKYCNotFound) {
		return nil, err
	}
	if existingKYC != nil {
		if existingKYC.Status == domain.KYCStatusPending {
			return nil, domain.ErrKYCAlreadyPending
		}
		if existingKYC.Status == domain.KYCStatusApproved {
			return nil, domain.ErrKYCAlreadyApproved
		}
	}

	// Step 3: Compute blind index hash to prevent duplicate NIK across accounts
	nikHash := security.HashBlindIndex(trimmedNIK, s.encryptionKey)
	duplicateKYC, err := s.kycRepo.FindByIDCardHash(ctx, nikHash)
	if err != nil && !errors.Is(err, domain.ErrKYCNotFound) {
		return nil, err
	}
	if duplicateKYC != nil && duplicateKYC.UserID != userID {
		return nil, domain.ErrDuplicateNIK
	}

	// Step 4: Encrypt PII (NIK) at rest using AES-256-GCM
	encryptedNIK, err := security.Encrypt(trimmedNIK, s.encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt id card number: %w", err)
	}

	// Step 5: Save KYC application
	kyc := &domain.KYCVerification{
		ID:             uuid.New(),
		UserID:         userID,
		IDCardNumber:   encryptedNIK,
		IDCardHash:     nikHash,
		IDCardImageURL: strings.TrimSpace(req.IDCardImageURL),
		SelfieImageURL: strings.TrimSpace(req.SelfieImageURL),
		Status:         domain.KYCStatusPending,
		SubmittedAt:    time.Now().UTC(),
	}

	if err := s.kycRepo.Create(ctx, kyc); err != nil {
		return nil, err
	}

	// Restore plaintext for in-memory response return
	resp := kyc.ToResponse()
	resp.IDCardNumber = trimmedNIK
	return &resp, nil
}

// GetKYCStatus retrieves the latest verification status for the requesting user.
func (s *kycService) GetKYCStatus(ctx context.Context, userID uuid.UUID) (*domain.KYCResponse, error) {
	kyc, err := s.kycRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Decrypt NIK for display to owner
	if decrypted, err := security.Decrypt(kyc.IDCardNumber, s.encryptionKey); err == nil {
		kyc.IDCardNumber = decrypted
	}

	resp := kyc.ToResponse()
	return &resp, nil
}

// ReviewKYC transitions a pending KYC application to approved or rejected, emitting an outbox event on approval.
func (s *kycService) ReviewKYC(ctx context.Context, kycID uuid.UUID, req domain.ReviewKYCRequest) (*domain.KYCResponse, error) {
	existingKYC, err := s.kycRepo.FindByID(ctx, kycID)
	if err != nil {
		return nil, err
	}

	if existingKYC.Status != domain.KYCStatusPending {
		return nil, domain.ErrKYCNotPending
	}

	normalizedStatus := domain.KYCStatus(strings.ToLower(strings.TrimSpace(req.Status)))
	switch normalizedStatus {
	case domain.KYCStatusApproved:
		// Build KYCVerified domain event for outbox
		verifiedEvent := domain.KYCVerifiedEvent{
			EventID:     uuid.New().String(),
			EventType:   "KYCVerified",
			AggregateID: kycID.String(),
			UserID:      existingKYC.UserID.String(),
			Status:      string(domain.KYCStatusApproved),
			Timestamp:   time.Now().UTC(),
		}
		payloadBytes, err := json.Marshal(verifiedEvent)
		if err != nil {
			return nil, fmt.Errorf("failed to serialize KYCVerified event: %w", err)
		}

		outboxRecord := &domain.OutboxEvent{
			ID:            uuid.New(),
			AggregateType: "KYC",
			AggregateID:   kycID,
			EventType:     "KYCVerified",
			Payload:       payloadBytes,
		}

		if err := s.kycRepo.UpdateStatus(ctx, kycID, domain.KYCStatusApproved, nil, outboxRecord); err != nil {
			return nil, err
		}

	case domain.KYCStatusRejected:
		reason := strings.TrimSpace(req.RejectionReason)
		if reason == "" {
			reason = "ID card photo is unclear or information does not match"
		}
		if err := s.kycRepo.UpdateStatus(ctx, kycID, domain.KYCStatusRejected, &reason, nil); err != nil {
			return nil, err
		}

	default:
		return nil, domain.ErrInvalidKYCStatus
	}

	// Fetch updated record and decrypt NIK
	updatedKYC, err := s.kycRepo.FindByID(ctx, kycID)
	if err != nil {
		return nil, err
	}
	if decrypted, err := security.Decrypt(updatedKYC.IDCardNumber, s.encryptionKey); err == nil {
		updatedKYC.IDCardNumber = decrypted
	}

	resp := updatedKYC.ToResponse()
	return &resp, nil
}
