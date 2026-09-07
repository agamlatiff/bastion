package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// Redis Lua script for atomic increment and conditional expiry
var rateLimitScript = redis.NewScript(`
	local current = redis.call("INCR", KEYS[1])
	if current == 1 then
		redis.call("EXPIRE", KEYS[1], ARGV[1])
	end
	return current
`)

// RateLimit creates a Gin middleware that limits requests per client IP using Redis.
func RateLimit(rdb *redis.Client, action string, maxRequests int64, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		key := fmt.Sprintf("ratelimit:%s:%s", action, ip)
		windowSeconds := int(window.Seconds())

		// Execute atomic Lua script
		result, err := rateLimitScript.Run(c.Request.Context(), rdb, []string{key}, windowSeconds).Int64()
		if err != nil {
			// Fail-open principle: if Redis is temporarily unreachable, do not block legitimate user requests
			c.Next()
			return
		}

		remaining := maxRequests - result
		if remaining < 0 {
			remaining = 0
		}

		// Standard rate limit HTTP response headers
		c.Header("X-RateLimit-Limit", strconv.FormatInt(maxRequests, 10))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))

		// If threshold exceeded, abort with 429 Too Many Requests
		if result > maxRequests {
			c.Header("Retry-After", strconv.Itoa(windowSeconds))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Too many requests",
				"message":     fmt.Sprintf("Rate limit exceeded for %s. Please try again later.", action),
				"retry_after": windowSeconds,
			})
			return
		}

		c.Next()
	}
}
