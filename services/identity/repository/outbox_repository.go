package repository

import (
	"context"
	"time"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/google/uuid"
)

// GetPendingOutboxEvents retrieves pending outbox events ordered by creation time, with row-level locking.
func (r *pgxRepository) GetPendingOutboxEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	query := `
		SELECT id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at, published_at
		FROM outbox_events
		WHERE status = 'PENDING'
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*domain.OutboxEvent
	for rows.Next() {
		var e domain.OutboxEvent
		if err := rows.Scan(
			&e.ID,
			&e.AggregateType,
			&e.AggregateID,
			&e.EventType,
			&e.Payload,
			&e.Status,
			&e.RetryCount,
			&e.CreatedAt,
			&e.PublishedAt,
		); err != nil {
			return nil, err
		}
		events = append(events, &e)
	}
	return events, rows.Err()
}

// MarkOutboxEventPublished marks an event as successfully published.
func (r *pgxRepository) MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE outbox_events
		SET status = 'PUBLISHED', published_at = $1
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, query, time.Now().UTC(), id)
	return err
}

// MarkOutboxEventFailed increments retry count and transitions status to FAILED if maxRetries exceeded.
func (r *pgxRepository) MarkOutboxEventFailed(ctx context.Context, id uuid.UUID, maxRetries int) error {
	query := `
		UPDATE outbox_events
		SET retry_count = retry_count + 1,
			status = CASE WHEN retry_count + 1 >= $1 THEN 'FAILED' ELSE 'PENDING' END
		WHERE id = $2
	`
	_, err := r.db.Exec(ctx, query, maxRetries, id)
	return err
}
