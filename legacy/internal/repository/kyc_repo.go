package repository

import (
	"context"
	"errors"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/jackc/pgx/v5"
)

// KYCRepository defines the persistence interface for managing `kyc_verifications` records.
type KYCRepository interface {
	Create(ctx context.Context, db DBTX, kyc *domain.KYCVerification) error
	FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.KYCVerification, error)
	FindByID(ctx context.Context, db DBTX, id string) (*domain.KYCVerification, error)
	FindByIDCardHash(ctx context.Context, db DBTX, hash string) (*domain.KYCVerification, error)
	UpdateStatus(ctx context.Context, db DBTX, kycID string, status string, rejectionReason *string) error
}

type kycRepo struct{}

// NewKYCRepository creates a new stateless KYCRepository instance.
func NewKYCRepository() KYCRepository {
	return &kycRepo{}
}

// Create inserts a new KYC application record into `kyc_verifications`.
func (r *kycRepo) Create(ctx context.Context, db DBTX, kyc *domain.KYCVerification) error {
	query := `
		INSERT INTO kyc_verifications (user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, status, submitted_at
	`
	return db.QueryRow(
		ctx, query,
		kyc.UserID,
		kyc.IDCardNumber,
		kyc.IDCardHash,
		kyc.IDCardImageURL,
		kyc.SelfieImageURL,
		kyc.Status,
	).Scan(&kyc.ID, &kyc.Status, &kyc.SubmittedAt)
}

// FindByUserID retrieves the KYC verification submission belonging to a specific user ID.
func (r *kycRepo) FindByUserID(ctx context.Context, db DBTX, userID string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE user_id = $1
	`
	var kyc domain.KYCVerification
	err := db.QueryRow(ctx, query, userID).Scan(
		&kyc.ID,
		&kyc.UserID,
		&kyc.IDCardNumber,
		&kyc.IDCardHash,
		&kyc.IDCardImageURL,
		&kyc.SelfieImageURL,
		&kyc.Status,
		&kyc.RejectionReason,
		&kyc.SubmittedAt,
		&kyc.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrKYCNotFound
		}
		return nil, err
	}
	return &kyc, nil
}

// FindByID retrieves a single KYC application record by its primary key UUID string.
func (r *kycRepo) FindByID(ctx context.Context, db DBTX, id string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE id = $1
	`
	var kyc domain.KYCVerification
	err := db.QueryRow(ctx, query, id).Scan(
		&kyc.ID,
		&kyc.UserID,
		&kyc.IDCardNumber,
		&kyc.IDCardHash,
		&kyc.IDCardImageURL,
		&kyc.SelfieImageURL,
		&kyc.Status,
		&kyc.RejectionReason,
		&kyc.SubmittedAt,
		&kyc.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrKYCNotFound
		}
		return nil, err
	}
	return &kyc, nil
}

// FindByIDCardHash searches a KYC verification record by its deterministic HMAC blind index hash.
func (r *kycRepo) FindByIDCardHash(ctx context.Context, db DBTX, hash string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE id_card_hash = $1
	`
	var kyc domain.KYCVerification
	err := db.QueryRow(ctx, query, hash).Scan(
		&kyc.ID,
		&kyc.UserID,
		&kyc.IDCardNumber,
		&kyc.IDCardHash,
		&kyc.IDCardImageURL,
		&kyc.SelfieImageURL,
		&kyc.Status,
		&kyc.RejectionReason,
		&kyc.SubmittedAt,
		&kyc.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrKYCNotFound
		}
		return nil, err
	}
	return &kyc, nil
}

// UpdateStatus sets the KYC status (e.g. "approved" or "rejected") and records verification timestamp or rejection reason.
func (r *kycRepo) UpdateStatus(ctx context.Context, db DBTX, kycID string, status string, rejectionReason *string) error {
	if status == domain.KYCStatusApproved {
		query := `
			UPDATE kyc_verifications
			SET status = 'approved', verified_at = NOW(), rejection_reason = NULL
			WHERE id = $1
		`
		res, err := db.Exec(ctx, query, kycID)
		if err != nil {
			return err
		}
		if res.RowsAffected() == 0 {
			return domain.ErrKYCNotFound
		}
		return nil
	}

	query := `
		UPDATE kyc_verifications
		SET status = 'rejected', rejection_reason = $2, verified_at = NOW()
		WHERE id = $1
	`
	res, err := db.Exec(ctx, query, kycID, rejectionReason)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return domain.ErrKYCNotFound
	}
	return nil
}
