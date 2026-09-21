package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/wallet/domain"
	"github.com/agamlatiff/bastion/services/wallet/repository"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type mockWalletRepo struct {
	getByIDCalls int
	wallet       *domain.Wallet
	updateErr    error
}

func (m *mockWalletRepo) Create(ctx context.Context, wallet *domain.Wallet) error {
	return nil
}

func (m *mockWalletRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Wallet, error) {
	m.getByIDCalls++
	if m.wallet != nil {
		return m.wallet, nil
	}
	return nil, domain.ErrWalletNotFound
}

func (m *mockWalletRepo) GetByCustomerID(ctx context.Context, customerID uuid.UUID) ([]*domain.Wallet, error) {
	return nil, nil
}

func (m *mockWalletRepo) GetActiveByCustomerAndCurrency(ctx context.Context, customerID uuid.UUID, currency string) (*domain.Wallet, error) {
	return nil, nil
}

func (m *mockWalletRepo) UpdateStatus(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus) error {
	if m.wallet != nil {
		m.wallet.Status = toStatus
	}
	return m.updateErr
}

func (m *mockWalletRepo) UpdateStatusWithOutbox(ctx context.Context, id uuid.UUID, fromStatus, toStatus domain.WalletStatus, event *domain.EventEnvelope) error {
	if m.wallet != nil {
		m.wallet.Status = toStatus
	}
	return m.updateErr
}

func (m *mockWalletRepo) CreateSnapshot(ctx context.Context, walletID uuid.UUID, balance int64) error {
	return nil
}

func (m *mockWalletRepo) SaveOutboxEvent(ctx context.Context, event *domain.EventEnvelope) error {
	return nil
}

func (m *mockWalletRepo) GetPendingOutboxEvents(ctx context.Context, limit int) ([]*domain.OutboxEvent, error) {
	return nil, nil
}

func (m *mockWalletRepo) MarkOutboxEventPublished(ctx context.Context, id uuid.UUID) error {
	return nil
}

func TestCachedWalletRepository_FallbackWhenRedisNil(t *testing.T) {
	walletID := uuid.New()
	mock := &mockWalletRepo{
		wallet: &domain.Wallet{
			ID:       walletID,
			Currency: "IDR",
			Balance:  500000,
			Status:   domain.StatusActive,
		},
	}

	cachedRepo := repository.NewCachedWalletRepository(mock, nil)

	w, err := cachedRepo.GetByID(context.Background(), walletID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if w.ID != walletID {
		t.Errorf("expected wallet ID %s, got %s", walletID, w.ID)
	}
	if mock.getByIDCalls != 1 {
		t.Errorf("expected 1 call to mock, got %d", mock.getByIDCalls)
	}
}

func TestCachedWalletRepository_CacheAsideAndInvalidation(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available on localhost:6379, skipping live cache test")
	}

	walletID := uuid.New()
	mock := &mockWalletRepo{
		wallet: &domain.Wallet{
			ID:       walletID,
			Currency: "IDR",
			Balance:  1000000,
			Status:   domain.StatusActive,
		},
	}

	cachedRepo := repository.NewCachedWalletRepository(mock, rdb)

	// Clean any previous test keys
	_ = rdb.Del(context.Background(), "wallet:"+walletID.String()).Err()

	// 1. First Call: Cache Miss -> Should hit mock repo
	w1, err := cachedRepo.GetByID(context.Background(), walletID)
	if err != nil {
		t.Fatalf("first GetByID failed: %v", err)
	}
	if w1.Balance != 1000000 {
		t.Errorf("expected balance 1000000, got %d", w1.Balance)
	}
	if mock.getByIDCalls != 1 {
		t.Errorf("expected mock calls = 1 on cache miss, got %d", mock.getByIDCalls)
	}

	// 2. Second Call: Cache Hit -> Should NOT hit mock repo
	w2, err := cachedRepo.GetByID(context.Background(), walletID)
	if err != nil {
		t.Fatalf("second GetByID failed: %v", err)
	}
	if w2.Balance != 1000000 {
		t.Errorf("expected cached balance 1000000, got %d", w2.Balance)
	}
	if mock.getByIDCalls != 1 {
		t.Errorf("expected mock calls still = 1 on cache hit, got %d", mock.getByIDCalls)
	}

	// 3. Mutate Status: UpdateStatus -> Must invalidate cache
	err = cachedRepo.UpdateStatus(context.Background(), walletID, domain.StatusActive, domain.StatusFrozen)
	if err != nil {
		t.Fatalf("UpdateStatus failed: %v", err)
	}

	// 4. Third Call: After Invalidation -> Must query mock repo again and get updated status
	w3, err := cachedRepo.GetByID(context.Background(), walletID)
	if err != nil {
		t.Fatalf("third GetByID failed: %v", err)
	}
	if w3.Status != domain.StatusFrozen {
		t.Errorf("expected status FROZEN after invalidation, got %s", w3.Status)
	}
	if mock.getByIDCalls != 2 {
		t.Errorf("expected mock calls = 2 after invalidation, got %d", mock.getByIDCalls)
	}

	// Cleanup
	_ = rdb.Del(context.Background(), "wallet:"+walletID.String()).Err()
}
