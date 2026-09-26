package outbox

import (
	"context"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/transaction/domain"
	"github.com/segmentio/kafka-go"
)

// Publisher polls the outbox_events table and reliably publishes transaction events to Kafka.
type Publisher struct {
	repo   domain.OutboxRepository
	writer *kafka.Writer
	stopCh chan struct{}
}

// NewPublisher constructs an outbox worker for transactions.
func NewPublisher(repo domain.OutboxRepository, brokers []string, topic string) *Publisher {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		RequiredAcks: kafka.RequireAll,
		Async:        false,
	}

	return &Publisher{
		repo:   repo,
		writer: writer,
		stopCh: make(chan struct{}),
	}
}

// Start runs the periodic outbox polling loop in a blocking manner.
func (p *Publisher) Start(ctx context.Context) {
	log.Println("[Transaction Outbox] Background worker started")
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Transaction Outbox] Stopping background worker...")
			_ = p.writer.Close()
			return
		case <-p.stopCh:
			log.Println("[Transaction Outbox] Stopping background worker...")
			_ = p.writer.Close()
			return
		case <-ticker.C:
			p.processPendingEvents(ctx)
		}
	}
}

// Stop signals the worker to terminate.
func (p *Publisher) Stop() {
	close(p.stopCh)
}

func (p *Publisher) processPendingEvents(ctx context.Context) {
	pollCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	events, err := p.repo.GetPendingEvents(pollCtx, 20)
	if err != nil {
		log.Printf("[Transaction Outbox] Failed to fetch pending events: %v", err)
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

		if err := p.writer.WriteMessages(pollCtx, msg); err != nil {
			log.Printf("[Transaction Outbox] Failed to publish event %s to Kafka: %v", event.ID, err)
			continue
		}

		if err := p.repo.MarkEventPublished(pollCtx, event.ID); err != nil {
			log.Printf("[Transaction Outbox] Failed to mark event %s as published: %v", event.ID, err)
		} else {
			log.Printf("[Transaction Outbox] Successfully published %s event [%s] to topic %s", event.EventType, event.AggregateID, p.writer.Topic)
		}
	}
}
