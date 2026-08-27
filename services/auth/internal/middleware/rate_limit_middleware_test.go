package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/auth/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func TestRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx := context.Background()

	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skipf("Skipping test: Redis is not running: %v", err)
	}

	testIP := "192.168.1.100"
	testKey := "rate-limit:test-action:" + testIP
	rdb.Del(ctx, testKey)

	r := gin.New()
	r.Use(middleware.RateLimitMiddleware(rdb, "test-action", 3, 2*time.Second))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "success",
		})
	})

	for i := 1; i <= 3; i++ {
		req, _ := http.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Forwarded-For", testIP)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("Request %d expected 200 OK, got %d", i, w.Code)
		}
	}

	req4, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req4.Header.Set("X-Forwarded-For", testIP)
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, req4)

	if w4.Code != http.StatusTooManyRequests {
		t.Fatalf("Request 4 expected 429 Too Many Requests, got %d", w4.Code)
	}
}
