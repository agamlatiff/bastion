package repository

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/jackc/pgx/v5"
)

type KYCRepository interface {
	Create(ctx context.Context, db DBTX, kyc *domain.KYCVerification) error
	FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.KYCVerification, error)
	FindByID(ctx context.Context, db DBTX, id string) (*domain.KYCVerification, error)
	UpdateStatus(ctx context.Context, db DBTX, kycID string, status string, rejectionReason *string) error
}

type kycRepo struct{}

func NewKYCRepository() KYCRepository {
	return &kycRepo{}
}

func (r *kycRepo) Create(ctx context.Context, db DBTX, kyc *domain.KYCVerification) error {
	query := `
		INSERT INTO kyc_verifications (user_id, id_card_number, id_card_image_url, selfie_image_url, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, status, submitted_at
	`
	return db.QueryRow(
		ctx, query,
		kyc.UserID,
		kyc.IDCardNumber,
		kyc.IDCardImageURL,
		kyc.SelfieImageURL,
		kyc.Status,
	).Scan(&kyc.ID, &kyc.Status, &kyc.SubmittedAt)
}

func (r *kycRepo) FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE user_id = $1
	`
	var kyc domain.KYCVerification
	err := db.QueryRow(ctx, query, userID).Scan(
		&kyc.ID,
		&kyc.UserID,
		&kyc.IDCardNumber,
		&kyc.IDCardImageURL,
		&kyc.SelfieImageURL,
		&kyc.Status,
		&kyc.RejectionReason,
		&kyc.SubmittedAt,
		&kyc.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("kyc application not found")
		}
		return nil, err
	}
	return &kyc, nil
}

func (r *kycRepo) FindByID(ctx context.Context, db DBTX, id string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE id = $1
	`
	var kyc domain.KYCVerification
	err := db.QueryRow(ctx, query, id).Scan(
		&kyc.ID,
		&kyc.UserID,
		&kyc.IDCardNumber,
		&kyc.IDCardImageURL,
		&kyc.SelfieImageURL,
		&kyc.Status,
		&kyc.RejectionReason,
		&kyc.SubmittedAt,
		&kyc.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("kyc application not found")
		}
		return nil, err
	}
	return &kyc, nil
}

func (r *kycRepo) UpdateStatus(ctx context.Context, db DBTX, kycID string, status string, rejectionReason *string) error {
	var query string
	if status == domain.KYCStatusApproved {
		query = `
			UPDATE kyc_verifications
			SET status = 'approved', verified_at = NOW(), rejection_reason = NULL
			WHERE id = $1
		`
		_, err := db.Exec(ctx, query, kycID)
		return err
	}

	query = `
		UPDATE kyc_verifications
		SET status = 'rejected', rejection_reason = $2, verified_at = NOW()
		WHERE id = $1
	`
	_, err := db.Exec(ctx, query, kycID, rejectionReason)
	return err
}
