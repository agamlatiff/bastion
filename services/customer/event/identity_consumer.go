package event

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/agamlatiff/bastion/services/customer/service"
	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
)

// IdentityEventConsumer listens to bastion.identity.events and creates customer profiles upon UserRegistered.
type IdentityEventConsumer struct {
	reader          *kafka.Reader
	customerService *service.CustomerService
}

// NewIdentityEventConsumer instantiates an IdentityEventConsumer.
func NewIdentityEventConsumer(brokers []string, topic, groupID string, svc *service.CustomerService) *IdentityEventConsumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		Topic:          topic,
		GroupID:        groupID,
		MinBytes:       10e3, // 10KB
		MaxBytes:       10e6, // 10MB
		CommitInterval: 0,    // Manual commit
	})

	return &IdentityEventConsumer{
		reader:          reader,
		customerService: svc,
	}
}

// Start begins processing events in a blocking loop until context is canceled.
func (c *IdentityEventConsumer) Start(ctx context.Context) {
	log.Printf("[IdentityConsumer] Listening for identity events on topic %s (Group: %s)...", c.reader.Config().Topic, c.reader.Config().GroupID)

	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if errors.Is(err, context.Canceled) {
				log.Println("[IdentityConsumer] Stopping event consumer gracefully...")
				return
			}
			log.Printf("[IdentityConsumer] Error fetching message: %v", err)
			time.Sleep(1 * time.Second)
			continue
		}

		if err := c.processMessage(ctx, msg.Value); err != nil {
			log.Printf("[IdentityConsumer] Failed to process event: %v", err)
			// Proceed to commit or retry depending on policy; we continue to avoid poisoning queue on unparsable messages
		}

		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			log.Printf("[IdentityConsumer] Failed to commit message offset: %v", err)
		}
	}
}

// Close gracefully terminates the Kafka reader connection.
func (c *IdentityEventConsumer) Close() error {
	return c.reader.Close()
}

func (c *IdentityEventConsumer) processMessage(ctx context.Context, payload []byte) error {
	var root map[string]any
	if err := json.Unmarshal(payload, &root); err != nil {
		return err
	}

	eventType, _ := root["event_type"].(string)
	if eventType == "" {
		eventType, _ = root["eventType"].(string)
	}

	if !strings.EqualFold(eventType, "UserRegistered") {
		return nil
	}

	data, ok := root["data"].(map[string]any)
	if !ok {
		return errors.New("event payload missing 'data' object")
	}

	userIdStr, _ := data["user_id"].(string)
	if userIdStr == "" {
		userIdStr, _ = data["userId"].(string)
	}

	identityUserID, err := uuid.Parse(userIdStr)
	if err != nil {
		return err
	}

	email, _ := data["email"].(string)

	var fullName *string
	if fn, ok := data["full_name"].(string); ok && fn != "" {
		fullName = &fn
	} else if fn, ok := data["fullName"].(string); ok && fn != "" {
		fullName = &fn
	}

	_, err = c.customerService.CreateCustomer(ctx, identityUserID, email, fullName)
	return err
}
