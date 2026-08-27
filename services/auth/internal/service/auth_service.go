package service

import (
	"context"
	"errors"
	"github.com/agamlatiff/bastion/services/auth/internal/domain"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/agamlatiff/bastion/services/auth/internal/security"
	"github.com/redis/go-redis/v9"
	"time"
)

type AuthService interface {
	Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error)
	Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error)
	ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error)
	Logout(ctx context.Context, tokenStr string) error
}

type authService struct {
	userRepo       repository.UserRepository
	rdb            *redis.Client
	jwtSecret      string
	jwtExpiryHours int
}

func NewAuthService(userRepo repository.UserRepository,
	rdb *redis.Client,
	jwtSecret string,
	jwtExpiryHours int) AuthService {
	return &authService{
		userRepo:       userRepo,
		rdb:            rdb,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
	}
}

func (s *authService) Register(ctx context.Context, req domain.RegisterRequest) (*domain.AuthResponse, error) {

	// Checking email is already sign in database
	existingUser, _ := s.userRepo.FindByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, errors.New("Email already registered")
	}

	// Hash real password user used bcrypt library
	hashedPassword, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Create new object user
	newUser := &domain.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
		Tier:         "tier_1",
	}

	// Save the new user into database PostgreSQL
	if err := s.userRepo.Create(ctx, newUser); err != nil {
		return nil, err
	}

	// Wallet automaticly create when user has been registered
	if err := s.userRepo.CreateWallet(ctx, newUser.ID); err != nil {
		return nil, err
	}

	// Create JWT Token for new user
	tokenStr, _, err := security.GenerateToken(newUser.ID, newUser.Email, newUser.Tier, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: tokenStr,
		User:  newUser.ToUserResponse(),
	}, nil
}

func (s *authService) Login(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error) {

	errMessage := "Invalid email or password"

	// Check email is already in database
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New(errMessage)
	}

	// Compare password input with password database (hash)
	if err := security.ComparePassword(user.PasswordHash, req.Password); err != nil {
		return nil, errors.New(errMessage)
	}

	// If password matches, create new JWT Token
	tokenStr, _, err := security.GenerateToken(user.ID, user.Email, user.Tier, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: tokenStr,
		User:  user.ToUserResponse(),
	}, nil
}

func (s *authService) ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error) {
	claims, err := security.ParseAndValidateToken(tokenStr, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	// Checking is token already ever to logout (blacklist)
	blacklisted, _ := s.rdb.Get(ctx, "blacklist:jti:"+claims.ID).Result()
	if blacklisted != "" {
		return nil, errors.New("Token has been logged out")
	}

	// Get profile new user data from database
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

	// Set blacklist token if still have a time
	return s.rdb.Set(ctx, "blacklist:jti:"+claims.ID, "revoked", remainingDuration).Err()
}
