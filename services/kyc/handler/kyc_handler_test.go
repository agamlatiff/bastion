package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/kyc/domain"
	"github.com/agamlatiff/bastion/services/kyc/security"
	"github.com/agamlatiff/bastion/services/kyc/service"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func init() {
	gin.SetMode(gin.TestMode)
}

type mockRepo struct {
	byID     map[uuid.UUID]*domain.KYCVerification
	byUserID map[uuid.UUID]*domain.KYCVerification
}

func (m *mockRepo) Create(ctx context.Context, k *domain.KYCVerification) error {
	m.byID[k.ID] = k
	m.byUserID[k.UserID] = k
	return nil
}

func (m *mockRepo) FindByUserID(ctx context.Context, userID uuid.UUID) (*domain.KYCVerification, error) {
	if k, ok := m.byUserID[userID]; ok {
		return k, nil
	}
	return nil, domain.ErrKYCNotFound
}

func (m *mockRepo) FindByID(ctx context.Context, id uuid.UUID) (*domain.KYCVerification, error) {
	if k, ok := m.byID[id]; ok {
		return k, nil
	}
	return nil, domain.ErrKYCNotFound
}

func (m *mockRepo) FindByIDCardHash(ctx context.Context, hash string) (*domain.KYCVerification, error) {
	return nil, domain.ErrKYCNotFound
}

func (m *mockRepo) UpdateStatus(ctx context.Context, kycID uuid.UUID, status domain.KYCStatus, rejectionReason *string, event *domain.OutboxEvent) error {
	if k, ok := m.byID[kycID]; ok {
		k.Status = status
		k.RejectionReason = rejectionReason
		return nil
	}
	return domain.ErrKYCNotFound
}

func generateToken(secret string, userID uuid.UUID, roles []string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID.String(),
		"roles":   roles,
		"exp":     time.Now().Add(1 * time.Hour).Unix(),
	})
	signed, _ := token.SignedString([]byte(secret))
	return signed
}

func TestKYCHandler_Endpoints(t *testing.T) {
	jwtSecret := "kyc_handler_test_secret_123"
	encryptionKey := []byte("01234567890123456789012345678901")

	repo := &mockRepo{
		byID:     make(map[uuid.UUID]*domain.KYCVerification),
		byUserID: make(map[uuid.UUID]*domain.KYCVerification),
	}
	svc := service.NewKYCService(repo, encryptionKey)
	hdr := NewKYCHandler(svc)
	jwtSvc := security.NewJWTService(jwtSecret)

	r := gin.New()
	RegisterRoutes(r, nil, hdr, jwtSvc)

	customerID := uuid.New()
	customerToken := generateToken(jwtSecret, customerID, []string{"CUSTOMER"})

	reviewerID := uuid.New()
	reviewerToken := generateToken(jwtSecret, reviewerID, []string{"KYC_REVIEWER"})

	// 1. Submit KYC as customer
	submitReq := domain.SubmitKYCRequest{
		IDCardNumber:   "3171012345670001",
		IDCardImageURL: "https://example.com/ktp.jpg",
		SelfieImageURL: "https://example.com/selfie.jpg",
	}
	submitBytes, _ := json.Marshal(submitReq)

	wSubmit := httptest.NewRecorder()
	reqSubmit, _ := http.NewRequest(http.MethodPost, "/v1/kyc", bytes.NewReader(submitBytes))
	reqSubmit.Header.Set("Authorization", "Bearer "+customerToken)
	reqSubmit.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wSubmit, reqSubmit)

	if wSubmit.Code != http.StatusCreated {
		t.Fatalf("expected status 201 on SubmitKYC, got %d (body: %s)", wSubmit.Code, wSubmit.Body.String())
	}

	var submitResp domain.KYCResponse
	_ = json.Unmarshal(wSubmit.Body.Bytes(), &submitResp)
	kycID := submitResp.ID

	// 2. Get my KYC status as customer
	wGet := httptest.NewRecorder()
	reqGet, _ := http.NewRequest(http.MethodGet, "/v1/kyc/me", nil)
	reqGet.Header.Set("Authorization", "Bearer "+customerToken)
	r.ServeHTTP(wGet, reqGet)

	if wGet.Code != http.StatusOK {
		t.Fatalf("expected status 200 on GetMyKYC, got %d", wGet.Code)
	}

	// 3. Attempt Review as customer without KYC_REVIEWER role (403 expected)
	reviewReq := domain.ReviewKYCRequest{Status: "approved"}
	reviewBytes, _ := json.Marshal(reviewReq)

	wForbidden := httptest.NewRecorder()
	reqForbidden, _ := http.NewRequest(http.MethodPost, "/v1/kyc/"+kycID.String()+"/review", bytes.NewReader(reviewBytes))
	reqForbidden.Header.Set("Authorization", "Bearer "+customerToken)
	reqForbidden.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wForbidden, reqForbidden)

	if wForbidden.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 Forbidden for non-reviewer, got %d", wForbidden.Code)
	}

	// 4. Review as authorized KYC_REVIEWER (200 expected)
	wApprove := httptest.NewRecorder()
	reqApprove, _ := http.NewRequest(http.MethodPost, "/v1/kyc/"+kycID.String()+"/review", bytes.NewReader(reviewBytes))
	reqApprove.Header.Set("Authorization", "Bearer "+reviewerToken)
	reqApprove.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wApprove, reqApprove)

	if wApprove.Code != http.StatusOK {
		t.Fatalf("expected status 200 on review approval, got %d (body: %s)", wApprove.Code, wApprove.Body.String())
	}
}
