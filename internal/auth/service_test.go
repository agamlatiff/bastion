package auth_test

import (
	"context"
	"errors"
	"testing"

	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/redis/go-redis/v9"
)

type mockUserRepo struct {
	users map[string]*auth.User
}

func (m *mockUserRepo) Create(ctx context.Context, user *auth.User) error {
	m.users[user.Email] = user
	return nil
}
func (m *mockUserRepo) CreateWallet(ctx context.Context, userID string) error { return nil }
func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*auth.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, errors.New("not found")
}
func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*auth.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, errors.New("not found")
}

func TestAuthService_Register(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	usersMap := make(map[string]*auth.User)
	hashedPw, _ := security.HashPassword("KatakunciKuat123!")

	existingUser := &auth.User{
		ID:           "usr_123",
		Email:        "existing@bastion.com",
		PasswordHash: string(hashedPw),
	}

	usersMap[existingUser.Email] = existingUser
	repo := &mockUserRepo{users: usersMap}
	svc := auth.NewService(repo, rdb, "secret", 24)

	t.Run("Success", func(t *testing.T) {
		req := &auth.RegisterRequest{Email: "new@bastion.com", Password: "StrongPassword1!", FullName: "New User"}
		res, err := svc.Register(context.Background(), req)

		if err != nil {
			t.Errorf("expected success, got error: %v", err)
		}

		if res.Token == "" {
			t.Error("expected token to be generated")
		}
	})

	t.Run("Duplicate Email", func(t *testing.T) {
		req := &auth.RegisterRequest{Email: "existing@bastion.com", Password: "StrongPassword1!", FullName: "New User"}
		_, err := svc.Register(context.Background(), req)
		if err == nil || err.Error() != "email already registered" {
			t.Errorf("expected duplicate email error, got: %v", err)
		}
	})
}

func TestAuthService_Login(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	usersMap := make(map[string]*auth.User)
	hashedPw, _ := security.HashPassword("supersecret12345!")
	existingUser := &auth.User{
		ID: "usr_123",
		Email: "existing@bastion.com",
		PasswordHash: string(hashedPw),
		Tier: "tier_1",
	}

	usersMap[existingUser.Email] = existingUser

	repo := &mockUserRepo{
		users:usersMap,
	}

	svc := auth.NewService(repo, rdb, "secret",24)
	
	t.Run("Success", func(t *testing.T) {
		req := &auth.LoginRequest{Email: "existing@bastion.com", Password: "supersecret12345!"}
		res, err := svc.Login(context.Background(), req)
		if err != nil {
			t.Errorf("expected success, got error: %v", err)
		}
		if res.Token == "" {
			t.Error("expected token")
		}
	})
	t.Run("Wrong Password", func(t *testing.T) {
		req := &auth.LoginRequest{Email: "existing@bastion.com", Password: "wrong_password"}
		_, err := svc.Login(context.Background(), req)
		if err == nil || err.Error() != "invalid email or password" {
			t.Errorf("expected invalid credentials error, got: %v", err)
		}
	})
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

	usersMap := make(map[string]*auth.User)
	usersMap[testUser.Email] = testUser

	userRepo := &mockUserRepo{users: usersMap}
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
