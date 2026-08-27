package auth_test

import (
	"context"
	"testing"

	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/redis/go-redis/v9"
)

type mockUserRepo struct {
	user *auth.User
}

func (m *mockUserRepo) Create(ctx context.Context, user *auth.User) error { return nil }
func (m *mockUserRepo) CreateWallet(ctx context.Context, userID string) error { return nil }
func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*auth.User, error) {
	return m.user, nil
}
func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*auth.User, error) {
	return m.user, nil
}

func TestAuthService_Logout_And_TokenRevocation(t *testing.T) {
	ctx := context.Background()
	jwtSecret := "super_secret_jwt_key_for_revocation_test"
	jwtExpiryHours := 24

	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skipf("Skipping test: Redis is not running: %v", err)
	}

	testUser := &auth.User{
		ID:         "usr_revoked_123",
		Email:      "revoked@bastion.com",
		FullName:   "Revoke Test",
		Role:       auth.RoleUser,
		Tier:       "tier_1",
		IsVerified: true,
	}

	userRepo := &mockUserRepo{user: testUser}
	authService := auth.NewService(userRepo, rdb, jwtSecret, jwtExpiryHours)

	tokenStr, claims, err := security.GenerateToken(testUser.ID, testUser.Email, testUser.Tier, jwtSecret, jwtExpiryHours)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	user, err := authService.ValidateToken(ctx, tokenStr)
	if err != nil {
		t.Fatalf("Expected token to be valid initially, got error: %v", err)
	}
	if user.ID != testUser.ID {
		t.Errorf("Expected user ID %s, got %s", testUser.ID, user.ID)
	}

	err = authService.Logout(ctx, tokenStr)
	if err != nil {
		t.Fatalf("Logout failed: %v", err)
	}

	jtiKey := "blacklist:jti:" + claims.ID
	val, err := rdb.Get(ctx, jtiKey).Result()
	if err != nil || val != "revoked" {
		t.Errorf("Expected JTI %s to be stored in Redis with 'revoked', got val=%s, err=%v", jtiKey, val, err)
	}

	_, err = authService.ValidateToken(ctx, tokenStr)
	if err == nil {
		t.Errorf("SECURITY FLAW! Token should be revoked after logout, but ValidateToken succeeded!")
	}
}
