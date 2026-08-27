package kyc

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/internal/auth"
)

type Service interface {
	SubmitKYC(ctx context.Context, user *auth.User, req *SubmitKYCRequest) (*KYCVerification, error)
	GetKYCStatus(ctx context.Context, userID string) (*KYCVerification, error)
	ReviewKYC(ctx context.Context, kycID string, req *ReviewKYCRequest) (*KYCVerification, error)
}

type service struct {
	kycRepo Repository
}

func NewService(kycRepo Repository) Service {
	return &service{kycRepo: kycRepo}
}

func (s *service) SubmitKYC(ctx context.Context, user *auth.User, req *SubmitKYCRequest) (*KYCVerification, error) {
	if user.Tier == "tier_2" || user.IsVerified {
		return nil, errors.New("user is already verified as tier 2")
	}

	if len(req.IDCardNumber) != 16 {
		return nil, errors.New("id card number (NIK) must be exactly 16 digits")
	}

	existingKYC, err := s.kycRepo.FindByUserID(ctx, user.ID)
	if err == nil && existingKYC != nil {
		if existingKYC.Status == KYCStatusPending {
			return nil, errors.New("you already have a pending KYC application under review")
		}
		if existingKYC.Status == KYCStatusApproved {
			return nil, errors.New("your KYC is already approved")
		}
	}

	kyc := &KYCVerification{
		UserID:         user.ID,
		IDCardNumber:   req.IDCardNumber,
		IDCardImageURL: req.IDCardImageURL,
		SelfieImageURL: req.SelfieImageURL,
		Status:         KYCStatusPending,
	}

	if err := s.kycRepo.Create(ctx, kyc); err != nil {
		return nil, err
	}

	return kyc, nil
}

func (s *service) GetKYCStatus(ctx context.Context, userID string) (*KYCVerification, error) {
	return s.kycRepo.FindByUserID(ctx, userID)
}

func (s *service) ReviewKYC(ctx context.Context, kycID string, req *ReviewKYCRequest) (*KYCVerification, error) {
	existingKYC, err := s.kycRepo.FindByID(ctx, kycID)
	if err != nil {
		return nil, err
	}

	if existingKYC.Status != KYCStatusPending {
		return nil, errors.New("only pending KYC applications can be reviewed")
	}

	switch req.Status {
	case KYCStatusApproved:
		err := s.kycRepo.ApproveKYC(ctx, kycID, existingKYC.UserID)
		if err != nil {
			return nil, err
		}
	case KYCStatusRejected:
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
