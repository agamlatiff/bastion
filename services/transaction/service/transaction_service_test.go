package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/transaction/domain"
	"github.com/agamlatiff/bastion/services/transaction/service"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type mockTransactionRepo struct {
	mock.Mock
}

func (m *mockTransactionRepo) CreateWithHistoryAndOutbox(
	ctx context.Context,
	tx *domain.Transaction,
	history *domain.TransactionStatusHistory,
	outbox *domain.OutboxEvent,
) error {
	args := m.Called(ctx, tx, history, outbox)
	return args.Error(0)
}

func (m *mockTransactionRepo) FindByIdempotencyKey(ctx context.Context, key string) (*domain.Transaction, error) {
	args := m.Called(ctx, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Transaction), args.Error(1)
}

func (m *mockTransactionRepo) FindByID(ctx context.Context, id uuid.UUID) (*domain.Transaction, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Transaction), args.Error(1)
}

func (m *mockTransactionRepo) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, int, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]domain.Transaction), args.Int(1), args.Error(2)
}

func (m *mockTransactionRepo) UpdateStatusWithHistoryAndOutbox(
	ctx context.Context,
	txID uuid.UUID,
	toStatus domain.TransactionStatus,
	failureCode, failureReason, reason *string,
	completedAt *time.Time,
	outbox *domain.OutboxEvent,
) (*domain.Transaction, error) {
	args := m.Called(ctx, txID, toStatus, failureCode, failureReason, reason, completedAt, outbox)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Transaction), args.Error(1)
}

func (m *mockTransactionRepo) GetStatusHistory(ctx context.Context, txID uuid.UUID) ([]domain.TransactionStatusHistory, error) {
	args := m.Called(ctx, txID)
	return args.Get(0).([]domain.TransactionStatusHistory), args.Error(1)
}

func TestTransactionService_CreateTransaction(t *testing.T) {
	senderID := uuid.New()
	receiverID := uuid.New()

	t.Run("successful transfer creation", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		req := domain.CreateTransactionRequest{
			IdempotencyKey:   "tx-12345",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           500000,
			FeeAmount:        2500,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
		}

		repo.On("FindByIdempotencyKey", mock.Anything, "tx-12345").
			Return(nil, domain.ErrTransactionNotFound)

		repo.On("CreateWithHistoryAndOutbox", mock.Anything, mock.MatchedBy(func(tx *domain.Transaction) bool {
			return tx.Amount == 500000 && tx.Status == domain.StatusCreated && tx.Currency == "IDR"
		}), mock.Anything, mock.MatchedBy(func(o *domain.OutboxEvent) bool {
			return o.EventType == "TransactionCreated" && o.Status == domain.OutboxStatusPending
		})).Return(nil)

		result, isReplay, err := svc.CreateTransaction(context.Background(), req)
		require.NoError(t, err)
		assert.False(t, isReplay)
		assert.NotNil(t, result)
		assert.Equal(t, domain.StatusCreated, result.Status)
		repo.AssertExpectations(t)
	})

	t.Run("idempotent replay with identical payload", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		req := domain.CreateTransactionRequest{
			IdempotencyKey:   "tx-replay-1",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           100000,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
		}

		existingTx := &domain.Transaction{
			ID:               uuid.New(),
			IdempotencyKey:   "tx-replay-1",
			RequestHash:      req.ComputeHash(),
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           100000,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
			Status:           domain.StatusCreated,
		}

		repo.On("FindByIdempotencyKey", mock.Anything, "tx-replay-1").
			Return(existingTx, nil)

		result, isReplay, err := svc.CreateTransaction(context.Background(), req)
		require.NoError(t, err)
		assert.True(t, isReplay)
		assert.Equal(t, existingTx.ID, result.ID)
		repo.AssertExpectations(t)
	})

	t.Run("idempotency conflict with modified payload", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		req := domain.CreateTransactionRequest{
			IdempotencyKey:   "tx-conflict-1",
			SenderWalletID:   &senderID,
			ReceiverWalletID: &receiverID,
			Amount:           200000, // Different amount
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
		}

		existingTx := &domain.Transaction{
			ID:             uuid.New(),
			IdempotencyKey: "tx-conflict-1",
			RequestHash:    "different_hash_value_1234567890abcdef1234567890abcdef",
			Amount:         100000,
		}

		repo.On("FindByIdempotencyKey", mock.Anything, "tx-conflict-1").
			Return(existingTx, nil)

		result, isReplay, err := svc.CreateTransaction(context.Background(), req)
		require.ErrorIs(t, err, domain.ErrIdempotencyConflict)
		assert.False(t, isReplay)
		assert.Nil(t, result)
	})

	t.Run("validation: amount <= 0 fails", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		req := domain.CreateTransactionRequest{
			Amount:   0,
			Currency: "IDR",
			Type:     domain.TypeTopup,
		}

		repo.On("FindByIdempotencyKey", mock.Anything, mock.Anything).
			Return(nil, domain.ErrTransactionNotFound)

		_, _, err := svc.CreateTransaction(context.Background(), req)
		require.ErrorIs(t, err, domain.ErrInvalidAmount)
	})

	t.Run("validation: same sender and receiver in transfer fails", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		sameID := uuid.New()
		req := domain.CreateTransactionRequest{
			SenderWalletID:   &sameID,
			ReceiverWalletID: &sameID,
			Amount:           50000,
			Currency:         "IDR",
			Type:             domain.TypeTransfer,
		}

		repo.On("FindByIdempotencyKey", mock.Anything, mock.Anything).
			Return(nil, domain.ErrTransactionNotFound)

		_, _, err := svc.CreateTransaction(context.Background(), req)
		require.ErrorIs(t, err, domain.ErrSameSenderReceiver)
	})
}

func TestTransactionService_UpdateStatus(t *testing.T) {
	txID := uuid.New()

	t.Run("valid transition: CREATED to PROCESSING", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		current := &domain.Transaction{
			ID:     txID,
			Status: domain.StatusCreated,
		}
		repo.On("FindByID", mock.Anything, txID).Return(current, nil)

		updated := &domain.Transaction{
			ID:     txID,
			Status: domain.StatusProcessing,
		}
		repo.On("UpdateStatusWithHistoryAndOutbox", mock.Anything, txID, domain.StatusProcessing,
			mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(updated, nil)

		res, err := svc.UpdateStatus(context.Background(), txID, domain.UpdateTransactionStatusRequest{
			Status: domain.StatusProcessing,
		})
		require.NoError(t, err)
		assert.Equal(t, domain.StatusProcessing, res.Status)
	})

	t.Run("valid transition: PROCESSING to COMPLETED", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		current := &domain.Transaction{
			ID:     txID,
			Status: domain.StatusProcessing,
		}
		repo.On("FindByID", mock.Anything, txID).Return(current, nil)

		updated := &domain.Transaction{
			ID:     txID,
			Status: domain.StatusCompleted,
		}
		repo.On("UpdateStatusWithHistoryAndOutbox", mock.Anything, txID, domain.StatusCompleted,
			mock.Anything, mock.Anything, mock.Anything, mock.MatchedBy(func(t *time.Time) bool {
				return t != nil
			}), mock.Anything).
			Return(updated, nil)

		res, err := svc.UpdateStatus(context.Background(), txID, domain.UpdateTransactionStatusRequest{
			Status: domain.StatusCompleted,
		})
		require.NoError(t, err)
		assert.Equal(t, domain.StatusCompleted, res.Status)
	})

	t.Run("invalid transition: CREATED to COMPLETED directly fails", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		current := &domain.Transaction{
			ID:     txID,
			Status: domain.StatusCreated,
		}
		repo.On("FindByID", mock.Anything, txID).Return(current, nil)

		_, err := svc.UpdateStatus(context.Background(), txID, domain.UpdateTransactionStatusRequest{
			Status: domain.StatusCompleted,
		})
		require.ErrorIs(t, err, domain.ErrInvalidStateTransition)
	})

	t.Run("invalid transition: COMPLETED to FAILED fails", func(t *testing.T) {
		repo := new(mockTransactionRepo)
		svc := service.NewTransactionService(repo)

		current := &domain.Transaction{
			ID:     txID,
			Status: domain.StatusCompleted,
		}
		repo.On("FindByID", mock.Anything, txID).Return(current, nil)

		_, err := svc.UpdateStatus(context.Background(), txID, domain.UpdateTransactionStatusRequest{
			Status: domain.StatusFailed,
		})
		require.ErrorIs(t, err, domain.ErrInvalidStateTransition)
	})
}
