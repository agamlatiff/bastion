package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

const (
	// HeaderIdempotencyKey is the standard HTTP header for idempotency control
	HeaderIdempotencyKey = "Idempotency-Key"

	// ProcessingSentinel indicates an operation is actively running
	ProcessingSentinel = "PROCESSING"

	// DefaultSuccessRetention is how long successful idempotent responses are preserved
	DefaultSuccessRetention = 24 * time.Hour
)

type idempotentCachedResponse struct {
	StatusCode int    `json:"status_code"`
	Body       string `json:"body"`
}

type responseRecorder struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

func (r *responseRecorder) WriteString(s string) (int, error) {
	r.body.WriteString(s)
	return r.ResponseWriter.WriteString(s)
}

// IdempotencyMiddleware ensures that mutation endpoints are protected against concurrent double-execution
// and safely replays previous responses when the same Idempotency-Key is provided.
func IdempotencyMiddleware(rdb *redis.Client, lockTTL time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only enforce on mutation methods
		if c.Request.Method != http.MethodPost && c.Request.Method != http.MethodPatch && c.Request.Method != http.MethodPut {
			c.Next()
			return
		}

		if rdb == nil {
			c.Next()
			return
		}

		idempotencyKey := strings.TrimSpace(c.GetHeader(HeaderIdempotencyKey))
		if idempotencyKey == "" {
			// Require Idempotency-Key header for mutations
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error":   "Bad Request",
				"message": "Missing required Idempotency-Key header for this operation",
			})
			return
		}

		if len(idempotencyKey) > 128 {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error":   "Bad Request",
				"message": "Idempotency-Key exceeds maximum allowed length of 128 characters",
			})
			return
		}

		redisKey := "idempotency:" + idempotencyKey

		// Attempt to acquire distributed lock atomically (SET NX EX)
		acquired, err := rdb.SetArgs(c.Request.Context(), redisKey, ProcessingSentinel, redis.SetArgs{
			Mode: "NX",
			TTL:  lockTTL,
		}).Result()

		if err != nil && err != redis.Nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error":   "Internal Server Error",
				"message": "Failed to verify idempotency lock",
			})
			return
		}

		if acquired != "OK" {
			// Key exists: check status
			val, getErr := rdb.Get(c.Request.Context(), redisKey).Result()
			if getErr == nil {
				if val == ProcessingSentinel {
					// In-flight concurrent request detected!
					c.AbortWithStatusJSON(http.StatusConflict, gin.H{
						"error":   "Conflict",
						"message": "A transaction with this Idempotency-Key is currently being processed",
					})
					return
				}

				// Key contains cached response -> replay
				var cached idempotentCachedResponse
				if jsonErr := json.Unmarshal([]byte(val), &cached); jsonErr == nil {
					c.Header("X-Idempotent-Replay", "true")
					c.Header("Content-Type", "application/json; charset=utf-8")
					c.String(cached.StatusCode, cached.Body)
					c.Abort()
					return
				}
			}

			c.AbortWithStatusJSON(http.StatusConflict, gin.H{
				"error":   "Conflict",
				"message": "Duplicate request detected for this Idempotency-Key",
			})
			return
		}

		// Lock acquired. Intercept response to cache on success.
		recorder := &responseRecorder{
			ResponseWriter: c.Writer,
			body:           bytes.NewBuffer(nil),
		}
		c.Writer = recorder

		c.Next()

		statusCode := c.Writer.Status()
		if statusCode >= 200 && statusCode < 300 {
			// Success: cache response for idempotent replay
			payload, _ := json.Marshal(idempotentCachedResponse{
				StatusCode: statusCode,
				Body:       recorder.body.String(),
			})
			_ = rdb.Set(c.Request.Context(), redisKey, payload, DefaultSuccessRetention).Err()
		} else {
			// Failed execution: release lock so client can retry
			_ = rdb.Del(c.Request.Context(), redisKey).Err()
		}
	}
}
