package repository

import (
	"github.com/agamlatiff/bastion/internal/domain"
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type KYCRepository interface {
	Create(ctx context.Context, kyc *domain.KYCVerification) error
	FindByUserID(ctx context.Context, userID string) (*domain.KYCVerification, error)
	FindByID(ctx context.Context, id string) (*domain.KYCVerification, error)
	ApproveKYC(ctx context.Context, kycID string, userID string) error
	RejectKYC(ctx context.Context, kycID string, reason string) error
}

type kycRepo struct {
	db *pgxpool.Pool
}

func NewKYCRepository(db *pgxpool.Pool) KYCRepository {
	return &kycRepo{db: db}
}

func (r *kycRepo) Create(ctx context.Context, kyc *domain.KYCVerification) error {
	query := `
		INSERT INTO kyc_verifications (user_id, id_card_number, id_card_image_url, selfie_image_url, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, status, submitted_at
	`
	return r.db.QueryRow(ctx, query, kyc.UserID, kyc.IDCardNumber, kyc.IDCardImageURL, kyc.SelfieImageURL, kyc.Status).Scan(&kyc.ID, &kyc.Status, &kyc.SubmittedAt)
}

func (r *kycRepo) FindByUserID(ctx context.Context, userID string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE user_id = $1
	`
	var kyc domain.KYCVerification
	err := r.db.QueryRow(ctx, query, userID).Scan(
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

func (r *kycRepo) FindByID(ctx context.Context, id string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE id = $1
	`
	var kyc domain.KYCVerification
	err := r.db.QueryRow(ctx, query, id).Scan(
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

func (r *kycRepo) ApproveKYC(ctx context.Context, kycID string, userID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	updateKYCQuery := `
		UPDATE kyc_verifications
		SET status = 'approved', verified_at = NOW(), rejection_reason = NULL
		WHERE id = $1
	`
	if _, err = tx.Exec(ctx, updateKYCQuery, kycID); err != nil {
		return err
	}

	updateUserQuery := `
		UPDATE users
		SET tier = 'tier_2', is_verified = TRUE, updated_at = NOW()
		WHERE id = $1
	`
	if _, err = tx.Exec(ctx, updateUserQuery, userID); err != nil {
		return err
	}

	updateWalletQuery := `
		UPDATE wallets 
		SET max_balance_limit = 10000000, updated_at = NOW()
		WHERE user_id = $1
	`
	if _, err = tx.Exec(ctx, updateWalletQuery, userID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *kycRepo) RejectKYC(ctx context.Context, kycID, reason string) error {
	query := `
		UPDATE kyc_verifications
		SET status = 'rejected', rejection_reason = $2, verified_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, kycID, reason)
	return err
}

