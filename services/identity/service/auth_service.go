package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agamlatiff/bastion/services/identity/config"
	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/event"
	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/agamlatiff/bastion/services/identity/security"
	"github.com/google/uuid"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrAccountInactive    = errors.New("account is inactive or suspended")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrTokenRevoked       = errors.New("token has been revoked")
	ErrTokenReused        = errors.New("token reuse detected, session terminated")
)

// AuthService defines the business logic operations for authentication and identity.
type AuthService interface {
	Register(ctx context.Context, req domain.RegisterRequest, requestID, ip string) (*domain.UserResponse, error)
	Login(ctx context.Context, req domain.LoginRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error)
	RefreshToken(ctx context.Context, refreshToken, requestID, ip, userAgent string) (*domain.AuthResponse, error)
	Logout(ctx context.Context, refreshToken, requestID, ip string) error
}

type authService struct {
	repo     repository.Repository
	cfg      *config.Config
	producer event.EventProducer 
}

// NewAuthService creates a new instance of AuthService.
func NewAuthService(repo repository.Repository, cfg *config.Config, producer event.EventProducer) AuthService {
	return &authService{
		repo:     repo,
		cfg:      cfg,
		producer: producer,
	}
}

// Register registers a new user with default CUSTOMER role and Argon2id hashed password.
func (s *authService) Register(ctx context.Context, req domain.RegisterRequest, requestID, ip string) (*domain.UserResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now().UTC()
	user := &domain.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hash,
		Status:       domain.StatusActive,
		Roles:        []string{"CUSTOMER"},
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	// Record security audit event
	s.repo.LogSecurityAudit(ctx, &user.ID, "USER_REGISTERED", requestID, ip)

	// Publish UserRegistered event to Kafka
	if s.producer != nil {
		if err := s.producer.PublishUserRegistered(ctx, user.ID.String(), user.Email, "CUSTOMER", string(user.Status), requestID); err != nil {
			fmt.Printf("[EVENT WARN] failed to publish UserRegistered event: %v\n", err)
		}
	}

	return &domain.UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		Status:    user.Status,
		Roles:     user.Roles,
		CreatedAt: user.CreatedAt,
	}, nil
}

// Login verifies credentials and issues access & refresh tokens with session tracking.
func (s *authService) Login(ctx context.Context, req domain.LoginRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	valid, err := security.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !valid {
		s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_FAILED_BAD_PASSWORD", requestID, ip)
		return nil, ErrInvalidCredentials
	}

	if user.Status != domain.StatusActive {
		s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_FAILED_INACTIVE_ACCOUNT", requestID, ip)
		return nil, ErrAccountInactive
	}

	primaryRole := "CUSTOMER"
	if len(user.Roles) > 0 {
		primaryRole = user.Roles[0]
	}

	// 1. Generate token pair using configured expiration
	tokenPair, err := security.GenerateTokenPair(
		user.ID.String(),
		user.Email,
		primaryRole,
		s.cfg.JWTSecret,
		s.cfg.AccessTokenExpiryMins,
		s.cfg.RefreshTokenExpiryDays,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token pair: %w", err)
	}

	// 2. Hash refresh token & persist session
	tokenHash := security.HashRefreshToken(tokenPair.RefreshToken)
	now := time.Now().UTC()
	session := &domain.Session{
		ID:               uuid.New(),
		UserID:           user.ID,
		RefreshTokenHash: tokenHash,
		DeviceID:         req.DeviceID,
		UserAgent:        stringPtr(userAgent),
		IPAddress:        stringPtr(ip),
		ExpiresAt:        now.Add(time.Duration(s.cfg.RefreshTokenExpiryDays) * 24 * time.Hour),
		CreatedAt:        now,
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_SUCCESS", requestID, ip)

	return &domain.AuthResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    tokenPair.ExpiresInSeconds,
		User: domain.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			Status:    user.Status,
			Roles:     user.Roles,
			CreatedAt: user.CreatedAt,
		},
	}, nil
}

// RefreshToken handles token rotation and automatic reuse-attack detection.
func (s *authService) RefreshToken(ctx context.Context, oldRefreshToken, requestID, ip, userAgent string) (*domain.AuthResponse, error) {
	// 1. Validate JWT structure and signature
	claims, err := security.ValidateToken(oldRefreshToken, s.cfg.JWTSecret, security.TokenTypeRefresh)
	if err != nil {
		return nil, ErrInvalidToken
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// 2. Lookup session by SHA-256 hash
	tokenHash := security.HashRefreshToken(oldRefreshToken)
	session, err := s.repo.GetSessionByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// 3. Reuse detection: if revoked token is submitted, revoke ALL sessions (anti-theft)
	if session.RevokedAt != nil {
		_ = s.repo.RevokeAllUserSessions(ctx, session.UserID)
		s.repo.LogSecurityAudit(ctx, &session.UserID, "TOKEN_REUSE_DETECTED", requestID, ip)
		return nil, ErrTokenReused
	}

	if time.Now().UTC().After(session.ExpiresAt) {
		return nil, ErrInvalidToken
	}

	// 4. Mark old session as revoked (Rotation)
	if err := s.repo.RevokeSession(ctx, session.ID); err != nil {
		return nil, fmt.Errorf("failed to revoke old session: %w", err)
	}

	// 5. Issue new token pair
	tokenPair, err := security.GenerateTokenPair(
		claims.UserID,
		claims.Email,
		claims.Role,
		s.cfg.JWTSecret,
		s.cfg.AccessTokenExpiryMins,
		s.cfg.RefreshTokenExpiryDays,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate new token pair: %w", err)
	}

	// 6. Persist new session
	newTokenHash := security.HashRefreshToken(tokenPair.RefreshToken)
	now := time.Now().UTC()
	newSession := &domain.Session{
		ID:               uuid.New(),
		UserID:           userID,
		RefreshTokenHash: newTokenHash,
		DeviceID:         session.DeviceID,
		UserAgent:        stringPtr(userAgent),
		IPAddress:        stringPtr(ip),
		ExpiresAt:        now.Add(time.Duration(s.cfg.RefreshTokenExpiryDays) * 24 * time.Hour),
		CreatedAt:        now,
	}

	if err := s.repo.CreateSession(ctx, newSession); err != nil {
		return nil, fmt.Errorf("failed to store rotated session: %w", err)
	}

	s.repo.LogSecurityAudit(ctx, &userID, "TOKEN_REFRESHED", requestID, ip)

	return &domain.AuthResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    tokenPair.ExpiresInSeconds,
		User: domain.UserResponse{
			ID:     userID,
			Email:  claims.Email,
			Status: domain.StatusActive,
			Roles:  []string{claims.Role},
		},
	}, nil
}

// Logout revokes the session associated with the provided refresh token.
func (s *authService) Logout(ctx context.Context, refreshToken, requestID, ip string) error {
	tokenHash := security.HashRefreshToken(refreshToken)
	session, err := s.repo.GetSessionByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil // idempotent logout: don't error if session already gone
	}

	if err := s.repo.RevokeSession(ctx, session.ID); err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}

	s.repo.LogSecurityAudit(ctx, &session.UserID, "USER_LOGGED_OUT", requestID, ip)
	return nil
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
