package service

import (
	"context"
	"errors"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/dto"
	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/agamlatiff/bastion/internal/repository"
)

type AuthService interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error)
	ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error)
	Logout(ctx context.Context, tokenStr string) error
}

type authService struct {
	transactor     repository.Transactor
	userRepo       repository.UserRepository
	walletRepo     repository.WalletRepository
	blacklistRepo  repository.TokenBlacklistRepository
	jwtSecret      string
	jwtExpiryHours int
}

func NewAuthService(
	transactor repository.Transactor,
	userRepo repository.UserRepository,
	walletRepo repository.WalletRepository,
	blacklistRepo repository.TokenBlacklistRepository,
	jwtSecret string,
	jwtExpiryHours int,
) AuthService {
	return &authService{
		transactor:     transactor,
		userRepo:       userRepo,
		walletRepo:     walletRepo,
		blacklistRepo:  blacklistRepo,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
	}
}

func (s *authService) Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error) {
	// Step 1: Validate password security strength rules (length, complexity)
	if err := security.ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	// Step 2: Check if email is already registered in the system
	existingUser, err := s.userRepo.FindByEmail(ctx, s.transactor.DB(), req.Email)
	if err != nil && !errors.Is(err, domain.ErrUserNotFound) {
		return nil, err
	}
	if existingUser != nil {
		return nil, domain.ErrEmailAlreadyExists
	}

	// Step 3: Hash plain password using Bcrypt
	hashedPassword, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Step 4: Map request DTO to User domain entity
	newUser := req.ToUser(string(hashedPassword))

	// Step 5: Atomically create User and their initial default Wallet within a database transaction
	err = s.transactor.WithTx(ctx, func(db repository.DBTX) error {
		// 5a. Insert user record into `users` table
		if err := s.userRepo.Create(ctx, db, newUser); err != nil {
			return err
		}

		// 5b. Insert associated wallet record into `wallets` table
		if err := s.walletRepo.Create(ctx, db, newUser.ID); err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Step 6: Generate signed JWT access token for immediate authentication
	tokenStr, _, err := security.GenerateToken(newUser.ID, newUser.Email, newUser.Tier, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return nil, err
	}

	// Step 7: Return sanitized authentication response (never exposing password hash)
	return &dto.AuthResponse{
		Token: tokenStr,
		User:  dto.ToUserResponse(newUser),
	}, nil
}

func (s *authService) Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error) {
	// Step 1: Retrieve user by email from repository
	user, err := s.userRepo.FindByEmail(ctx, s.transactor.DB(), req.Email)
	if err != nil {
		if errors.Is(err, domain.ErrUserNotFound) {
			return nil, domain.ErrInvalidCredentials
		}
		return nil, err
	}

	// Step 2: Compare input password against stored Bcrypt hash
	if err := security.ComparePassword(user.PasswordHash, req.Password); err != nil {
		return nil, domain.ErrInvalidCredentials
	}

	// Step 3: Generate signed JWT access token
	tokenStr, _, err := security.GenerateToken(user.ID, user.Email, user.Tier, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return nil, err
	}

	// Step 4: Return authentication response with sanitized user data
	return &dto.AuthResponse{
		Token: tokenStr,
		User:  dto.ToUserResponse(user),
	}, nil
}

func (s *authService) ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error) {
	// Step 1: Parse and verify JWT signature & expiration claims
	claims, err := security.ParseAndValidateToken(tokenStr, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	// Step 2: Check token blacklist repository to ensure the token hasn't been logged out
	isRevoked, err := s.blacklistRepo.IsRevoked(ctx, claims.ID)
	if err != nil {
		return nil, err
	}
	if isRevoked {
		return nil, domain.ErrTokenRevoked
	}

	// Step 3: Fetch active user record from repository
	return s.userRepo.FindByID(ctx, s.transactor.DB(), claims.UserID)
}

func (s *authService) Logout(ctx context.Context, tokenStr string) error {
	// Step 1: Parse token to extract JTI (JWT ID) and expiration time
	claims, err := security.ParseAndValidateToken(tokenStr, s.jwtSecret)
	if err != nil {
		return err
	}

	// Step 2: Calculate remaining token lifetime
	remainingDuration := time.Until(claims.ExpiresAt.Time)
	if remainingDuration <= 0 {
		return nil
	}

	// Step 3: Revoke token in blacklist repository
	return s.blacklistRepo.Revoke(ctx, claims.ID, remainingDuration)
}
