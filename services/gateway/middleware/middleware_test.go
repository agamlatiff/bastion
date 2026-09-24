package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestRequestID(t *testing.T) {
	r := gin.New()
	r.Use(RequestID())
	r.GET("/test", func(c *gin.Context) {
		reqID := c.GetString("RequestID")
		c.String(http.StatusOK, reqID)
	})

	// Case 1: Fresh UUID generated when no headers provided
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w1.Code)
	}
	respID1 := w1.Header().Get("X-Request-ID")
	if respID1 == "" {
		t.Fatalf("expected non-empty X-Request-ID header")
	}

	// Case 2: Propagate valid UUID
	customUUID := "123e4567-e89b-12d3-a456-426614174000"
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req2.Header.Set("X-Request-ID", customUUID)
	r.ServeHTTP(w2, req2)

	if w2.Header().Get("X-Request-ID") != customUUID {
		t.Fatalf("expected X-Request-ID %s, got %s", customUUID, w2.Header().Get("X-Request-ID"))
	}
}

func TestSecurityHeaders(t *testing.T) {
	r := gin.New()
	r.Use(SecurityHeaders())
	r.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w, req)

	expectedHeaders := map[string]string{
		"X-Content-Type-Options":    "nosniff",
		"X-Frame-Options":           "DENY",
		"X-XSS-Protection":          "1; mode=block",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
		"Referrer-Policy":           "strict-origin-when-cross-origin",
	}

	for key, expectedVal := range expectedHeaders {
		if got := w.Header().Get(key); got != expectedVal {
			t.Errorf("expected header %s=%s, got %s", key, expectedVal, got)
		}
	}
}

func TestCORS(t *testing.T) {
	r := gin.New()
	r.Use(CORS([]string{"http://localhost:3000"}))
	r.GET("/test", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// Case 1: Allowed origin
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req1.Header.Set("Origin", "http://localhost:3000")
	r.ServeHTTP(w1, req1)

	if w1.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Fatalf("expected CORS allow origin header")
	}

	// Case 2: Preflight OPTIONS
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodOptions, "/test", nil)
	req2.Header.Set("Origin", "http://localhost:3000")
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusNoContent {
		t.Fatalf("expected status 204 on preflight, got %d", w2.Code)
	}
}

func TestRecovery(t *testing.T) {
	r := gin.New()
	r.Use(RequestID())
	r.Use(Recovery())
	r.GET("/panic", func(c *gin.Context) {
		panic("simulated fatal error")
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/panic", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

func TestBodyLimit(t *testing.T) {
	r := gin.New()
	r.Use(BodyLimit(10)) // Max 10 bytes
	r.POST("/upload", func(c *gin.Context) {
		var buf [20]byte
		_, err := c.Request.Body.Read(buf[:])
		if err != nil {
			c.AbortWithStatus(http.StatusRequestEntityTooLarge)
			return
		}
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	largePayload := bytes.Repeat([]byte("a"), 50)
	req, _ := http.NewRequest(http.MethodPost, "/upload", bytes.NewReader(largePayload))
	r.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", w.Code)
	}
}

func TestTimeout(t *testing.T) {
	r := gin.New()
	r.Use(Timeout(50 * time.Millisecond))
	r.GET("/timeout", func(c *gin.Context) {
		select {
		case <-time.After(100 * time.Millisecond):
			c.Status(http.StatusOK)
		case <-c.Request.Context().Done():
			c.AbortWithStatus(http.StatusGatewayTimeout)
		}
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/timeout", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusGatewayTimeout {
		t.Fatalf("expected 504 on timeout, got %d", w.Code)
	}
}
