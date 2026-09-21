package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/handler"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

type mockAuthService struct {
	registerFunc     func(ctx context.Context, req domain.RegisterRequest, requestID, ip string) (*domain.UserResponse, error)
	loginFunc        func(ctx context.Context, req domain.LoginRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error)
	refreshTokenFunc func(ctx context.Context, refreshToken, requestID, ip, userAgent string) (*domain.AuthResponse, error)
	logoutFunc       func(ctx context.Context, refreshToken, requestID, ip string) error
	setup2FAFunc     func(ctx context.Context, userID uuid.UUID) (*domain.TwoFactorSetupResponse, error)
	enable2FAFunc    func(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error
	disable2FAFunc   func(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error
	verify2FAFunc    func(ctx context.Context, req domain.TwoFactorVerifyRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error)
}

func (m *mockAuthService) Register(ctx context.Context, req domain.RegisterRequest, requestID, ip string) (*domain.UserResponse, error) {
	if m.registerFunc != nil {
		return m.registerFunc(ctx, req, requestID, ip)
	}
	return nil, nil
}

func (m *mockAuthService) Login(ctx context.Context, req domain.LoginRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error) {
	if m.loginFunc != nil {
		return m.loginFunc(ctx, req, requestID, ip, userAgent)
	}
	return nil, nil
}

func (m *mockAuthService) RefreshToken(ctx context.Context, refreshToken, requestID, ip, userAgent string) (*domain.AuthResponse, error) {
	if m.refreshTokenFunc != nil {
		return m.refreshTokenFunc(ctx, refreshToken, requestID, ip, userAgent)
	}
	return nil, nil
}

func (m *mockAuthService) Logout(ctx context.Context, refreshToken, requestID, ip string) error {
	if m.logoutFunc != nil {
		return m.logoutFunc(ctx, refreshToken, requestID, ip)
	}
	return nil
}

func (m *mockAuthService) Setup2FA(ctx context.Context, userID uuid.UUID) (*domain.TwoFactorSetupResponse, error) {
	if m.setup2FAFunc != nil {
		return m.setup2FAFunc(ctx, userID)
	}
	return nil, nil
}

func (m *mockAuthService) Enable2FA(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error {
	if m.enable2FAFunc != nil {
		return m.enable2FAFunc(ctx, userID, code, requestID, ip)
	}
	return nil
}

func (m *mockAuthService) Disable2FA(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error {
	if m.disable2FAFunc != nil {
		return m.disable2FAFunc(ctx, userID, code, requestID, ip)
	}
	return nil
}

func (m *mockAuthService) Verify2FALogin(ctx context.Context, req domain.TwoFactorVerifyRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error) {
	if m.verify2FAFunc != nil {
		return m.verify2FAFunc(ctx, req, requestID, ip, userAgent)
	}
	return nil, nil
}

func TestAuthHandler_InternalServerErrorSanitization(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockSvc := &mockAuthService{
		registerFunc: func(ctx context.Context, req domain.RegisterRequest, requestID, ip string) (*domain.UserResponse, error) {
			return nil, errors.New("pq: connection refused to postgresql:5432")
		},
		loginFunc: func(ctx context.Context, req domain.LoginRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error) {
			return nil, errors.New("redis: connection timeout at 10.0.0.5")
		},
	}

	h := handler.NewAuthHandler(mockSvc)

	t.Run("Register logs error and returns sanitized 500 without leaking DB error", func(t *testing.T) {
		r := gin.New()
		r.POST("/register", h.Register)

		body := map[string]string{
			"email":      "user@example.com",
			"password":   "Password123!",
			"first_name": "John",
			"last_name":  "Doe",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/register", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Request-ID", "test-req-123")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.NotContains(t, w.Body.String(), "pq: connection refused")
		assert.Contains(t, w.Body.String(), "Failed to create user account")
	})

	t.Run("Login logs error and returns sanitized 500 without leaking cache error", func(t *testing.T) {
		r := gin.New()
		r.POST("/login", h.Login)

		body := map[string]string{
			"email":    "user@example.com",
			"password": "Password123!",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/login", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Request-ID", "test-req-456")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.NotContains(t, w.Body.String(), "redis: connection timeout")
		assert.Contains(t, w.Body.String(), "Authentication failed")
	})
}
