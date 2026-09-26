package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/agamlatiff/bastion/services/customer/security"
	"github.com/agamlatiff/bastion/services/customer/service"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// In-memory mock repository for handler tests
type mockRepo struct {
	data map[uuid.UUID]*domain.Customer
}

func (m *mockRepo) FindByIdentityUserID(ctx context.Context, id uuid.UUID) (*domain.Customer, error) {
	if c, ok := m.data[id]; ok {
		return c, nil
	}
	return nil, domain.ErrCustomerNotFound
}

func (m *mockRepo) ExistsByIdentityUserID(ctx context.Context, id uuid.UUID) (bool, error) {
	_, ok := m.data[id]
	return ok, nil
}

func (m *mockRepo) Create(ctx context.Context, c *domain.Customer) error {
	m.data[c.IdentityUserID] = c
	return nil
}

func (m *mockRepo) Update(ctx context.Context, c *domain.Customer) error {
	m.data[c.IdentityUserID] = c
	return nil
}

func TestCustomerHandler_Endpoints(t *testing.T) {
	jwtSecret := "test_secret_for_handlers_123"
	jwtSvc := security.NewJWTService(jwtSecret)

	identityUserID := uuid.New()
	initialName := "Sarah Connor"
	repo := &mockRepo{data: make(map[uuid.UUID]*domain.Customer)}
	repo.data[identityUserID] = &domain.Customer{
		ID:             uuid.New(),
		IdentityUserID: identityUserID,
		Email:          "sarah@example.com",
		FullName:       &initialName,
		Status:         "ACTIVE",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	customerSvc := service.NewCustomerService(repo, nil)
	customerHdr := NewCustomerHandler(customerSvc)

	r := gin.New()
	RegisterRoutes(r, nil, nil, customerHdr, jwtSvc)

	// Create valid JWT
	validToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": identityUserID.String(),
		"exp":     time.Now().Add(1 * time.Hour).Unix(),
	})
	signedToken, _ := validToken.SignedString([]byte(jwtSecret))

	// 1. Test /livez
	wLivez := httptest.NewRecorder()
	reqLivez, _ := http.NewRequest(http.MethodGet, "/livez", nil)
	r.ServeHTTP(wLivez, reqLivez)
	if wLivez.Code != http.StatusOK {
		t.Fatalf("expected /livez to return 200, got %d", wLivez.Code)
	}

	// 2. Test GET /v1/customers/me without Auth header (401 expected)
	wUnauth := httptest.NewRecorder()
	reqUnauth, _ := http.NewRequest(http.MethodGet, "/v1/customers/me", nil)
	r.ServeHTTP(wUnauth, reqUnauth)
	if wUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized without auth header, got %d", wUnauth.Code)
	}

	// 3. Test GET /v1/customers/me with valid Bearer token (200 expected)
	wAuth := httptest.NewRecorder()
	reqAuth, _ := http.NewRequest(http.MethodGet, "/v1/customers/me", nil)
	reqAuth.Header.Set("Authorization", "Bearer "+signedToken)
	r.ServeHTTP(wAuth, reqAuth)
	if wAuth.Code != http.StatusOK {
		t.Fatalf("expected 200 OK with valid token, got %d (body: %s)", wAuth.Code, wAuth.Body.String())
	}

	// 4. Test PATCH /v1/customers/me with update payload (200 expected)
	newName := "Sarah J. Connor"
	newPhone := "+628111222333"
	updateReq := domain.UpdateCustomerRequest{
		FullName:    &newName,
		PhoneNumber: &newPhone,
	}
	body, _ := json.Marshal(updateReq)

	wPatch := httptest.NewRecorder()
	reqPatch, _ := http.NewRequest(http.MethodPatch, "/v1/customers/me", bytes.NewReader(body))
	reqPatch.Header.Set("Authorization", "Bearer "+signedToken)
	reqPatch.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wPatch, reqPatch)

	if wPatch.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on PATCH /me, got %d", wPatch.Code)
	}
	var patchResp domain.CustomerResponse
	_ = json.Unmarshal(wPatch.Body.Bytes(), &patchResp)
	if *patchResp.FullName != newName || *patchResp.PhoneNumber != newPhone {
		t.Fatalf("unexpected patch response: %+v", patchResp)
	}
}
