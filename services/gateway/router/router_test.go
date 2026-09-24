package router

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/agamlatiff/bastion/services/gateway/config"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func testConfig() *config.Config {
	return &config.Config{
		Port:               "8000",
		AllowedOrigins:     []string{"*"},
		IdentityServiceURL: "http://localhost:8001",
		CustomerServiceURL: "http://localhost:8002",
		WalletServiceURL:   "http://localhost:8003",
		MetricsUser:        "metrics",
		MetricsPassword:    "secret123",
		RequestTimeoutSec:  5,
		MaxBodyBytes:       1048576,
	}
}

func TestHealthCheckEndpoints(t *testing.T) {
	cfg := testConfig()
	r := New(cfg)

	// Test /livez
	wLivez := httptest.NewRecorder()
	reqLivez, _ := http.NewRequest(http.MethodGet, "/livez", nil)
	r.ServeHTTP(wLivez, reqLivez)

	if wLivez.Code != http.StatusOK {
		t.Fatalf("expected /livez to return 200, got %d", wLivez.Code)
	}

	// Test /readyz
	wReadyz := httptest.NewRecorder()
	reqReadyz, _ := http.NewRequest(http.MethodGet, "/readyz", nil)
	r.ServeHTTP(wReadyz, reqReadyz)

	if wReadyz.Code != http.StatusOK {
		t.Fatalf("expected /readyz to return 200, got %d", wReadyz.Code)
	}
}

func TestMetricsEndpointAuth(t *testing.T) {
	cfg := testConfig()
	r := New(cfg)

	// 1. Unauthorized request without credentials
	wUnauth := httptest.NewRecorder()
	reqUnauth, _ := http.NewRequest(http.MethodGet, "/metrics", nil)
	r.ServeHTTP(wUnauth, reqUnauth)

	if wUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized without auth headers, got %d", wUnauth.Code)
	}

	// 2. Authorized request with valid credentials
	wAuth := httptest.NewRecorder()
	reqAuth, _ := http.NewRequest(http.MethodGet, "/metrics", nil)
	authVal := base64.StdEncoding.EncodeToString([]byte(cfg.MetricsUser + ":" + cfg.MetricsPassword))
	reqAuth.Header.Set("Authorization", "Basic "+authVal)
	r.ServeHTTP(wAuth, reqAuth)

	if wAuth.Code != http.StatusOK {
		t.Fatalf("expected 200 OK with valid basic auth, got %d", wAuth.Code)
	}
}
