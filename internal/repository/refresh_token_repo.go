package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RefreshTokenRepository defines the contract for storing, validating, and rotating refresh tokens in Redis.
type RefreshTokenRepository interface {
	Store(ctx context.Context, userID, tokenID string, ttl time.Duration) error
	IsActive(ctx context.Context, userID, tokenID string) (bool, error)
	Revoke(ctx context.Context, userID, tokenID string) error
	RevokeAllForUser(ctx context.Context, userID string) error
}

type redisRefreshTokenRepo struct {
	rdb *redis.Client
}

// NewRefreshTokenRepository creates a new Redis-backed RefreshTokenRepository instance.
func NewRefreshTokenRepository(rdb *redis.Client) RefreshTokenRepository {
	return &redisRefreshTokenRepo{rdb: rdb}
}

func (r *redisRefreshTokenRepo) formatKey(userID, tokenID string) string {
	return fmt.Sprintf("refresh_token:%s:%s", userID, tokenID)
}

func (r *redisRefreshTokenRepo) Store(ctx context.Context, userID, tokenID string, ttl time.Duration) error {
	key := r.formatKey(userID, tokenID)
	return r.rdb.Set(ctx, key, "active", ttl).Err()
}

func (r *redisRefreshTokenRepo) IsActive(ctx context.Context, userID, tokenID string) (bool, error) {
	key := r.formatKey(userID, tokenID)
	val, err := r.rdb.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return val > 0, nil
}

func (r *redisRefreshTokenRepo) Revoke(ctx context.Context, userID, tokenID string) error {
	key := r.formatKey(userID, tokenID)
	return r.rdb.Del(ctx, key).Err()
}

func (r *redisRefreshTokenRepo) RevokeAllForUser(ctx context.Context, userID string) error {
	pattern := fmt.Sprintf("refresh_token:%s:*", userID)
	iter := r.rdb.Scan(ctx, 0, pattern, 0).Iterator()

	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return err
	}

	if len(keys) > 0 {
		return r.rdb.Del(ctx, keys...).Err()
	}
	return nil
}
