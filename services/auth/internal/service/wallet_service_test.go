package service_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/agamlatiff/bastion/services/auth/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func setupTestEnv(t *testing.T) (*pgxpool.Pool, *redis.Client, service.WalletService, repository.UserRepository, repository.WalletRepository) {
	ctx := context.Background()
	dbURL := "postgres://bastion:bastion_secret@localhost:5433/bastion_db?sslmode=disable"
	pool, err := pgxpool.New(ctx, dbURL)

	if err != nil {
		t.Fatalf("Failed connect to postgresql testing: %v", err)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	userRepo := repository.NewUserRepository(pool)
	walletRepo := repository.NewWalletRepository(pool)
	walletService := service.NewWalletService(walletRepo, userRepo, rdb)

	return pool, rdb, walletService, userRepo, walletRepo
}

func createTestUser(ctx context.Context, t *testing.T, pool *pgxpool.Pool, email, name, tier string, initialBalance int64) (*domain.User, *domain.Wallet) {
	var user domain.User
	queryUser := `
		INSERT INTO users (email, password_hash, full_name, tier, is_verified)
		VALUES ($1, 'hashed_secret', $2, $3, true)
		RETURNING id, email, full_name, tier, is_verified, created_at
	`

	err := pool.QueryRow(ctx, queryUser, email, name, tier).Scan(
		&user.ID,
		&user.Email,
		&user.FullName,
		&user.Tier,
		&user.IsVerified,
		&user.CreatedAt,
	)

	if err != nil {
		t.Fatalf("Failed to testing %s: %v", email, err)
	}

	var wallet domain.Wallet
	queryWallet := `
		INSERT INTO wallets (user_id, balance, currency, max_balance_limit)
		VALUES ($1, $2, 'IDR', 10000000)
		RETURNING id, user_id, balance, currency, max_balance_limit, created_at, updated_at
	`

	err = pool.QueryRow(ctx, queryWallet, user.ID, initialBalance).Scan(
		&wallet.ID,
		&wallet.UserID,
		&wallet.Balance,
		&wallet.Currency,
		&wallet.MaxBalanceLimit,
		&wallet.CreatedAt,
		&wallet.UpdatedAt,
	)

	if err != nil {
		t.Fatalf("Failed to testing wallet %s: %v", email, err)
	}

	return &user, &wallet
}

// 1. TEST ANTI DOUBLE-SPENDING
func TestConcurrentTransfer_NoDoubleSpending(t *testing.T) {
	pool, rdb, walletServive, _, walletRepo := setupTestEnv(t)
	defer pool.Close()
	defer rdb.Close()
	ctx := context.Background()

	uniqueID := time.Now().UnixNano()
	userA, _ := createTestUser(ctx, t, pool, fmt.Sprintf("sender_%d@test.com", uniqueID), "Sender A", "tier_2", 100000)
	userB, _ := createTestUser(ctx, t, pool, fmt.Sprintf("receiver_%d@test.com", uniqueID), "Receiver B", "tier_2", 0)

	totalRequests := 10
	transferAmount := int64(20000)

	var successCount int32
	var failCount int32
	var wg sync.WaitGroup

	for i := 0; i < totalRequests; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			req := &domain.TransferRequest{
				ReceiverEmail:  userB.Email,
				Amount:         transferAmount,
				IdempotencyKey: fmt.Sprintf("no-ds-%d-%d", uniqueID, index),
				Description:    "Concurrent Transfer Test",
			}

			_, err := walletServive.Transfer(ctx, userA.ID, req)
			if err == nil {
				atomic.AddInt32(&successCount, 1)
			} else {
				atomic.AddInt32(&failCount, 1)
			}
		}(i)
	}

	wg.Wait()

	t.Logf("Concurrency result: Success = %d, Failes = %d", successCount, failCount)

	if successCount != 5 {
		t.Errorf("This should 5 transactions successed, but this get: %d", successCount)
	}

	if failCount != 5 {
		t.Errorf("This should 5 transactions failed, but this get: %d", failCount)
	}

	walletA, _ := walletRepo.FindByUserID(ctx, userA.ID)
	walletB, _ := walletRepo.FindByUserID(ctx, userB.ID)

	if walletA.Balance != 0 {
		t.Errorf("New balance of user A is should Rp 0, but it is get: Rp %d", walletA.Balance)
	}

	if walletB.Balance != 100000 {
		t.Errorf("New balance of user B is should Rp 100.000, but it is get: Rp %d", walletB.Balance)
	}
}

// 2. TEST DEADLOCK PREVENTION
func TestConcurrentTransfer_DeadlokPrevention(t *testing.T) {
	pool, rdb, walletService, _, walletRepo := setupTestEnv(t)
	defer pool.Close()
	defer rdb.Close()

	ctx := context.Background()

	uniqueID := time.Now().UnixNano()
	userA, _ := createTestUser(ctx, t, pool, fmt.Sprintf("userA_%d@test.com", uniqueID), "User A", "tier_2", 1000000)
	userB, _ := createTestUser(ctx, t, pool, fmt.Sprintf("userB_%d@test.com", uniqueID), "User B", "tier_2", 1000000)

	totalPairs := 50
	var deadlockCount int32
	var wg sync.WaitGroup

	for i := 0; i < totalPairs; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			req := &domain.TransferRequest{
				ReceiverEmail:  userB.Email,
				Amount:         1000,
				IdempotencyKey: fmt.Sprintf("deadlock-ab-%d-%d", uniqueID, index),
				Description:    "Deadlock Test A->B",
			}
			_, err := walletService.Transfer(ctx, userA.ID, req)
			if err != nil && (err.Error() == "deadlock detected" || fmt.Sprintf("%v", err) == "ERROR: deadlock detected (SQLSTATE 40P01)") {
				atomic.AddInt32(&deadlockCount, 1)
			}
		}(i)

		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			req := &domain.TransferRequest{
				ReceiverEmail:  userA.Email,
				Amount:         100,
				IdempotencyKey: fmt.Sprintf("deadlock-ba-%d-%d", uniqueID, index),
				Description:    "Deadlock Test B->A",
			}
			_, err := walletService.Transfer(ctx, userB.ID, req)
			if err != nil && (err.Error() == "deadlock detected" || fmt.Sprintf("%v", err) == "ERROR: deadlock detected (SQLSTATE 40P01)") {
				atomic.AddInt32(&deadlockCount, 1)
			}
		}(i)

	}
	wg.Wait()

	t.Logf("Deadloxk count: %d", deadlockCount)
	if deadlockCount > 0 {
		t.Errorf("A deadlock occured %d times during the process!", deadlockCount)
	}

	walletA, _ := walletRepo.FindByUserID(ctx, userA.ID)
	walletB, _ := walletRepo.FindByUserID(ctx, userB.ID)
	totalSystemBalance := walletA.Balance + walletB.Balance

	if totalSystemBalance != 2000000 {
		t.Errorf("Total amount in the system leaked or incosistent! Expected 2000000, got %d", totalSystemBalance)
	}

}

// 3. TEST CONCURRENT IDEMPOTENCY
func TestConcurrentTransfer_Idempotency(t *testing.T) {
	pool, rdb, walletService, _, walletRepo := setupTestEnv(t)
	defer pool.Close()
	defer rdb.Close()
	ctx := context.Background()

	uniqueID := time.Now().UnixNano()
	userA, _ := createTestUser(ctx, t, pool, fmt.Sprintf("idem_sender_%d@test.com", uniqueID), "Idem Sender", "tier_2", 500000)
	userB, _ := createTestUser(ctx, t, pool, fmt.Sprintf("idem_receiver_%d@test.com", uniqueID), "Idem Receiver", "tier_2", 0)

	sameIdempotencyKey := fmt.Sprintf("same-key-%d", uniqueID)
	totalRequests := 20
	var wg sync.WaitGroup

	for i := 0; i < totalRequests; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := &domain.TransferRequest{
				ReceiverEmail:  userB.Email,
				Amount:         50000,
				IdempotencyKey: sameIdempotencyKey,
				Description:    "Duplicate Key Test",
			}
			_, _ = walletService.Transfer(ctx, userA.ID, req)
		}()
	}
	wg.Wait()

	walletA, _ := walletRepo.FindByUserID(ctx, userA.ID)
	walletB, _ := walletRepo.FindByUserID(ctx, userB.ID)
	if walletA.Balance != 450000 {
		t.Errorf("Idempotency leak! balance User A should be 450000, but got: %d", walletA.Balance)
	}
	if walletB.Balance != 50000 {
		t.Errorf("Idempotency leak! balance User B should be 50000, but got: %d", walletB.Balance)
	}
}


