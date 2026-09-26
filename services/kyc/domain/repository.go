package domain

import (
	"context"

	"github.com/google/uuid"
)

// KYCRepository defines persistence operations for KYC verifications.
type KYCRepository interface {
	Create(ctx context.Context, kyc *KYCVerification) error
	FindByUserID(ctx context.Context, userID uuid.UUID) (*KYCVerification, error)
	FindByID(ctx context.Context, id uuid.UUID) (*KYCVerification, error)
	FindByIDCardHash(ctx context.Context, hash string) (*KYCVerification, error)
	UpdateStatus(ctx context.Context, kycID uuid.UUID, status KYCStatus, rejectionReason *string, event *OutboxEvent) error
}

// OutboxRepository handles transactional outbox polling and publishing state.
type OutboxRepository interface {
	GetPendingEvents(ctx context.Context, batchSize int) ([]OutboxEvent, error)
	MarkEventPublished(ctx context.Context, id uuid.UUID) error
}
