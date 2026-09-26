package infra

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// ConnectRedis initializes a Redis client and verifies connectivity with a ping.
func ConnectRedis(ctx context.Context, host, port, password string, db int) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: password,
		DB:       db,
	})

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := rdb.Ping(pingCtx).Err(); err != nil {
		_ = rdb.Close()
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return rdb, nil
}
