package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const (
	profileCachePrefix = "customer:profile:"
	profileCacheTTL    = 30 * time.Minute
)

// CustomerService orchestrates customer profile use cases and Redis cache-aside operations.
type CustomerService struct {
	customerRepo domain.CustomerRepository
	rdb          *redis.Client
}

// NewCustomerService instantiates a new CustomerService.
func NewCustomerService(repo domain.CustomerRepository, rdb *redis.Client) *CustomerService {
	return &CustomerService{
		customerRepo: repo,
		rdb:          rdb,
	}
}

// GetProfile retrieves the customer profile by identity user ID with Redis cache-aside.
func (s *CustomerService) GetProfile(ctx context.Context, identityUserID uuid.UUID) (*domain.CustomerResponse, error) {
	cacheKey := fmt.Sprintf("%s%s", profileCachePrefix, identityUserID.String())

	// 1. Check Redis Cache
	if s.rdb != nil {
		cachedData, err := s.rdb.Get(ctx, cacheKey).Bytes()
		if err == nil {
			var resp domain.CustomerResponse
			if jsonErr := json.Unmarshal(cachedData, &resp); jsonErr == nil {
				return &resp, nil
			}
		}
	}

	// 2. Query Database on Cache Miss
	customer, err := s.customerRepo.FindByIdentityUserID(ctx, identityUserID)
	if err != nil {
		return nil, err
	}

	resp := customer.ToResponse()

	// 3. Populate Redis Cache
	if s.rdb != nil {
		if encoded, err := json.Marshal(resp); err == nil {
			_ = s.rdb.Set(ctx, cacheKey, encoded, profileCacheTTL).Err()
		}
	}

	return &resp, nil
}

// UpdateProfile updates customer details and invalidates the cached profile in Redis.
func (s *CustomerService) UpdateProfile(ctx context.Context, identityUserID uuid.UUID, req domain.UpdateCustomerRequest) (*domain.CustomerResponse, error) {
	customer, err := s.customerRepo.FindByIdentityUserID(ctx, identityUserID)
	if err != nil {
		return nil, err
	}

	if req.FullName != nil {
		trimmed := strings.TrimSpace(*req.FullName)
		customer.FullName = &trimmed
	}
	if req.PhoneNumber != nil {
		trimmed := strings.TrimSpace(*req.PhoneNumber)
		customer.PhoneNumber = &trimmed
	}

	if err := s.customerRepo.Update(ctx, customer); err != nil {
		return nil, err
	}

	// Invalidate Redis cache
	if s.rdb != nil {
		cacheKey := fmt.Sprintf("%s%s", profileCachePrefix, identityUserID.String())
		_ = s.rdb.Del(ctx, cacheKey).Err()
	}

	log.Printf("[CustomerService] Profile updated for identityUserId: %s", identityUserID)
	resp := customer.ToResponse()
	return &resp, nil
}

// CreateCustomer creates a customer profile idempotently upon receiving UserRegistered event.
func (s *CustomerService) CreateCustomer(ctx context.Context, identityUserID uuid.UUID, email string, fullName *string) (*domain.Customer, error) {
	exists, err := s.customerRepo.ExistsByIdentityUserID(ctx, identityUserID)
	if err != nil {
		return nil, err
	}
	if exists {
		log.Printf("[CustomerService] Customer already exists for identityUserId: %s, skipping creation", identityUserID)
		return s.customerRepo.FindByIdentityUserID(ctx, identityUserID)
	}

	var trimmedName *string
	if fullName != nil {
		t := strings.TrimSpace(*fullName)
		if t != "" {
			trimmedName = &t
		}
	}

	newCustomer := &domain.Customer{
		ID:             uuid.New(),
		IdentityUserID: identityUserID,
		Email:          strings.TrimSpace(email),
		FullName:       trimmedName,
		Status:         "ACTIVE",
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}

	if err := s.customerRepo.Create(ctx, newCustomer); err != nil {
		return nil, err
	}

	log.Printf("[CustomerService] New customer created successfully with ID: %s for identityUserId: %s", newCustomer.ID, identityUserID)
	return newCustomer, nil
}
