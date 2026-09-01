package service

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/repository"
)

type KYCService interface {
	SubmitKYC(ctx context.Context, user *domain.User, req *dto.SubmitKYCRequest) (*domain.KYCVerification, error)
	GetKYCStatus(ctx context.Context, userID string) (*domain.KYCVerification, error)
	ReviewKYC(ctx context.Context, kycID string, req *dto.ReviewKYCRequest) (*domain.KYCVerification, error)
}

type kycService struct {
	transactor repository.Transactor
	kycRepo    repository.KYCRepository
	userRepo   repository.UserRepository
	walletRepo repository.WalletRepository
}

func NewKYCService(
	transactor repository.Transactor,
	kycRepo repository.KYCRepository,
	userRepo repository.UserRepository,
	walletRepo repository.WalletRepository,
) KYCService {
	return &kycService{
		transactor: transactor,
		kycRepo:    kycRepo,
		userRepo:   userRepo,
		walletRepo: walletRepo,
	}
}

func (s *kycService) SubmitKYC(ctx context.Context, user *domain.User, req *dto.SubmitKYCRequest) (*domain.KYCVerification, error) {
	// Step 1: Check if user is already tier 2 / verified
	if user.Tier == "tier_2" || user.IsVerified {
		return nil, errors.New("user is already verified as tier 2")
	}

	// Step 2: Validate Indonesian NIK length format (strictly 16 digits)
	if len(req.IDCardNumber) != 16 {
		return nil, errors.New("id card number (NIK) must be exactly 16 digits")
	}

	// Step 3: Check for existing pending or approved KYC submissions to avoid duplicate reviews
	existingKYC, err := s.kycRepo.FindByUserID(ctx, s.transactor.DB(), user.ID)
	if err == nil && existingKYC != nil {
		if existingKYC.Status == domain.KYCStatusPending {
			return nil, errors.New("you already have a pending KYC application under review")
		}
		if existingKYC.Status == domain.KYCStatusApproved {
			return nil, errors.New("your KYC is already approved")
		}
	}

	// Step 4: Map request DTO to KYCVerification domain entity
	kyc := req.ToKYCVerification(user.ID)

	// Step 5: Save new KYC application into `kyc_verifications` table
	if err := s.kycRepo.Create(ctx, s.transactor.DB(), kyc); err != nil {
		return nil, err
	}

	return kyc, nil
}

func (s *kycService) GetKYCStatus(ctx context.Context, userID string) (*domain.KYCVerification, error) {
	// Step 1: Retrieve latest KYC verification record for the given user ID
	return s.kycRepo.FindByUserID(ctx, s.transactor.DB(), userID)
}

func (s *kycService) ReviewKYC(ctx context.Context, kycID string, req *dto.ReviewKYCRequest) (*domain.KYCVerification, error) {
	// Step 1: Find existing KYC application by ID
	existingKYC, err := s.kycRepo.FindByID(ctx, s.transactor.DB(), kycID)
	if err != nil {
		return nil, err
	}

	// Step 2: Ensure the application is currently in PENDING state
	if existingKYC.Status != domain.KYCStatusPending {
		return nil, errors.New("only pending KYC applications can be reviewed")
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
			// (ii) Upgrade user tier to tier_2 and mark as verified
			if err := s.userRepo.UpdateTierAndVerification(ctx, db, existingKYC.UserID, "tier_2", true); err != nil {
				return err
			}
			// (iii) Increase wallet maximum balance limit to 10,000,000 IDR
			if err := s.walletRepo.UpdateMaxLimit(ctx, db, existingKYC.UserID, 10000000); err != nil {
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
		return nil, errors.New("invalid status: must be either 'approved' or 'rejected'")
	}

	// Step 4: Return updated KYC verification record
	return s.kycRepo.FindByID(ctx, s.transactor.DB(), kycID)
}
