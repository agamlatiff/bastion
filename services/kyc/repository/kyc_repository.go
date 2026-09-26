package repository

import (
	"context"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/services/kyc/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type kycRepository struct {
	pool *pgxpool.Pool
}

// NewKYCRepository instantiates a PostgreSQL KYC repository.
func NewKYCRepository(pool *pgxpool.Pool) domain.KYCRepository {
	return &kycRepository{pool: pool}
}

func (r *kycRepository) Create(ctx context.Context, kyc *domain.KYCVerification) error {
	if kyc.ID == uuid.Nil {
		kyc.ID = uuid.New()
	}
	if kyc.SubmittedAt.IsZero() {
		kyc.SubmittedAt = time.Now().UTC()
	}
	if kyc.Status == "" {
		kyc.Status = domain.KYCStatusPending
	}

	query := `
		INSERT INTO kyc_verifications (id, user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status, submitted_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, status, submitted_at
	`
	return r.pool.QueryRow(
		ctx, query,
		kyc.ID,
		kyc.UserID,
		kyc.IDCardNumber,
		kyc.IDCardHash,
		kyc.IDCardImageURL,
		kyc.SelfieImageURL,
		kyc.Status,
		kyc.SubmittedAt,
	).Scan(&kyc.ID, &kyc.Status, &kyc.SubmittedAt)
}

func (r *kycRepository) FindByUserID(ctx context.Context, userID uuid.UUID) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE user_id = $1
	`
	var k domain.KYCVerification
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&k.ID,
		&k.UserID,
		&k.IDCardNumber,
		&k.IDCardHash,
		&k.IDCardImageURL,
		&k.SelfieImageURL,
		&k.Status,
		&k.RejectionReason,
		&k.SubmittedAt,
		&k.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrKYCNotFound
		}
		return nil, err
	}
	return &k, nil
}

func (r *kycRepository) FindByID(ctx context.Context, id uuid.UUID) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE id = $1
	`
	var k domain.KYCVerification
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&k.ID,
		&k.UserID,
		&k.IDCardNumber,
		&k.IDCardHash,
		&k.IDCardImageURL,
		&k.SelfieImageURL,
		&k.Status,
		&k.RejectionReason,
		&k.SubmittedAt,
		&k.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrKYCNotFound
		}
		return nil, err
	}
	return &k, nil
}

func (r *kycRepository) FindByIDCardHash(ctx context.Context, hash string) (*domain.KYCVerification, error) {
	query := `
		SELECT id, user_id, id_card_number, id_card_hash, id_card_image_url, selfie_image_url, status, rejection_reason, submitted_at, verified_at
		FROM kyc_verifications
		WHERE id_card_hash = $1
	`
	var k domain.KYCVerification
	err := r.pool.QueryRow(ctx, query, hash).Scan(
		&k.ID,
		&k.UserID,
		&k.IDCardNumber,
		&k.IDCardHash,
		&k.IDCardImageURL,
		&k.SelfieImageURL,
		&k.Status,
		&k.RejectionReason,
		&k.SubmittedAt,
		&k.VerifiedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrKYCNotFound
		}
		return nil, err
	}
	return &k, nil
}

func (r *kycRepository) UpdateStatus(ctx context.Context, kycID uuid.UUID, status domain.KYCStatus, rejectionReason *string, event *domain.OutboxEvent) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var verifiedAt *time.Time
	if status == domain.KYCStatusApproved {
		now := time.Now().UTC()
		verifiedAt = &now
	}

	updateQuery := `
		UPDATE kyc_verifications
		SET status = $1, rejection_reason = $2, verified_at = $3
		WHERE id = $4
	`
	cmdTag, err := tx.Exec(ctx, updateQuery, status, rejectionReason, verifiedAt, kycID)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return domain.ErrKYCNotFound
	}

	// Atomically insert outbox event if provided
	if event != nil {
		if event.ID == uuid.Nil {
			event.ID = uuid.New()
		}
		outboxQuery := `
			INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at)
			VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
		`
		_, err := tx.Exec(ctx, outboxQuery,
			event.ID,
			event.AggregateType,
			event.AggregateID,
			event.EventType,
			event.Payload,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
