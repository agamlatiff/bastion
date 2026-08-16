package service

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
)

type KYCService interface {
	SubmitKYC(ctx context.Context, user *domain.User, req *domain.SubmitKYCRequest) (*domain.KYCVerification, error)
	GetKYCStatus(ctx context.Context, userID string) (*domain.KYCVerification, error)
	ReviewKYC(ctx context.Context, kycID string, req *domain.ReviewKYCRequest) (*domain.KYCVerification, error)
}

type kycService struct {
	kycRepo repository.KYCRepository
}

func NewKYCService(kycRepo repository.KYCRepository) KYCService {
	return &kycService{kycRepo: kycRepo}
}

func (s *kycService) SubmitKYC(ctx context.Context, user *domain.User, req *domain.SubmitKYCRequest) (*domain.KYCVerification, error) {
	// Validation for user had been verified
	if user.Tier == "tier_2" || user.IsVerified {
		return nil, errors.New("user is already verified as tier 2")
	}

	// Validation long words of Identity Card Number
	if len(req.IDCardNumber) != 16 {
		return nil, errors.New("id card number (NIK) must be exactly 16 digits")
	}

	// Validation is user has been submission which still "pending"
	existingKYC, err := s.kycRepo.FindByUserID(ctx, user.ID)
	if err == nil && existingKYC != nil {
		if existingKYC.Status == "pending" {
			return nil, errors.New("you already have a pending KYC application under review")
		}
		if existingKYC.Status == "approved" {
			return nil, errors.New("your KYC is already approved")
		}
	}

	// Create new entity object
	kyc := &domain.KYCVerification{
		UserID:         user.ID,
		IDCardNumber:   req.IDCardNumber,
		IDCardImageURL: req.IDCardImageURL,
		SelfieImageURL: req.SelfieImageURL,
		Status:         "pending",
	}

	err = s.kycRepo.Create(ctx, kyc)
	if err != nil {
		return nil, err
	}

	return kyc, nil

}

func (s *kycService) GetKYCStatus(ctx context.Context, userID string) (*domain.KYCVerification, error) {
	return s.kycRepo.FindByUserID(ctx, userID)
}

func (s *kycService) ReviewKYC(ctx context.Context, kycID string, req *domain.ReviewKYCRequest) (*domain.KYCVerification, error) {
	// Get submission data KYC from the ID
	existingKYC, err := s.kycRepo.FindByID(ctx, kycID)
	if err != nil {
		return nil, err
	}

	// Only submission with 'pending' status could allow to review
	if existingKYC.Status != "pending" {
		return nil, errors.New("only pending KYC applications can be reviewed")
	}

	// Validation Status
	switch req.Status {
	case "approved":
		// Running database transaction (Update status KYC + Upgrade user into Tier 2 + Increase limit wallet into 10 millions)
		err := s.kycRepo.ApproveKYC(ctx, kycID, existingKYC.UserID)
		if err != nil {
			return nil, err
		}
	case "rejected":
		reason := req.RejectionReason
		if reason == "" {
			reason = "ID card photo is blurry or information does not match"
		}
		err = s.kycRepo.RejectKYC(ctx, kycID, reason)
		if err != nil {
			return nil, err
		}
	default:
		return nil, errors.New("invalid status: must be either 'approved' or 'rejected'")
	}

	// Return KYC new data after update
	return s.kycRepo.FindByID(ctx, kycID)
}



