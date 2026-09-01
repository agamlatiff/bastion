package repository

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// TokenBlacklistRepository defines the interface for persisting and querying revoked JWT tokens.
type TokenBlacklistRepository interface {
	Revoke(ctx context.Context, jti string, ttl time.Duration) error
	IsRevoked(ctx context.Context, jti string) (bool, error)
}

type redisTokenBlacklistRepo struct {
	rdb *redis.Client
}

// NewTokenBlacklistRepository creates a new TokenBlacklistRepository backed by Redis.
func NewTokenBlacklistRepository(rdb *redis.Client) TokenBlacklistRepository {
	return &redisTokenBlacklistRepo{rdb: rdb}
}

// Revoke stores a token's JTI in Redis with an expiration duration matching the token's remaining lifetime.
func (r *redisTokenBlacklistRepo) Revoke(ctx context.Context, jti string, ttl time.Duration) error {
	key := "blacklist:jti:" + jti
	return r.rdb.Set(ctx, key, "revoked", ttl).Err()
}

// IsRevoked checks whether a token's JTI is present in the Redis blacklist.
func (r *redisTokenBlacklistRepo) IsRevoked(ctx context.Context, jti string) (bool, error) {
	key := "blacklist:jti:" + jti
	val, err := r.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return val == "revoked", nil
}
