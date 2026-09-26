package repository

import (
	"context"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type processedEventRepository struct {
	pool *pgxpool.Pool
}

// NewProcessedEventRepository instantiates an event idempotency repository.
func NewProcessedEventRepository(pool *pgxpool.Pool) domain.ProcessedEventRepository {
	return &processedEventRepository{pool: pool}
}

func (r *processedEventRepository) IsEventProcessed(ctx context.Context, consumerName string, eventID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM processed_events WHERE consumer_name = $1 AND event_id = $2)`
	var exists bool
	err := r.pool.QueryRow(ctx, query, consumerName, eventID).Scan(&exists)
	return exists, err
}

func (r *processedEventRepository) MarkEventProcessed(ctx context.Context, consumerName string, eventID uuid.UUID) error {
	query := `
		INSERT INTO processed_events (consumer_name, event_id, processed_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (consumer_name, event_id) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, query, consumerName, eventID)
	return err
}
