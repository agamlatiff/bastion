package domain

import (
	"time"

	"github.com/google/uuid"
)

// Customer represents the profile entity of a business user.
type Customer struct {
	ID             uuid.UUID `json:"id"`
	IdentityUserID uuid.UUID `json:"identity_user_id"`
	Email          string    `json:"email"`
	FullName       *string   `json:"full_name"`
	PhoneNumber    *string   `json:"phone_number"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// CustomerMetadata stores key-value operational attributes associated with a customer.
type CustomerMetadata struct {
	ID         uuid.UUID `json:"id"`
	CustomerID uuid.UUID `json:"customer_id"`
	Key        string    `json:"key"`
	Value      string    `json:"value"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ProcessedEvent tracks consumed Kafka events to guarantee idempotency.
type ProcessedEvent struct {
	ConsumerName string    `json:"consumer_name"`
	EventID      uuid.UUID `json:"event_id"`
	ProcessedAt  time.Time `json:"processed_at"`
}
