package wallet_test

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/agamlatiff/bastion/internal/wallet"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func setupTestEnv(t *testing.T) (*pgxpool.Pool, *redis.Client, wallet.Service, auth.Repository, wallet.Repository) {
	ctx := context.Background()
	dbURL := "postgres://bastion:bastion_secret@localhost:5433/bastion_db?sslmode=disable"
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("Failed connect to postgresql testing: %v", err)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skipf("Skipping test: Redis not running: %v", err)
	}

	userRepo := auth.NewRepository(pool)
	walletRepo := wallet.NewRepository(pool)
	walletService := wallet.NewService(walletRepo, userRepo, rdb)

	return pool, rdb, walletService, userRepo, walletRepo
}

func createTestUser(ctx context.Context, t *testing.T, pool *pgxpool.Pool, email, name, tier string, initialBalance int64) (*auth.User, *wallet.Wallet) {
	var user auth.User
	queryUser := `
		INSERT INTO users (email, password_hash, full_name, role, tier, is_verified)
		VALUES ($1, 'hashed_secret', $2, 'USER', $3, true)
		RETURNING id, email, full_name, role, tier, is_verified, created_at
	`
	err := pool.QueryRow(ctx, queryUser, email, name, tier).Scan(
		&user.ID,
		&user.Email,
		&user.FullName,
		&user.Role,
		&user.Tier,
		&user.IsVerified,
		&user.CreatedAt,
	)
	if err != nil {
		t.Fatalf("Failed to create test user %s: %v", email, err)
	}

	var w wallet.Wallet
	queryWallet := `
		INSERT INTO wallets (user_id, balance, currency, max_balance_limit)
		VALUES ($1, $2, 'IDR', 10000000)
		RETURNING id, user_id, balance, currency, max_balance_limit, created_at, updated_at
	`
	err = pool.QueryRow(ctx, queryWallet, user.ID, initialBalance).Scan(
		&w.ID,
		&w.UserID,
		&w.Balance,
		&w.Currency,
		&w.MaxBalanceLimit,
		&w.CreatedAt,
		&w.UpdatedAt,
	)
	if err != nil {
		t.Fatalf("Failed to create test wallet for user %s: %v", email, err)
	}

	return &user, &w
}

func TestConcurrentTransfer_NoDoubleSpending(t *testing.T) {
	pool, _, walletService, _, walletRepo := setupTestEnv(t)
	defer pool.Close()
	ctx := context.Background()

	uniqueEmailA := fmt.Sprintf("userA_%d@bastion.com", time.Now().UnixNano())
	uniqueEmailB := fmt.Sprintf("userB_%d@bastion.com", time.Now().UnixNano())

	userA, _ := createTestUser(ctx, t, pool, uniqueEmailA, "User A", "tier_1", 100000)
	userB, _ := createTestUser(ctx, t, pool, uniqueEmailB, "User B", "tier_1", 0)

	var wg sync.WaitGroup
	var successCount int64
	var failCount int64

	totalRequests := 10
	transferAmount := int64(20000)

	for i := 0; i < totalRequests; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()
			idmKey := fmt.Sprintf("idm_concurrent_%d_%d", time.Now().UnixNano(), iteration)

			req := &wallet.TransferRequest{
				ReceiverEmail:  userB.Email,
				Amount:         transferAmount,
				IdempotencyKey: idmKey,
				Description:    "Concurrency Test",
			}

			_, err := walletService.Transfer(ctx, userA.ID, req)
			if err != nil {
				atomic.AddInt64(&failCount, 1)
			} else {
				atomic.AddInt64(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()

	if successCount != 5 {
		t.Errorf("Expected 5 successful transfers, got: %d", successCount)
	}
	if failCount != 5 {
		t.Errorf("Expected 5 failed transfers, got: %d", failCount)
	}

	finalWalletA, _ := walletRepo.FindByUserID(ctx, userA.ID)
	finalWalletB, _ := walletRepo.FindByUserID(ctx, userB.ID)

	if finalWalletA.Balance != 0 {
		t.Errorf("Expected User A final balance to be 0, got: %d", finalWalletA.Balance)
	}
	if finalWalletB.Balance != 100000 {
		t.Errorf("Expected User B final balance to be 100000, got: %d", finalWalletB.Balance)
	}
}

func TestConcurrentTransfer_DeadlockPrevention(t *testing.T) {
	pool, _, walletService, _, walletRepo := setupTestEnv(t)
	defer pool.Close()
	ctx := context.Background()

	uniqueEmailA := fmt.Sprintf("deadlockA_%d@bastion.com", time.Now().UnixNano())
	uniqueEmailB := fmt.Sprintf("deadlockB_%d@bastion.com", time.Now().UnixNano())

	userA, _ := createTestUser(ctx, t, pool, uniqueEmailA, "Deadlock User A", "tier_1", 1000000)
	userB, _ := createTestUser(ctx, t, pool, uniqueEmailB, "Deadlock User B", "tier_1", 1000000)

	var wg sync.WaitGroup
	var deadlockCount int64

	iterations := 10

	for i := 0; i < iterations; i++ {
		wg.Add(2)
		go func(it int) {
			defer wg.Done()
			req := &wallet.TransferRequest{
				ReceiverEmail:  userB.Email,
				Amount:         1000,
				IdempotencyKey: fmt.Sprintf("idm_dl_ab_%d_%d", time.Now().UnixNano(), it),
				Description:    "Deadlock A->B",
			}
			_, err := walletService.Transfer(ctx, userA.ID, req)
			if err != nil {
				atomic.AddInt64(&deadlockCount, 1)
			}
		}(i)

		go func(it int) {
			defer wg.Done()
			req := &wallet.TransferRequest{
				ReceiverEmail:  userA.Email,
				Amount:         1000,
				IdempotencyKey: fmt.Sprintf("idm_dl_ba_%d_%d", time.Now().UnixNano(), it),
				Description:    "Deadlock B->A",
			}
			_, err := walletService.Transfer(ctx, userB.ID, req)
			if err != nil {
				atomic.AddInt64(&deadlockCount, 1)
			}
		}(i)
	}

	wg.Wait()

	if deadlockCount > 0 {
		t.Errorf("Deadlock occurred! Errors: %d", deadlockCount)
	}

	finalA, _ := walletRepo.FindByUserID(ctx, userA.ID)
	finalB, _ := walletRepo.FindByUserID(ctx, userB.ID)

	if finalA.Balance+finalB.Balance != 2000000 {
		t.Errorf("Money created/destroyed! Total balance mismatch: %d", finalA.Balance+finalB.Balance)
	}
}

func TestConcurrentTransfer_Idempotency(t *testing.T) {
	pool, _, walletService, _, walletRepo := setupTestEnv(t)
	defer pool.Close()
	ctx := context.Background()

	uniqueEmailA := fmt.Sprintf("idmA_%d@bastion.com", time.Now().UnixNano())
	uniqueEmailB := fmt.Sprintf("idmB_%d@bastion.com", time.Now().UnixNano())

	userA, _ := createTestUser(ctx, t, pool, uniqueEmailA, "Idm User A", "tier_1", 500000)
	userB, _ := createTestUser(ctx, t, pool, uniqueEmailB, "Idm User B", "tier_1", 0)

	idmKey := fmt.Sprintf("idm_single_retry_%d", time.Now().UnixNano())

	req := &wallet.TransferRequest{
		ReceiverEmail:  userB.Email,
		Amount:         50000,
		IdempotencyKey: idmKey,
		Description:    "Idempotency Retry Test",
	}

	tx1, err := walletService.Transfer(ctx, userA.ID, req)
	if err != nil {
		t.Fatalf("First transfer failed: %v", err)
	}

	tx2, err := walletService.Transfer(ctx, userA.ID, req)
	if err != nil {
		t.Fatalf("Second transfer with same idempotency key failed: %v", err)
	}

	if tx1.ID != tx2.ID {
		t.Errorf("Idempotency failed: Expected same transaction ID %s, got %s", tx1.ID, tx2.ID)
	}

	finalA, _ := walletRepo.FindByUserID(ctx, userA.ID)
	finalB, _ := walletRepo.FindByUserID(ctx, userB.ID)

	if finalA.Balance != 450000 {
		t.Errorf("Idempotency leak! User A balance should be 450000, got: %d", finalA.Balance)
	}
	if finalB.Balance != 50000 {
		t.Errorf("Idempotency leak! User B balance should be 50000, got: %d", finalB.Balance)
	}
}

func TestConcurrentTopUp_NoOverLimit(t *testing.T) {
	pool, _, walletService, _, walletRepo := setupTestEnv(t)
	defer pool.Close()
	ctx := context.Background()

	uniqueEmail := fmt.Sprintf("topup_race_%d@bastion.com", time.Now().UnixNano())
	user, _ := createTestUser(ctx, t, pool, uniqueEmail, "TopUpRacer", "tier_1", 1500000)

	_, err := pool.Exec(ctx, "UPDATE wallets SET max_balance_limit = 2000000 WHERE user_id = $1", user.ID)

	if err != nil {
		t.Fatalf("Failed to update wallet limit: %v", err)
	}

	var wg sync.WaitGroup
	var successCount int64
	var failCount int64

	totalRequests := 10
	topUpAmount := int64(500000)

	for i := 0; i < totalRequests; i++ {
		wg.Add(1)
		go func(iteration int) {
			defer wg.Done()

			idmKey := fmt.Sprintf("idm_topup_%d_%d", time.Now().UnixNano(), iteration)

			req := &wallet.TopUpRequest{
				Amount:         topUpAmount,
				IdempotencyKey: idmKey,
				Description:    "Concurrent Top Up Test",
			}

			_, err := walletService.TopUp(ctx, user.ID, req)

			if err != nil {
				atomic.AddInt64(&failCount, 1)
			} else {
				atomic.AddInt64(&successCount, 1)
			}
		}(i)
	}

	wg.Wait()

	if successCount != 1 {
		t.Errorf("CRITICAL SRCURITY FLAW!, Expected exactly 1 successful top-up. but got: %d", successCount)
	}

	if failCount != 9 {
		t.Errorf("Expected 9 rejected top-ups due to limit cap got: %d", failCount)
	}

	finalWallet, _ := walletRepo.FindByUserID(ctx, user.ID)
	if finalWallet.Balance != 2000000 {
		t.Errorf("OVER-LIMIT EXPLOIT! Final balance exceeded limit: got Rp %d, expected Rp 2.000.000", finalWallet.Balance)
	}
}

func TestWalletInvariants_DatabaseLevelConstraint(t *testing.T) {
	pool, _, _, _, _ := setupTestEnv(t)
	defer pool.Close()	
	ctx := context.Background()

	uniqueEmail := fmt.Sprintf("invariant_%d@bastion.com", time.Now().UnixNano())
	_, w := createTestUser(ctx, t, pool, uniqueEmail, "Invariant User", "tier_1", 100000)

	_, err := pool.Exec(ctx, "UPDATE wallets SET balance = -50000 WHERE id = $1", w.ID)
	if err == nil {
		t.Errorf("DATABASE INVARIANT FLAW! Database allowed negative balance!")
	}

	_, err = pool.Exec(ctx, "UPDATE wallets SET balance = 15000000 WHERE id = $1", w.ID)
	if err == nil {
		t.Errorf("DATABASE INVARIANT FLAW! Database allowed balance to exceed max_balance_limit!")
	}
}
