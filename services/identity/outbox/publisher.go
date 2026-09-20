package outbox

import (
	"context"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/segmentio/kafka-go"
)

// OutboxPublisher polls pending outbox events from identity_db and writes them to Kafka.
type OutboxPublisher struct {
	repo   repository.Repository
	writer *kafka.Writer
	stopCh chan struct{}
}

// NewOutboxPublisher initializes a new transactional outbox publisher worker.
func NewOutboxPublisher(repo repository.Repository, brokers []string, topic string) *OutboxPublisher {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireAll, // Strongest consistency: wait for full ISR ACK
		Async:        false,
	}

	return &OutboxPublisher{
		repo:   repo,
		writer: writer,
		stopCh: make(chan struct{}),
	}
}

// Start begins the event polling loop until the context is canceled or Stop() is called.
func (p *OutboxPublisher) Start(ctx context.Context) {
	log.Println("[IDENTITY OUTBOX] Background worker started")
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[IDENTITY OUTBOX] Stopping background worker...")
			_ = p.writer.Close()
			return
		case <-p.stopCh:
			log.Println("[IDENTITY OUTBOX] Stopping background worker...")
			_ = p.writer.Close()
			return
		case <-ticker.C:
			p.processPendingEvents(ctx)
		}
	}
}

// Stop signals the polling worker to stop gracefully.
func (p *OutboxPublisher) Stop() {
	close(p.stopCh)
}

func (p *OutboxPublisher) processPendingEvents(ctx context.Context) {
	pollCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	events, err := p.repo.GetPendingOutboxEvents(pollCtx, 20)
	if err != nil {
		log.Printf("[IDENTITY OUTBOX] Failed to fetch pending events: %v", err)
		return
	}

	for _, event := range events {
		msg := kafka.Message{
			Key:   []byte(event.AggregateID.String()),
			Value: event.Payload,
			Time:  time.Now().UTC(),
			Headers: []kafka.Header{
				{Key: "event_type", Value: []byte(event.EventType)},
				{Key: "aggregate_type", Value: []byte(event.AggregateType)},
			},
		}

		// Synchronous publish to wait for broker ACK
		if err := p.writer.WriteMessages(pollCtx, msg); err != nil {
			log.Printf("[IDENTITY OUTBOX] Failed to publish event %s to Kafka: %v", event.ID, err)
			_ = p.repo.MarkOutboxEventFailed(pollCtx, event.ID, 5)
			continue
		}

		// Only mark published after Kafka ACK received
		if err := p.repo.MarkOutboxEventPublished(pollCtx, event.ID); err != nil {
			log.Printf("[IDENTITY OUTBOX] Failed to mark event %s as published: %v", event.ID, err)
		} else {
			log.Printf("[IDENTITY OUTBOX] Successfully published %s event [%s] to Kafka topic %s", event.EventType, event.AggregateID, p.writer.Topic)
		}
	}
}
