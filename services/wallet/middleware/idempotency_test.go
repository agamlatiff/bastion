package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/wallet/middleware"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestIdempotencyMiddleware_RequiresHeaderOnPost(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	router := gin.New()
	router.POST("/test", middleware.IdempotencyMiddleware(rdb, 10*time.Second), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request when header missing, got %d", w.Code)
	}
}

func TestIdempotencyMiddleware_PassesThroughOnGet(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	router := gin.New()
	router.GET("/test", middleware.IdempotencyMiddleware(rdb, 10*time.Second), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 OK for GET without idempotency header, got %d", w.Code)
	}
}

func TestIdempotencyMiddleware_PassesThroughWhenRedisNil(t *testing.T) {
	router := gin.New()
	router.POST("/test", middleware.IdempotencyMiddleware(nil, 10*time.Second), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest(http.MethodPost, "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 OK when redis is nil, got %d", w.Code)
	}
}

func TestIdempotencyMiddleware_RejectsOverlyLongKey(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	router := gin.New()
	router.POST("/test", middleware.IdempotencyMiddleware(rdb, 10*time.Second), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest(http.MethodPost, "/test", nil)
	req.Header.Set("Idempotency-Key", strings.Repeat("a", 129))
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for key > 128 chars, got %d", w.Code)
	}
}

func TestIdempotencyMiddleware_LiveRedisExecution(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skip("Redis unavailable on localhost:6379, skipping live redis idempotency test")
	}

	execCount := 0
	router := gin.New()
	router.POST("/transact", middleware.IdempotencyMiddleware(rdb, 60*time.Second), func(c *gin.Context) {
		execCount++
		c.JSON(http.StatusOK, gin.H{"result": "transacted", "count": execCount})
	})

	idemKey := "test-idem-key-12345"
	_ = rdb.Del(context.Background(), "idempotency:"+idemKey).Err()

	// First execution -> succeeds
	req1, _ := http.NewRequest(http.MethodPost, "/transact", nil)
	req1.Header.Set("Idempotency-Key", idemKey)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("first request failed: %d body: %s", w1.Code, w1.Body.String())
	}
	if execCount != 1 {
		t.Errorf("expected handler execution count 1, got %d", execCount)
	}

	// Second execution with same key -> returns cached replay without re-running handler!
	req2, _ := http.NewRequest(http.MethodPost, "/transact", nil)
	req2.Header.Set("Idempotency-Key", idemKey)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("second request failed: %d", w2.Code)
	}
	if w2.Header().Get("X-Idempotent-Replay") != "true" {
		t.Errorf("expected X-Idempotent-Replay header, got %s", w2.Header().Get("X-Idempotent-Replay"))
	}
	if execCount != 1 {
		t.Errorf("expected handler execution count still 1 on replay, got %d", execCount)
	}

	// Test concurrent in-flight simulation: set key to PROCESSING
	inFlightKey := "test-inflight-key-999"
	_ = rdb.Set(context.Background(), "idempotency:"+inFlightKey, "PROCESSING", 60*time.Second).Err()

	req3, _ := http.NewRequest(http.MethodPost, "/transact", nil)
	req3.Header.Set("Idempotency-Key", inFlightKey)
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)

	if w3.Code != http.StatusConflict {
		t.Errorf("expected 409 Conflict for in-flight operation, got %d", w3.Code)
	}

	// Cleanup
	_ = rdb.Del(context.Background(), "idempotency:"+idemKey).Err()
	_ = rdb.Del(context.Background(), "idempotency:"+inFlightKey).Err()
}
