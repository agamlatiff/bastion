package service_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/event"
	"github.com/agamlatiff/bastion/services/identity/service"
	"github.com/google/uuid"
)

type mockRepository struct {
	domain.Repository
	createdUser  *domain.User
	createdEvent *domain.OutboxEvent
	createUserFn func(ctx context.Context, user *domain.User, event *domain.OutboxEvent) error
}

func (m *mockRepository) CreateUser(ctx context.Context, user *domain.User, event *domain.OutboxEvent) error {
	m.createdUser = user
	m.createdEvent = event
	if m.createUserFn != nil {
		return m.createUserFn(ctx, user, event)
	}
	return nil
}

func (m *mockRepository) LogSecurityAudit(ctx context.Context, userID *uuid.UUID, action, requestID, ip string) {
}

func TestRegister_PersistsOutboxEvent(t *testing.T) {
	mockRepo := &mockRepository{}
	authCfg := service.AuthConfig{
		JWTSecret: "test-secret-32-bytes-long-key-!",
	}

	svc := service.NewAuthService(mockRepo, authCfg)

	req := domain.RegisterRequest{
		Email:    "Alice@Example.com",
		Password: "SecurePassword123!",
	}

	resp, err := svc.Register(context.Background(), req, "req-123", "127.0.0.1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp == nil {
		t.Fatal("expected non-nil response")
	}

	if mockRepo.createdUser == nil {
		t.Fatal("expected user to be persisted")
	}
	if mockRepo.createdUser.Email != "alice@example.com" {
		t.Errorf("expected normalized email alice@example.com, got %s", mockRepo.createdUser.Email)
	}

	if mockRepo.createdEvent == nil {
		t.Fatal("expected outbox event to be created and passed to repository")
	}

	evt := mockRepo.createdEvent
	if evt.AggregateType != "USER" {
		t.Errorf("expected aggregate type USER, got %s", evt.AggregateType)
	}
	if evt.AggregateID != mockRepo.createdUser.ID {
		t.Errorf("expected aggregate ID to match user ID %s, got %s", mockRepo.createdUser.ID, evt.AggregateID)
	}
	if evt.EventType != "UserRegistered" {
		t.Errorf("expected event type UserRegistered, got %s", evt.EventType)
	}
	if evt.Status != domain.OutboxStatusPending {
		t.Errorf("expected status PENDING, got %s", evt.Status)
	}

	var envelope event.EventEnvelope
	if err := json.Unmarshal(evt.Payload, &envelope); err != nil {
		t.Fatalf("failed to unmarshal outbox payload: %v", err)
	}

	if envelope.EventType != "UserRegistered" {
		t.Errorf("expected envelope event type UserRegistered, got %s", envelope.EventType)
	}
	if envelope.CorrelationID != "req-123" {
		t.Errorf("expected correlation ID req-123, got %s", envelope.CorrelationID)
	}
	if envelope.Data.UserID != mockRepo.createdUser.ID.String() {
		t.Errorf("expected envelope data user_id %s, got %s", mockRepo.createdUser.ID.String(), envelope.Data.UserID)
	}
	if envelope.Data.Email != "alice@example.com" {
		t.Errorf("expected envelope data email alice@example.com, got %s", envelope.Data.Email)
	}
	if envelope.Data.Role != "CUSTOMER" {
		t.Errorf("expected envelope data role CUSTOMER, got %s", envelope.Data.Role)
	}
}
