package service

import (
	"context"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/agamlatiff/bastion/internal/repository"
	"github.com/redis/go-redis/v9"
)

type AuthService interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error)
	ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error)
	Logout(ctx context.Context, tokenStr string) error
}

type authService struct {
	userRepo       repository.UserRepository
	rdb            *redis.Client
	jwtSecret      string
	jwtExpiryHours int
}

func NewAuthService(userRepo repository.UserRepository, rdb *redis.Client, jwtSecret string, jwtExpiryHours int) AuthService {
	return &authService{
		userRepo:       userRepo,
		rdb:            rdb,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
	}
}

func (s *authService) Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error) {
	if err := security.ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	existingUser, _ := s.userRepo.FindByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	hashedPassword, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	newUser := req.ToUser(string(hashedPassword))

	if err := s.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}

	if err := s.userRepo.CreateWallet(ctx, newUser.ID); err != nil {
		return nil, err
	}

	tokenStr, _, err := security.GenerateToken(newUser.ID, newUser.Email, newUser.Tier, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: tokenStr,
		User:  dto.ToUserResponse(newUser),
	}, nil
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := security.ComparePassword(user.PasswordHash, req.Password); err != nil {
		return nil, errors.New("invalid email or password")
	}

	tokenStr, _, err := security.GenerateToken(user.ID, user.Email, user.Tier, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: tokenStr,
		User:  dto.ToUserResponse(user),
	}, nil
}

func (s *authService) ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error) {
	claims, err := security.ParseAndValidateToken(tokenStr, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	blacklisted, _ := s.rdb.Get(ctx, "blacklist:jti:"+claims.ID).Result()
	if blacklisted != "" {
		return nil, errors.New("token has been logged out")
	}

	return s.userRepo.FindByID(ctx, claims.UserID)
}

func (s *authService) Logout(ctx context.Context, tokenStr string) error {
	claims, err := security.ParseAndValidateToken(tokenStr, s.jwtSecret)
	if err != nil {
		return err
	}

	remainingDuration := time.Until(claims.ExpiresAt.Time)
	if remainingDuration <= 0 {
		return nil
	}

	return s.rdb.Set(ctx, "blacklist:jti:"+claims.ID, "revoked", remainingDuration).Err()
}
