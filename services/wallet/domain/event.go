package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// EventEnvelope standard schema across Bastion platform
type EventEnvelope struct {
	EventID       uuid.UUID       `json:"event_id"`
	EventType     string          `json:"event_type"`
	EventVersion  int             `json:"event_version"`
	AggregateID   uuid.UUID       `json:"aggregate_id"`
	OccurredAt    time.Time       `json:"occurred_at"`
	CorrelationID uuid.UUID       `json:"correlation_id"`
	Data          json.RawMessage `json:"data"`
}

// OutboxEvent entity mapped to `outbox_events` table
type OutboxEvent struct {
	ID            uuid.UUID
	AggregateType string
	AggregateID   uuid.UUID
	EventType     string
	Payload       []byte
	Status        string // PENDING, PUBLISHED, FAILED
	CreatedAt     time.Time
	PublishedAt   *time.Time
}

// Event Data Payloads
type WalletCreatedPayload struct {
	WalletID   uuid.UUID `json:"wallet_id"`
	CustomerID uuid.UUID `json:"customer_id"`
	Currency   string    `json:"currency"`
	Balance    int64     `json:"balance"`
	Status     string    `json:"status"`
}

type WalletStatusChangedPayload struct {
	WalletID   uuid.UUID `json:"wallet_id"`
	CustomerID uuid.UUID `json:"customer_id"`
	Currency   string    `json:"currency"`
	FromStatus string    `json:"from_status"`
	ToStatus   string    `json:"to_status"`
}

func NewEventEnvelope(eventType string, aggregateID uuid.UUID, data interface{}) (*EventEnvelope, error) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &EventEnvelope{
		EventID:       uuid.New(),
		EventType:     eventType,
		EventVersion:  1,
		AggregateID:   aggregateID,
		OccurredAt:    time.Now().UTC(),
		CorrelationID: uuid.New(),
		Data:          dataBytes,
	}, nil
}
