package service

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/agamlatiff/bastion/internal/repository"
)

type KYCService interface {
	SubmitKYC(ctx context.Context, user *domain.User, req *dto.SubmitKYCRequest) (*domain.KYCVerification, error)
	GetKYCStatus(ctx context.Context, userID string) (*domain.KYCVerification, error)
	ReviewKYC(ctx context.Context, kycID string, req *dto.ReviewKYCRequest) (*domain.KYCVerification, error)
}

type kycService struct {
	transactor    repository.Transactor
	kycRepo       repository.KYCRepository
	userRepo      repository.UserRepository
	walletRepo    repository.WalletRepository
	encryptionKey []byte
}

func NewKYCService(
	transactor repository.Transactor,
	kycRepo repository.KYCRepository,
	userRepo repository.UserRepository,
	walletRepo repository.WalletRepository,
	encryptionKey []byte,
) KYCService {
	return &kycService{
		transactor:    transactor,
		kycRepo:       kycRepo,
		userRepo:      userRepo,
		walletRepo:    walletRepo,
		encryptionKey: encryptionKey,
	}
}

func (s *kycService) SubmitKYC(ctx context.Context, user *domain.User, req *dto.SubmitKYCRequest) (*domain.KYCVerification, error) {
	// Step 1: Check if user is already tier 2 / verified
	if user.Tier == domain.Tier2 || user.IsVerified {
		return nil, domain.ErrAlreadyVerified
	}

	// Step 2: Validate Indonesian NIK length format (strictly 16 digits)
	if len(req.IDCardNumber) != 16 {
		return nil, domain.ErrInvalidNIKLength
	}

	// Step 3: Check for existing pending or approved KYC submissions to avoid duplicate reviews
	existingKYC, err := s.kycRepo.FindByUserID(ctx, s.transactor.DB(), user.ID)
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

	// Step 4: Encrypt sensitive PII (NIK / ID Card Number) at rest using AES-256-GCM
	encryptedNIK, err := security.Encrypt(req.IDCardNumber, s.encryptionKey)
	if err != nil {
		return nil, err
	}

	// Step 5: Map request DTO to KYCVerification domain entity with encrypted NIK
	kyc := req.ToKYCVerification(user.ID)
	kyc.IDCardNumber = encryptedNIK

	// Step 6: Save new KYC application into `kyc_verifications` table
	if err := s.kycRepo.Create(ctx, s.transactor.DB(), kyc); err != nil {
		return nil, err
	}

	// Restore plaintext for in-memory response return
	kyc.IDCardNumber = req.IDCardNumber
	return kyc, nil
}

func (s *kycService) GetKYCStatus(ctx context.Context, userID string) (*domain.KYCVerification, error) {
	// Step 1: Retrieve latest KYC verification record for the given user ID
	kyc, err := s.kycRepo.FindByUserID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return nil, err
	}

	// Step 2: Decrypt NIK if stored in encrypted format
	if decrypted, err := security.Decrypt(kyc.IDCardNumber, s.encryptionKey); err == nil {
		kyc.IDCardNumber = decrypted
	}

	return kyc, nil
}

func (s *kycService) ReviewKYC(ctx context.Context, kycID string, req *dto.ReviewKYCRequest) (*domain.KYCVerification, error) {
	// Step 1: Find existing KYC application by ID
	existingKYC, err := s.kycRepo.FindByID(ctx, s.transactor.DB(), kycID)
	if err != nil {
		return nil, err
	}

	// Step 2: Ensure the application is currently in PENDING state
	if existingKYC.Status != domain.KYCStatusPending {
		return nil, domain.ErrKYCNotPending
	}

	// Step 3: Handle approval or rejection logic
	switch req.Status {
	case domain.KYCStatusApproved:
		// Step 3a: Atomically execute KYC approval, user tier upgrade, and wallet limit upgrade
		err := s.transactor.WithTx(ctx, func(db repository.DBTX) error {
			// (i) Update KYC status to APPROVED
			if err := s.kycRepo.UpdateStatus(ctx, db, kycID, domain.KYCStatusApproved, nil); err != nil {
				return err
			}
			// (ii) Upgrade user tier to Tier2 and mark as verified
			if err := s.userRepo.UpdateTierAndVerification(ctx, db, existingKYC.UserID, domain.Tier2, true); err != nil {
				return err
			}
			// (iii) Increase wallet maximum balance limit according to Tier2 limit constant
			if err := s.walletRepo.UpdateMaxLimit(ctx, db, existingKYC.UserID, domain.Tier2MaxBalanceLimit); err != nil {
				return err
			}
			return nil
		})
		if err != nil {
			return nil, err
		}

	case domain.KYCStatusRejected:
		// Step 3b: Set rejection reason with fallback default if omitted
		reason := req.RejectionReason
		if reason == "" {
			reason = "ID card photo is blurry or information does not match"
		}

		// Update KYC status to REJECTED
		if err := s.kycRepo.UpdateStatus(ctx, s.transactor.DB(), kycID, domain.KYCStatusRejected, &reason); err != nil {
			return nil, err
		}

	default:
		return nil, domain.ErrInvalidKYCStatus
	}

	// Step 4: Return updated KYC verification record with decrypted NIK
	updatedKYC, err := s.kycRepo.FindByID(ctx, s.transactor.DB(), kycID)
	if err != nil {
		return nil, err
	}

	if decrypted, err := security.Decrypt(updatedKYC.IDCardNumber, s.encryptionKey); err == nil {
		updatedKYC.IDCardNumber = decrypted
	}

	return updatedKYC, nil
}
