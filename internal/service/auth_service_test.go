package service

import (
	"context"
	"errors"
	"testing"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/redis/go-redis/v9"
)

type mockUserRepo struct {
	users map[string]*domain.User
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	m.users[user.Email] = user
	return nil
}
func (m *mockUserRepo) CreateWallet(ctx context.Context, userID string) error { return nil }
func (m *mockUserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	if u, ok := m.users[email]; ok {
		return u, nil
	}
	return nil, errors.New("not found")
}
func (m *mockUserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, errors.New("not found")
}

func TestAuthService_Register(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	usersMap := make(map[string]*domain.User)
	hashedPw, _ := security.HashPassword("KatakunciKuat123!")

	existingUser := &domain.User{
		ID:           "usr_123",
		Email:        "existing@bastion.com",
		PasswordHash: string(hashedPw),
	}

	usersMap[existingUser.Email] = existingUser
	repo := &mockUserRepo{users: usersMap}
	svc := NewAuthService(repo, rdb, "secret", 24)

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
