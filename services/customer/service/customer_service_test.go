package service

import (
	"context"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/google/uuid"
)

// In-memory mock repository
type mockCustomerRepo struct {
	customers map[uuid.UUID]*domain.Customer
}

func newMockCustomerRepo() *mockCustomerRepo {
	return &mockCustomerRepo{
		customers: make(map[uuid.UUID]*domain.Customer),
	}
}

func (m *mockCustomerRepo) FindByIdentityUserID(ctx context.Context, identityUserID uuid.UUID) (*domain.Customer, error) {
	c, ok := m.customers[identityUserID]
	if !ok {
		return nil, domain.ErrCustomerNotFound
	}
	return c, nil
}

func (m *mockCustomerRepo) ExistsByIdentityUserID(ctx context.Context, identityUserID uuid.UUID) (bool, error) {
	_, ok := m.customers[identityUserID]
	return ok, nil
}

func (m *mockCustomerRepo) Create(ctx context.Context, customer *domain.Customer) error {
	m.customers[customer.IdentityUserID] = customer
	return nil
}

func (m *mockCustomerRepo) Update(ctx context.Context, customer *domain.Customer) error {
	m.customers[customer.IdentityUserID] = customer
	return nil
}

func TestCustomerService_GetProfile(t *testing.T) {
	repo := newMockCustomerRepo()
	svc := NewCustomerService(repo, nil) // Nil redis for unit test
	ctx := context.Background()

	identityUserID := uuid.New()
	fullName := "John Doe"
	phone := "+628123456789"
	customer := &domain.Customer{
		ID:             uuid.New(),
		IdentityUserID: identityUserID,
		Email:          "john@example.com",
		FullName:       &fullName,
		PhoneNumber:    &phone,
		Status:         "ACTIVE",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	_ = repo.Create(ctx, customer)

	// Fetch existing profile
	resp, err := svc.GetProfile(ctx, identityUserID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp.Email != "john@example.com" || *resp.FullName != fullName {
		t.Fatalf("unexpected profile data: %+v", resp)
	}

	// Fetch non-existent profile
	_, err = svc.GetProfile(ctx, uuid.New())
	if err != domain.ErrCustomerNotFound {
		t.Fatalf("expected ErrCustomerNotFound, got %v", err)
	}
}

func TestCustomerService_UpdateProfile(t *testing.T) {
	repo := newMockCustomerRepo()
	svc := NewCustomerService(repo, nil)
	ctx := context.Background()

	identityUserID := uuid.New()
	initialName := "Old Name"
	customer := &domain.Customer{
		ID:             uuid.New(),
		IdentityUserID: identityUserID,
		Email:          "user@example.com",
		FullName:       &initialName,
		Status:         "ACTIVE",
	}
	_ = repo.Create(ctx, customer)

	newName := "New Name"
	newPhone := "+6289999999"
	req := domain.UpdateCustomerRequest{
		FullName:    &newName,
		PhoneNumber: &newPhone,
	}

	resp, err := svc.UpdateProfile(ctx, identityUserID, req)
	if err != nil {
		t.Fatalf("expected no error updating profile, got %v", err)
	}
	if *resp.FullName != "New Name" || *resp.PhoneNumber != "+6289999999" {
		t.Fatalf("expected updated attributes, got %+v", resp)
	}
}

func TestCustomerService_CreateCustomer_Idempotency(t *testing.T) {
	repo := newMockCustomerRepo()
	svc := NewCustomerService(repo, nil)
	ctx := context.Background()

	identityUserID := uuid.New()
	email := "alex@example.com"
	fullName := "Alex River"

	// 1. First creation
	c1, err := svc.CreateCustomer(ctx, identityUserID, email, &fullName)
	if err != nil {
		t.Fatalf("expected successful creation, got %v", err)
	}
	if c1.Email != email {
		t.Fatalf("expected email %s, got %s", email, c1.Email)
	}

	// 2. Duplicate creation (Idempotent: should return existing without error)
	c2, err := svc.CreateCustomer(ctx, identityUserID, email, &fullName)
	if err != nil {
		t.Fatalf("expected idempotent success on duplicate, got %v", err)
	}
	if c1.ID != c2.ID {
		t.Fatalf("expected same customer ID on duplicate creation, got %s vs %s", c1.ID, c2.ID)
	}
}
