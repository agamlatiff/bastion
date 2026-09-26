package event

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
)

const walletConsumerName = "customer-wallet-consumer"

// WalletEventConsumer listens to bastion.wallet.events and records idempotency records.
type WalletEventConsumer struct {
	reader             *kafka.Reader
	processedEventRepo domain.ProcessedEventRepository
}

// NewWalletEventConsumer instantiates a WalletEventConsumer.
func NewWalletEventConsumer(brokers []string, topic, groupID string, repo domain.ProcessedEventRepository) *WalletEventConsumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		Topic:          topic,
		GroupID:        groupID,
		MinBytes:       10e3,
		MaxBytes:       10e6,
		CommitInterval: 0,
	})

	return &WalletEventConsumer{
		reader:             reader,
		processedEventRepo: repo,
	}
}

// Start begins processing wallet events in a loop until context is canceled.
func (c *WalletEventConsumer) Start(ctx context.Context) {
	log.Printf("[WalletConsumer] Listening for wallet events on topic %s (Group: %s)...", c.reader.Config().Topic, c.reader.Config().GroupID)

	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if errors.Is(err, context.Canceled) {
				log.Println("[WalletConsumer] Stopping event consumer gracefully...")
				return
			}
			log.Printf("[WalletConsumer] Error fetching message: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		if err := c.processMessage(ctx, msg.Value); err != nil {
			log.Printf("[WalletConsumer] Failed to process event: %v", err)
		}

		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			log.Printf("[WalletConsumer] Failed to commit message offset: %v", err)
		}
	}
}

// Close gracefully terminates the Kafka reader connection.
func (c *WalletEventConsumer) Close() error {
	return c.reader.Close()
}

func (c *WalletEventConsumer) processMessage(ctx context.Context, payload []byte) error {
	var root map[string]any
	if err := json.Unmarshal(payload, &root); err != nil {
		return err
	}

	eventIdStr, _ := root["event_id"].(string)
	if eventIdStr == "" {
		eventIdStr, _ = root["eventId"].(string)
	}

	if eventIdStr == "" {
		return errors.New("missing event_id in wallet message")
	}

	eventID, err := uuid.Parse(eventIdStr)
	if err != nil {
		return err
	}

	// Idempotency check
	isProcessed, err := c.processedEventRepo.IsEventProcessed(ctx, walletConsumerName, eventID)
	if err != nil {
		return err
	}
	if isProcessed {
		log.Printf("[WalletConsumer] Duplicate event detected for eventId: %s, skipping side effect", eventID)
		return nil
	}

	eventType, _ := root["event_type"].(string)
	log.Printf("[WalletConsumer] Processing domain event [%s] with ID [%s]", eventType, eventID)

	return c.processedEventRepo.MarkEventProcessed(ctx, walletConsumerName, eventID)
}
