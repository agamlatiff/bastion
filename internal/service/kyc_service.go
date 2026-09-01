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
	kycRepo repository.KYCRepository
}

func NewKYCService(kycRepo repository.KYCRepository) KYCService {
	return &kycService{kycRepo: kycRepo}
}

func (s *kycService) SubmitKYC(ctx context.Context, user *domain.User, req *dto.SubmitKYCRequest) (*domain.KYCVerification, error) {
	if user.Tier == "tier_2" || user.IsVerified {
		return nil, errors.New("user is already verified as tier 2")
	}

	if len(req.IDCardNumber) != 16 {
		return nil, errors.New("id card number (NIK) must be exactly 16 digits")
	}

	existingKYC, err := s.kycRepo.FindByUserID(ctx, user.ID)
	if err == nil && existingKYC != nil {
		if existingKYC.Status == domain.KYCStatusPending {
			return nil, errors.New("you already have a pending KYC application under review")
		}
		if existingKYC.Status == domain.KYCStatusApproved {
			return nil, errors.New("your KYC is already approved")
		}
	}

	kyc := &domain.KYCVerification{
		UserID:         user.ID,
		IDCardNumber:   req.IDCardNumber,
		IDCardImageURL: req.IDCardImageURL,
		SelfieImageURL: req.SelfieImageURL,
		Status:         domain.KYCStatusPending,
	}

	if err := s.kycRepo.Create(ctx, kyc); err != nil {
		return nil, err
	}

	return kyc, nil
}

func (s *kycService) GetKYCStatus(ctx context.Context, userID string) (*domain.KYCVerification, error) {
	return s.kycRepo.FindByUserID(ctx, userID)
}

func (s *kycService) ReviewKYC(ctx context.Context, kycID string, req *dto.ReviewKYCRequest) (*domain.KYCVerification, error) {
	existingKYC, err := s.kycRepo.FindByID(ctx, kycID)
	if err != nil {
		return nil, err
	}

	if existingKYC.Status != domain.KYCStatusPending {
		return nil, errors.New("only pending KYC applications can be reviewed")
	}

	switch req.Status {
	case domain.KYCStatusApproved:
		err := s.kycRepo.ApproveKYC(ctx, kycID, existingKYC.UserID)
		if err != nil {
			return nil, err
		}
	case domain.KYCStatusRejected:
		reason := req.RejectionReason
		if reason == "" {
			reason = "ID card photo is blurry or information does not match"
		}
		if err := s.kycRepo.RejectKYC(ctx, kycID, reason); err != nil {
			return nil, err
		}
	default:
		return nil, errors.New("invalid status: must be either 'approved' or 'rejected'")
	}

	return s.kycRepo.FindByID(ctx, kycID)
}
