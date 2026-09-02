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

func (m *mockUserRepo) UpdateTwoFactor(ctx context.Context, db repository.DBTX, userID string, secret *string, enabled bool) error {
	for _, u := range m.users {
		if u.ID == userID {
			u.TwoFactorSecret = secret
			u.IsTwoFactorEnabled = enabled
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
		ID:              "wallet_" + userID,
		UserID:          userID,
		Balance:         0,
		Currency:        "IDR",
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

func (m *mockWalletRepo) GetBalanceForUpdate(ctx context.Context, db repository.DBTX, walletID string) (balance int64, maxLimit int64, err error) {
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

func (m *mockWalletRepo) UpdateMaxLimit(ctx context.Context, db repository.DBTX, userID string, newMaxLimit int64) error {
	if w, ok := m.wallets[userID]; ok {
		w.MaxBalanceLimit = newMaxLimit
		return nil
	}
	return domain.ErrWalletNotFound
}

func TestAuthService_Register(t *testing.T) {
	userRepo := &mockUserRepo{users: make(map[string]*domain.User)}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	blacklistRepo := &mockTokenBlacklistRepo{revokedTokens: make(map[string]bool)}
	refreshRepo := newMockRefreshTokenRepo()
	transactor := &mockTransactor{}
	encKey := []byte("01234567890123456789012345678901")

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, "super_secret_jwt_key_1234567890", 24, encKey)

	t.Run("Success", func(t *testing.T) {
		req := &dto.RegisterRequest{
			Email:    "test@example.com",
			Password: "Password123!",
			FullName: "John Doe",
		}

		res, err := svc.Register(context.Background(), req)
		if err != nil {
			t.Fatalf("expected success, got error: %v", err)
		}

		if res.AccessToken == "" {
			t.Errorf("expected access token, got empty")
		}

		if res.RefreshToken == "" {
			t.Errorf("expected refresh token, got empty")
		}

		if res.User.Email != "test@example.com" {
			t.Errorf("expected email test@example.com, got %s", res.User.Email)
		}
	})

	t.Run("Duplicate Email Error", func(t *testing.T) {
		req := &dto.RegisterRequest{
			Email:    "test@example.com",
			Password: "Password123!",
			FullName: "John Doe",
		}

		_, err := svc.Register(context.Background(), req)
		if err != domain.ErrEmailAlreadyExists {
			t.Errorf("expected ErrEmailAlreadyExists, got %v", err)
		}
	})

	t.Run("Weak Password Error", func(t *testing.T) {
		req := &dto.RegisterRequest{
			Email:    "weak@example.com",
			Password: "123",
			FullName: "John Doe",
		}

		_, err := svc.Register(context.Background(), req)
		if err == nil {
			t.Errorf("expected error for weak password, got nil")
		}
	})
}

func TestAuthService_RefreshToken(t *testing.T) {
	usersMap := make(map[string]*domain.User)
	user := &domain.User{
		ID:    "usr_123",
		Email: "refresh@example.com",
		Tier:  domain.Tier1,
	}
	usersMap[user.Email] = user
	usersMap[user.ID] = user

	userRepo := &mockUserRepo{users: usersMap}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	blacklistRepo := &mockTokenBlacklistRepo{revokedTokens: make(map[string]bool)}
	refreshRepo := newMockRefreshTokenRepo()
	transactor := &mockTransactor{}
	jwtSecret := "super_secret_jwt_key_1234567890"
	encKey := []byte("01234567890123456789012345678901")

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, jwtSecret, 24, encKey)

	t.Run("Successful Refresh & Rotation", func(t *testing.T) {
		_, initialRefreshToken, _, initialRefreshClaims, err := security.GenerateTokenPair(
			user.ID,
			user.Email,
			user.Tier,
			jwtSecret,
			15*time.Minute,
			7*24*time.Hour,
		)
		if err != nil {
			t.Fatalf("failed to generate initial token pair: %v", err)
		}

		_ = refreshRepo.Store(context.Background(), user.ID, initialRefreshClaims.ID, 7*24*time.Hour)

		res, err := svc.RefreshToken(context.Background(), initialRefreshToken)
		if err != nil {
			t.Fatalf("expected refresh to succeed, got error: %v", err)
		}

		if res.AccessToken == "" || res.RefreshToken == "" {
			t.Errorf("expected new access and refresh tokens, got empty")
		}

		if res.RefreshToken == initialRefreshToken {
			t.Errorf("expected rotated refresh token to be different from old refresh token")
		}

		oldActive, _ := refreshRepo.IsActive(context.Background(), user.ID, initialRefreshClaims.ID)
		if oldActive {
			t.Errorf("expected old refresh token to be invalidated/revoked from Redis")
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
	encKey := []byte("01234567890123456789012345678901")

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, "secret", 24, encKey)

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

func TestAuthService_TwoFactorAuth(t *testing.T) {
	usersMap := make(map[string]*domain.User)
	passHash, _ := security.HashPassword("Password123!")
	user := &domain.User{
		ID:           "usr_2fa_1",
		Email:        "totpuser@bastion.com",
		PasswordHash: string(passHash),
	}
	usersMap[user.Email] = user
	usersMap[user.ID] = user

	userRepo := &mockUserRepo{users: usersMap}
	walletRepo := &mockWalletRepo{wallets: make(map[string]*domain.Wallet)}
	blacklistRepo := &mockTokenBlacklistRepo{revokedTokens: make(map[string]bool)}
	refreshRepo := newMockRefreshTokenRepo()
	transactor := &mockTransactor{}
	encKey := []byte("01234567890123456789012345678901")
	jwtSecret := "super_secret_jwt_key_1234567890"

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, jwtSecret, 24, encKey)

	var rawSecret string

	t.Run("Setup 2FA Success", func(t *testing.T) {
		setupRes, err := svc.Setup2FA(context.Background(), "usr_2fa_1")
		if err != nil {
			t.Fatalf("expected setup 2fa success, got error: %v", err)
		}

		if setupRes.Secret == "" || setupRes.QRCodeURI == "" {
			t.Errorf("expected secret and qr code uri, got empty")
		}

		rawSecret = setupRes.Secret
		if user.TwoFactorSecret == nil {
			t.Errorf("expected encrypted secret in DB")
		}
		if user.IsTwoFactorEnabled {
			t.Errorf("2FA should not be enabled until verified with code")
		}
	})

	t.Run("Enable 2FA with Invalid Code Fails", func(t *testing.T) {
		err := svc.Enable2FA(context.Background(), "usr_2fa_1", "000000")
		if err != domain.ErrInvalidTwoFactorCode {
			t.Errorf("expected ErrInvalidTwoFactorCode, got %v", err)
		}
	})

	t.Run("Enable 2FA Success with Valid Code", func(t *testing.T) {
		validCode, err := security.GenerateTOTPCode(rawSecret, time.Now())
		if err != nil {
			t.Fatalf("failed to generate valid TOTP code: %v", err)
		}

		err = svc.Enable2FA(context.Background(), "usr_2fa_1", validCode)
		if err != nil {
			t.Fatalf("expected enable 2fa success, got error: %v", err)
		}

		if !user.IsTwoFactorEnabled {
			t.Errorf("expected 2FA to be enabled")
		}
	})

	t.Run("Login with 2FA Enabled Returns Challenge", func(t *testing.T) {
		loginRes, err := svc.Login(context.Background(), &dto.LoginRequest{
			Email:    "totpuser@bastion.com",
			Password: "Password123!",
		})
		if err != nil {
			t.Fatalf("expected login challenge success, got error: %v", err)
		}

		if !loginRes.TwoFactorRequired {
			t.Errorf("expected TwoFactorRequired true")
		}
		if loginRes.TempToken == "" {
			t.Errorf("expected TempToken in challenge response")
		}

		// Verify 2FA Login Challenge
		validCode, _ := security.GenerateTOTPCode(rawSecret, time.Now())
		verifyRes, err := svc.Verify2FALogin(context.Background(), &dto.Verify2FALoginRequest{
			TempToken: loginRes.TempToken,
			Code:      validCode,
		})
		if err != nil {
			t.Fatalf("expected 2FA login verification success, got error: %v", err)
		}

		if verifyRes.AccessToken == "" || verifyRes.RefreshToken == "" {
			t.Errorf("expected AccessToken and RefreshToken after 2FA verification")
		}
	})

	t.Run("Disable 2FA Success", func(t *testing.T) {
		validCode, _ := security.GenerateTOTPCode(rawSecret, time.Now())
		err := svc.Disable2FA(context.Background(), "usr_2fa_1", validCode)
		if err != nil {
			t.Fatalf("expected disable 2fa success, got error: %v", err)
		}

		if user.IsTwoFactorEnabled {
			t.Errorf("expected 2FA to be disabled")
		}
	})
}
