package repository

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// Locker defines the interface for acquiring and releasing distributed locks.
type Locker interface {
	AcquireLock(ctx context.Context, key string, ttl time.Duration) (bool, error)
	ReleaseLock(ctx context.Context, key string) error
}

type redisLocker struct {
	rdb *redis.Client
}

// NewRedisLocker creates a new Locker instance backed by Redis SETNX distributed locking.
func NewRedisLocker(rdb *redis.Client) Locker {
	return &redisLocker{rdb: rdb}
}

// AcquireLock attempts to set a distributed lock key atomically using SETNX with a TTL.
func (l *redisLocker) AcquireLock(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	return l.rdb.SetNX(ctx, key, "locked", ttl).Result()
}

// ReleaseLock deletes the distributed lock key from Redis.
func (l *redisLocker) ReleaseLock(ctx context.Context, key string) error {
	return l.rdb.Del(ctx, key).Err()
}
