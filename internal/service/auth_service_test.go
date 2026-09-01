package service

import (
	"context"
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

	svc := NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, "secret", 24)

	t.Run("Success", func(t *testing.T) {
		req := &dto.RegisterRequest{Email: "new@bastion.com", Password: "StrongPassword1!", FullName: "New User"}
		res, err := svc.Register(context.Background(), req)

		if err != nil {
			t.Errorf("expected success, got error: %v", err)
		}

		if res.Token == "" {
			t.Errorf("expected token, got empty string")
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
