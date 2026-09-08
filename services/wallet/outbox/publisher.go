package outbox

import (
	"context"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/wallet/repository"
	"github.com/segmentio/kafka-go"
)

type OutboxPublisher struct {
	repo   repository.WalletRepository
	writer *kafka.Writer
	stopCh chan struct{}
}

func NewOutboxPublisher(repo repository.WalletRepository, brokers []string, topic string) *OutboxPublisher {
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

func (p *OutboxPublisher) Start(ctx context.Context) {
	log.Println("[Outbox Publisher] Background worker started")
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Outbox Publisher] Stopping background worker...")
			_ = p.writer.Close()
			return
		case <-p.stopCh:
			log.Println("[Outbox Publisher] Stopping background worker...")
			_ = p.writer.Close()
			return
		case <-ticker.C:
			p.processPendingEvents(ctx)
		}
	}
}

func (p *OutboxPublisher) Stop() {
	close(p.stopCh)
}

func (p *OutboxPublisher) processPendingEvents(ctx context.Context) {
	pollCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	events, err := p.repo.GetPendingOutboxEvents(pollCtx, 20)
	if err != nil {
		log.Printf("[Outbox Publisher] Failed to fetch pending events: %v", err)
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

		// Publish to Kafka Broker synchronously to wait for broker ACK
		if err := p.writer.WriteMessages(pollCtx, msg); err != nil {
			log.Printf("[Outbox Publisher] Failed to publish event %s to Kafka: %v", event.ID, err)
			continue
		}

		// Only mark published after Kafka ACK received
		if err := p.repo.MarkOutboxEventPublished(pollCtx, event.ID); err != nil {
			log.Printf("[Outbox Publisher] Failed to mark event %s as published: %v", event.ID, err)
		} else {
			log.Printf("[Outbox Publisher] Successfully published %s event [%s] to Kafka topic %s", event.EventType, event.AggregateID, p.writer.Topic)
		}
	}
}
