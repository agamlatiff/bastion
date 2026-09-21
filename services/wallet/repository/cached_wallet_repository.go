package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/agamlatiff/bastion/services/wallet/domain"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const (
	walletCacheTTL  = 5 * time.Minute
	walletKeyPrefix = "wallet:"
)

// cachedWalletRepository is a decorator for WalletRepository adding cache-aside capabilities.
type cachedWalletRepository struct {
	next WalletRepository
	rdb  *redis.Client
}

// NewCachedWalletRepository wraps a WalletRepository with Redis-backed caching.
func NewCachedWalletRepository(next WalletRepository, rdb *redis.Client) WalletRepository {
	return &cachedWalletRepository{
		next: next,
		rdb:  rdb,
	}
}

// GetByID checks cache first. On miss, queries underlying repository and populates cache with TTL.
func (c *cachedWalletRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Wallet, error) {
	if c.rdb != nil {
		cacheKey := walletKeyPrefix + id.String()
		cachedData, err := c.rdb.Get(ctx, cacheKey).Bytes()
		if err == nil {
			var w domain.Wallet
			if jsonErr := json.Unmarshal(cachedData, &w); jsonErr == nil {
				return &w, nil
			}
		}
	}

	wallet, err := c.next.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if c.rdb != nil && wallet != nil {
		cacheKey := walletKeyPrefix + id.String()
		if bytes, jsonErr := json.Marshal(wallet); jsonErr == nil {
			_ = c.rdb.Set(ctx, cacheKey, bytes, walletCacheTTL).Err()
		}
	}

	return wallet, nil
}

// UpdateStatus delegates to underlying repository, then invalidates cache on success.
func (c *cachedWalletRepository) UpdateStatus(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus) error {
	err := c.next.UpdateStatus(ctx, id, fromStatus, toStatus)
	if err == nil && c.rdb != nil {
		_ = c.rdb.Del(ctx, walletKeyPrefix+id.String()).Err()
	}
	return err
}

// UpdateStatusWithOutbox delegates to underlying repository, then invalidates cache on success.
func (c *cachedWalletRepository) UpdateStatusWithOutbox(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus, event *domain.EventEnvelope) error {
	err := c.next.UpdateStatusWithOutbox(ctx, id, fromStatus, toStatus, event)
	if err == nil && c.rdb != nil {
		_ = c.rdb.Del(ctx, walletKeyPrefix+id.String()).Err()
	}
	return err
}

// Create delegates directly to underlying repository.
func (c *cachedWalletRepository) Create(ctx context.Context, wallet *domain.Wallet) error {
	return c.next.Create(ctx, wallet)
}

// GetByCustomerID delegates directly to underlying repository.
func (c *cachedWalletRepository) GetByCustomerID(ctx context.Context, customerID uuid.UUID) ([]*domain.Wallet, error) {
	return c.next.GetByCustomerID(ctx, customerID)
}

// GetActiveByCustomerAndCurrency delegates directly to underlying repository.
func (c *cachedWalletRepository) GetActiveByCustomerAndCurrency(ctx context.Context, customerID uuid.UUID, currency string) (*domain.Wallet, error) {
	return c.next.GetActiveByCustomerAndCurrency(ctx, customerID, currency)
}

// CreateSnapshot delegates directly to underlying repository.
func (c *cachedWalletRepository) CreateSnapshot(ctx context.Context, walletID uuid.UUID, balance int64) error {
	return c.next.CreateSnapshot(ctx, walletID, balance)
}

// SaveOutboxEvent delegates directly to underlying repository.
func (c *cachedWalletRepository) SaveOutboxEvent(ctx context.Context, event *domain.EventEnvelope) error {
	return c.next.SaveOutboxEvent(ctx, event)
}

// GetPendingOutboxEvents delegates directly to underlying repository.
func (c *cachedWalletRepository) GetPendingOutboxEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	return c.next.GetPendingOutboxEvents(ctx, limit)
}

// MarkOutboxEventPublished delegates directly to underlying repository.
func (c *cachedWalletRepository) MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error {
	return c.next.MarkOutboxEventPublished(ctx, id)
}
