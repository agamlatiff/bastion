package event

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
)

// EventEnvelope represents the standard envelope for all domain events.
type EventEnvelope struct {
	EventID       string      `json:"event_id"`
	EventType     string      `json:"event_type"`
	EventVersion  string      `json:"event_version"`
	CorrelationID string      `json:"correlation_id"`
	Timestamp     time.Time   `json:"timestamp"`
	Data          interface{} `json:"data"`
}

// UserRegisteredPayload holds the domain data for UserRegistered events.
type UserRegisteredPayload struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

// EventProducer defines operations for producing domain events.
type EventProducer interface {
	PublishUserRegistered(ctx context.Context, userID, email, role, status, correlationID string) error
	Close() error
}

type kafkaProducer struct {
	writer *kafka.Writer
}

// NewKafkaProducer creates a new EventProducer targeting the given broker address and topic.
func NewKafkaProducer(brokerAddr, topic string) EventProducer {
	w := &kafka.Writer{
		Addr:         kafka.TCP(brokerAddr),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		WriteTimeout: 5 * time.Second,
		ReadTimeout:  5 * time.Second,
	}
	return &kafkaProducer{writer: w}
}

func (p *kafkaProducer) PublishUserRegistered(ctx context.Context, userID, email, role, status, correlationID string) error {
	envelope := EventEnvelope{
		EventID:       uuid.New().String(),
		EventType:     "UserRegistered",
		EventVersion:  "1.0",
		CorrelationID: correlationID,
		Timestamp:     time.Now().UTC(),
		Data: UserRegisteredPayload{
			UserID: userID,
			Email:  email,
			Role:   role,
			Status: status,
		},
	}

	bytes, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("failed to marshal event envelope: %w", err)
	}

	// Use userID as Kafka partition key
	err = p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(userID),
		Value: bytes,
	})
	if err != nil {
		return fmt.Errorf("failed to publish UserRegistered event: %w", err)
	}

	return nil
}

func (p *kafkaProducer) Close() error {
	return p.writer.Close()
}
