package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/agamlatiff/bastion/internal/repository"
)

type mockTransactor struct{}

func (m *mockTransactor) WithTx(ctx context.Context, fn func(tx repository.DBTX) error) error {
	return fn(nil)
}

func (m *mockTransactor) DB() repository.DBTX {
	return nil
}

type mockTokenBlacklistRepo struct {
	revokedTokens map[string]bool
}

func (m *mockTokenBlacklistRepo) Revoke(ctx context.Context, jti string, ttl time.Duration) error {
	m.revokedTokens[jti] = true
	return nil
}

func (m *mockTokenBlacklistRepo) IsRevoked(ctx context.Context, jti string) (bool, error) {
	return m.revokedTokens[jti], nil
}

type mockRefreshTokenRepo struct {
	tokens map[string]bool
}

func newMockRefreshTokenRepo() *mockRefreshTokenRepo {
	return &mockRefreshTokenRepo{tokens: make(map[string]bool)}
}

func (m *mockRefreshTokenRepo) Store(ctx context.Context, userID, tokenID string, ttl time.Duration) error {
	m.tokens[userID+":"+tokenID] = true
	return nil
}

func (m *mockRefreshTokenRepo) IsActive(ctx context.Context, userID, tokenID string) (bool, error) {
	return m.tokens[userID+":"+tokenID], nil
}

func (m *mockRefreshTokenRepo) Revoke(ctx context.Context, userID, tokenID string) error {
	delete(m.tokens, userID+":"+tokenID)
	return nil
}

func (m *mockRefreshTokenRepo) RevokeAllForUser(ctx context.Context, userID string) error {
	for k := range m.tokens {
		if len(k) > len(userID) && k[:len(userID)] == userID {
			delete(m.tokens, k)
		}
	}
	return nil
}

type mockUserRepo struct {
	users map[string]*domain.User
}

func (m *mockUserRepo) Create(ctx context.Context, db repository.DBTX, user *domain.User) error {
	m.users[user.Email] = user
	return nil
}

func (m *mockUserRepo) FindByEmail(ctx context.Context, db repository.DBTX, email string) (*domain.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) FindByID(ctx context.Context, db repository.DBTX, id string) (*domain.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, domain.ErrUserNotFound
}

func (m *mockUserRepo) UpdateTierAndVerification(ctx context.Context, db repository.DBTX, userID string, tier string, isVerified bool) error {
	for _, u := range m.users {
		if u.ID == userID {
			u.Tier = tier
			u.IsVerified = isVerified
			return nil
		}
	}
	return domain.ErrUserNotFound
}

func (m *mockUserRepo) UpdatePIN(ctx context.Context, db repository.DBTX, userID string, pinHash string) error {
	for _, u := range m.users {
		if u.ID == userID {
			u.PINHash = &pinHash
			return nil
		}
	}
	return domain.ErrUserNotFound
}

type mockWalletRepo struct {
	wallets map[string]*domain.Wallet
}

func (m *mockWalletRepo) Create(ctx context.Context, db repository.DBTX, userID string) error {
	m.wallets[userID] = &domain.Wallet{
		ID:              "wal_" + userID,
		UserID:          userID,
		Balance:         0,
		Currency:        domain.DefaultCurrency,
		MaxBalanceLimit: domain.Tier1MaxBalanceLimit,
	}
	return nil
}

func (m *mockWalletRepo) FindByUserID(ctx context.Context, db repository.DBTX, userID string) (*domain.Wallet, error) {
	if w, ok := m.wallets[userID]; ok {
		return w, nil
	}
	return nil, domain.ErrWalletNotFound
}

func (m *mockWalletRepo) FindByID(ctx context.Context, db repository.DBTX, walletID string) (*domain.Wallet, error) {
	for _, w := range m.wallets {
		if w.ID == walletID {
			return w, nil
		}
	}
	return nil, domain.ErrWalletNotFound
}

func (m *mockWalletRepo) GetBalanceForUpdate(ctx context.Context, db repository.DBTX, walletID string) (int64, int64, error) {
	for _, w := range m.wallets {
		if w.ID == walletID {
			return w.Balance, w.MaxBalanceLimit, nil
		}
	}
	return 0, 0, domain.ErrWalletNotFound
}

func (m *mockWalletRepo) UpdateBalance(ctx context.Context, db repository.DBTX, walletID string, newBalance int64) error {
	for _, w := range m.wallets {
		if w.ID == walletID {
			w.Balance = newBalance
			return nil
		}
	}
	return domain.ErrWalletNotFound
}

func (m *mockWalletRepo) UpdateMaxLimit(ctx context.Context, db repository.DBTX, userID string, maxLimit int64) error {
	if w, ok := m.wallets[userID]; ok {
		w.MaxBalanceLimit = maxLimit
		return nil
	}
	return domain.ErrWalletNotFound
}

func TestAuthService_Register(t *testing.T) {
	usersMap := make(map[string]*domain.User)
	walletsMap := make(map[string]*domain.Wallet)
	revokedMap := make(map[string]bool)
	refreshRepo := newMockRefreshTokenRepo()
	hashedPw, _ := security.HashPassword("KatakunciKuat123!")

	existingUser := &domain.User{
		ID:           "usr_123",
		Email:        "existing@bastion.com",
		PasswordHash: string(hashedPw),
	}

	usersMap[existingUser.Email] = existingUser
	userRepo := &mockUserRepo{users: usersMap}
	walletRepo := &mockWalletRepo{wallets: walletsMap}
	blacklistRepo := &mockTokenBlacklistRepo{revokedTokens: revokedMap}
	transactor := &mockTransactor{}

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, "secret", 24)

	t.Run("Success", func(t *testing.T) {
		req := &dto.RegisterRequest{Email: "new@bastion.com", Password: "StrongPassword1!", FullName: "New User"}
		res, err := svc.Register(context.Background(), req)

		if err != nil {
			t.Errorf("expected success, got error: %v", err)
		}

		if res.AccessToken == "" {
			t.Errorf("expected access token, got empty string")
		}

		if res.RefreshToken == "" {
			t.Errorf("expected refresh token, got empty string")
		}

		if res.User.Email != "new@bastion.com" {
			t.Errorf("expected email new@bastion.com, got %s", res.User.Email)
		}
	})

	t.Run("Duplicate Email Error", func(t *testing.T) {
		req := &dto.RegisterRequest{Email: "existing@bastion.com", Password: "StrongPassword1!", FullName: "Duplicate User"}
		_, err := svc.Register(context.Background(), req)

		if err == nil {
			t.Errorf("expected error duplicate email, got nil")
		}
	})

	t.Run("Weak Password Error", func(t *testing.T) {
		req := &dto.RegisterRequest{Email: "weak@bastion.com", Password: "123", FullName: "Weak User"}
		_, err := svc.Register(context.Background(), req)

		if err == nil {
			t.Errorf("expected error weak password, got nil")
		}
	})
}

func TestAuthService_RefreshToken(t *testing.T) {
	usersMap := make(map[string]*domain.User)
	refreshRepo := newMockRefreshTokenRepo()
	hashedPw, _ := security.HashPassword("KatakunciKuat123!")

	user := &domain.User{
		ID:           "usr_refresh_1",
		Email:        "refresh@bastion.com",
		PasswordHash: string(hashedPw),
		Tier:         domain.Tier1,
	}
	usersMap[user.Email] = user
	usersMap[user.ID] = user

	userRepo := &mockUserRepo{users: usersMap}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	blacklistRepo := &mockTokenBlacklistRepo{revokedTokens: make(map[string]bool)}
	transactor := &mockTransactor{}

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, "my_jwt_secret_key_123", 24)

	// Login to get valid token pair
	loginRes, err := svc.Login(context.Background(), &dto.LoginRequest{Email: "refresh@bastion.com", Password: "KatakunciKuat123!"})
	if err != nil {
		t.Fatalf("expected login success, got error: %v", err)
	}

	t.Run("Successful Refresh & Rotation", func(t *testing.T) {
		refreshedRes, err := svc.RefreshToken(context.Background(), loginRes.RefreshToken)
		if err != nil {
			t.Fatalf("expected refresh success, got error: %v", err)
		}

		if refreshedRes.AccessToken == "" || refreshedRes.RefreshToken == "" {
			t.Errorf("expected new access and refresh tokens")
		}

		if refreshedRes.RefreshToken == loginRes.RefreshToken {
			t.Errorf("expected refresh token to be rotated, but got the same token")
		}

		// Verify old refresh token is now invalidated (Reuse detection)
		_, reuseErr := svc.RefreshToken(context.Background(), loginRes.RefreshToken)
		if !errors.Is(reuseErr, domain.ErrTokenReuseDetected) {
			t.Errorf("expected ErrTokenReuseDetected on old token, got %v", reuseErr)
		}
	})

	t.Run("Invalid Refresh Token String", func(t *testing.T) {
		_, err := svc.RefreshToken(context.Background(), "invalid.token.string")
		if !errors.Is(err, domain.ErrInvalidRefreshToken) {
			t.Errorf("expected ErrInvalidRefreshToken, got %v", err)
		}
	})
}

func TestAuthService_PIN(t *testing.T) {
	usersMap := make(map[string]*domain.User)
	user := &domain.User{
		ID:    "usr_pin_1",
		Email: "pinuser@bastion.com",
	}
	usersMap[user.Email] = user
	usersMap[user.ID] = user

	userRepo := &mockUserRepo{users: usersMap}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	blacklistRepo := &mockTokenBlacklistRepo{revokedTokens: make(map[string]bool)}
	refreshRepo := newMockRefreshTokenRepo()
	transactor := &mockTransactor{}

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, "secret", 24)

	t.Run("SetPIN Success", func(t *testing.T) {
		err := svc.SetPIN(context.Background(), "usr_pin_1", "123456")
		if err != nil {
			t.Fatalf("expected set pin success, got error: %v", err)
		}
		if user.PINHash == nil {
			t.Errorf("expected pin hash to be set")
		}
	})

	t.Run("SetPIN Already Set Error", func(t *testing.T) {
		err := svc.SetPIN(context.Background(), "usr_pin_1", "654321")
		if err != domain.ErrPINAlreadySet {
			t.Errorf("expected ErrPINAlreadySet, got %v", err)
		}
	})

	t.Run("ChangePIN Success", func(t *testing.T) {
		err := svc.ChangePIN(context.Background(), "usr_pin_1", "123456", "654321")
		if err != nil {
			t.Fatalf("expected change pin success, got error: %v", err)
		}
	})

	t.Run("ChangePIN Invalid Old PIN Error", func(t *testing.T) {
		err := svc.ChangePIN(context.Background(), "usr_pin_1", "999999", "111111")
		if err != domain.ErrInvalidPIN {
			t.Errorf("expected ErrInvalidPIN, got %v", err)
		}
	})
}
