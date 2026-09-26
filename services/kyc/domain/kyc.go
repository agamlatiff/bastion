package domain

import (
	"time"

	"github.com/google/uuid"
)

// KYCStatus represents the verification lifecycle state.
type KYCStatus string

const (
	KYCStatusPending  KYCStatus = "pending"
	KYCStatusApproved KYCStatus = "approved"
	KYCStatusRejected KYCStatus = "rejected"
)

// KYCVerification represents a user's identity verification application.
type KYCVerification struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	IDCardNumber    string     `json:"id_card_number"`
	IDCardHash      string     `json:"-"`
	IDCardImageURL  string     `json:"id_card_image_url"`
	SelfieImageURL  string     `json:"selfie_image_url"`
	Status          KYCStatus  `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	SubmittedAt     time.Time  `json:"submitted_at"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty"`
}

// OutboxStatus represents the status of an event to be published to Kafka.
type OutboxStatus string

const (
	OutboxStatusPending   OutboxStatus = "PENDING"
	OutboxStatusPublished OutboxStatus = "PUBLISHED"
	OutboxStatusFailed    OutboxStatus = "FAILED"
)

// OutboxEvent models a domain event waiting for reliable Kafka dispatch.
type OutboxEvent struct {
	ID            uuid.UUID    `json:"id"`
	AggregateType string       `json:"aggregate_type"`
	AggregateID   uuid.UUID    `json:"aggregate_id"`
	EventType     string       `json:"event_type"`
	Payload       []byte       `json:"payload"`
	Status        OutboxStatus `json:"status"`
	RetryCount    int          `json:"retry_count"`
	CreatedAt     time.Time    `json:"created_at"`
	PublishedAt   *time.Time   `json:"published_at,omitempty"`
}
