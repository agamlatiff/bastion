package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/transaction/domain"
	"github.com/agamlatiff/bastion/services/transaction/handler"
	"github.com/agamlatiff/bastion/services/transaction/security"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type mockTransactionService struct {
	mock.Mock
}

func (m *mockTransactionService) CreateTransaction(ctx context.Context, req domain.CreateTransactionRequest) (*domain.Transaction, bool, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Bool(1), args.Error(2)
	}
	return args.Get(0).(*domain.Transaction), args.Bool(1), args.Error(2)
}

func (m *mockTransactionService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Transaction, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Transaction), args.Error(1)
}

func (m *mockTransactionService) GetStatusHistory(ctx context.Context, id uuid.UUID) ([]domain.TransactionStatusHistory, error) {
	args := m.Called(ctx, id)
	return args.Get(0).([]domain.TransactionStatusHistory), args.Error(1)
}

func (m *mockTransactionService) ListTransactions(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, int, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]domain.Transaction), args.Int(1), args.Error(2)
}

func (m *mockTransactionService) UpdateStatus(ctx context.Context, id uuid.UUID, req domain.UpdateTransactionStatusRequest) (*domain.Transaction, error) {
	args := m.Called(ctx, id, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Transaction), args.Error(1)
}

func setupTestRouter(svc *mockTransactionService, secret string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	hdr := handler.NewTransactionHandler(svc)
	jwtSvc := security.NewJWTService(secret)
	handler.RegisterRoutes(r, nil, hdr, jwtSvc)
	return r
}

func generateTestToken(secret string, roles []string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   uuid.New().String(),
		"roles": roles,
		"exp":   time.Now().Add(time.Hour).Unix(),
	})
	signed, _ := token.SignedString([]byte(secret))
	return "Bearer " + signed
}

func TestTransactionHandler_CreateTransaction(t *testing.T) {
	secret := "super_secret_test_key_1234567890"
	senderID := uuid.New()
	receiverID := uuid.New()

	t.Run("success 201 Created", func(t *testing.T) {
		svc := new(mockTransactionService)
		router := setupTestRouter(svc, secret)
		token := generateTestToken(secret, []string{"CUSTOMER"})

		reqPayload := domain.CreateTransactionRequest{
			IdempotencyKey:   "key-abc",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           150000,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
		}

		createdTx := &domain.Transaction{
			ID:               uuid.New(),
			IdempotencyKey:   "key-abc",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           150000,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
			Status:           domain.StatusCreated,
			CreatedAt:        time.Now().UTC(),
			UpdatedAt:        time.Now().UTC(),
		}

		svc.On("CreateTransaction", mock.Anything, mock.MatchedBy(func(r domain.CreateTransactionRequest) bool {
			return r.IdempotencyKey == "key-abc" && r.Amount == 150000
		})).Return(createdTx, false, nil)

		body, _ := json.Marshal(reqPayload)
		req, _ := http.NewRequest(http.MethodPost, "/v1/transactions", bytes.NewBuffer(body))
		req.Header.Set("Authorization", token)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		assert.Empty(t, w.Header().Get("X-Idempotent-Replay"))
		svc.AssertExpectations(t)
	})

	t.Run("idempotent replay 200 OK with header", func(t *testing.T) {
		svc := new(mockTransactionService)
		router := setupTestRouter(svc, secret)
		token := generateTestToken(secret, []string{"CUSTOMER"})

		reqPayload := domain.CreateTransactionRequest{
			IdempotencyKey:   "key-replay",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           150000,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
		}

		existingTx := &domain.Transaction{
			ID:               uuid.New(),
			IdempotencyKey:   "key-replay",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           150000,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
			Status:           domain.StatusCreated,
			CreatedAt:        time.Now().UTC(),
			UpdatedAt:        time.Now().UTC(),
		}

		svc.On("CreateTransaction", mock.Anything, mock.MatchedBy(func(r domain.CreateTransactionRequest) bool {
			return r.IdempotencyKey == "key-replay"
		})).Return(existingTx, true, nil)

		body, _ := json.Marshal(reqPayload)
		req, _ := http.NewRequest(http.MethodPost, "/v1/transactions", bytes.NewBuffer(body))
		req.Header.Set("Authorization", token)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "true", w.Header().Get("X-Idempotent-Replay"))
		svc.AssertExpectations(t)
	})

	t.Run("idempotency conflict 409 Conflict", func(t *testing.T) {
		svc := new(mockTransactionService)
		router := setupTestRouter(svc, secret)
		token := generateTestToken(secret, []string{"CUSTOMER"})

		reqPayload := domain.CreateTransactionRequest{
			IdempotencyKey:   "key-conflict",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           999999,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
		}

		svc.On("CreateTransaction", mock.Anything, mock.Anything).
			Return(nil, false, domain.ErrIdempotencyConflict)

		body, _ := json.Marshal(reqPayload)
		req, _ := http.NewRequest(http.MethodPost, "/v1/transactions", bytes.NewBuffer(body))
		req.Header.Set("Authorization", token)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusConflict, w.Code)
		var resp map[string]any
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		errObj := resp["error"].(map[string]any)
		assert.Equal(t, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST", errObj["code"])
	})
}

func TestTransactionHandler_GetByID(t *testing.T) {
	secret := "super_secret_test_key_1234567890"
	txID := uuid.New()

	t.Run("found 200 OK", func(t *testing.T) {
		svc := new(mockTransactionService)
		router := setupTestRouter(svc, secret)
		token := generateTestToken(secret, []string{"CUSTOMER"})

		tx := &domain.Transaction{
			ID:             txID,
			IdempotencyKey: "k1",
			Amount:         50000,
			Currency:       "IDR",
			Type:           domain.TypeTopup,
			Status:         domain.StatusCreated,
			CreatedAt:      time.Now().UTC(),
			UpdatedAt:      time.Now().UTC(),
		}
		svc.On("GetByID", mock.Anything, txID).Return(tx, nil)

		req, _ := http.NewRequest(http.MethodGet, "/v1/transactions/"+txID.String(), nil)
		req.Header.Set("Authorization", token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("not found 404", func(t *testing.T) {
		svc := new(mockTransactionService)
		router := setupTestRouter(svc, secret)
		token := generateTestToken(secret, []string{"CUSTOMER"})

		svc.On("GetByID", mock.Anything, txID).Return(nil, domain.ErrTransactionNotFound)

		req, _ := http.NewRequest(http.MethodGet, "/v1/transactions/"+txID.String(), nil)
		req.Header.Set("Authorization", token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}
