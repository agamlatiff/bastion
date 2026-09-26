package domain

import (
	"context"

	"github.com/google/uuid"
)

// CustomerRepository defines database access contracts for customer profiles.
type CustomerRepository interface {
	FindByIdentityUserID(ctx context.Context, identityUserID uuid.UUID) (*Customer, error)
	ExistsByIdentityUserID(ctx context.Context, identityUserID uuid.UUID) (bool, error)
	Create(ctx context.Context, customer *Customer) error
	Update(ctx context.Context, customer *Customer) error
}

// ProcessedEventRepository defines idempotency persistence operations.
type ProcessedEventRepository interface {
	IsEventProcessed(ctx context.Context, consumerName string, eventID uuid.UUID) (bool, error)
	MarkEventProcessed(ctx context.Context, consumerName string, eventID uuid.UUID) error
}
