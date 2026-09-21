package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/event"
	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/agamlatiff/bastion/services/identity/security"
	"github.com/google/uuid"
)

var (
	ErrInvalidCredentials      = errors.New("invalid email or password")
	ErrAccountInactive         = errors.New("account is inactive or suspended")
	ErrInvalidToken            = errors.New("invalid or expired token")
	ErrTokenRevoked            = errors.New("token has been revoked")
	ErrTokenReused             = errors.New("token reuse detected, session terminated")
	ErrTwoFactorAlreadyEnabled = errors.New("two-factor authentication is already enabled")
	ErrTwoFactorNotEnabled     = errors.New("two-factor authentication is not enabled")
	ErrInvalidTwoFactorCode    = errors.New("invalid two-factor authentication code")
	ErrInvalidTempToken        = errors.New("invalid or expired two-factor challenge token")
)

// AuthConfig holds configuration specific to the authentication service domain.
type AuthConfig struct {
	JWTSecret              string
	AccessTokenExpiryMins  int
	RefreshTokenExpiryDays int
	EncryptionKey          string
}

// AuthService defines the business logic operations for authentication and identity.
type AuthService interface {
	Register(ctx context.Context, req domain.RegisterRequest, requestID, ip string) (*domain.UserResponse, error)
	Login(ctx context.Context, req domain.LoginRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error)
	RefreshToken(ctx context.Context, refreshToken, requestID, ip, userAgent string) (*domain.AuthResponse, error)
	Logout(ctx context.Context, refreshToken, requestID, ip string) error
	Setup2FA(ctx context.Context, userID uuid.UUID) (*domain.TwoFactorSetupResponse, error)
	Enable2FA(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error
	Disable2FA(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error
	Verify2FALogin(ctx context.Context, req domain.TwoFactorVerifyRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error)
}

type authService struct {
	repo    repository.Repository
	authCfg AuthConfig
}

// NewAuthService creates a new instance of AuthService with domain-scoped configuration.
func NewAuthService(repo repository.Repository, authCfg AuthConfig) AuthService {
	return &authService{
		repo:    repo,
		authCfg: authCfg,
	}
}

// Register registers a new user with default CUSTOMER role and Argon2id hashed password, persisting outbox event atomically.
func (s *authService) Register(ctx context.Context, req domain.RegisterRequest, requestID, ip string) (*domain.UserResponse, error) {
	// 1. Normalize email address and generate Argon2id password hash
	email := strings.ToLower(strings.TrimSpace(req.Email))

	hash, err := security.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// 2. Construct user entity with default customer role
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

	// 3. Prepare domain event envelope for reliable outbox publishing
	envelope := event.EventEnvelope{
		EventID:       uuid.New().String(),
		EventType:     "UserRegistered",
		EventVersion:  "1.0",
		CorrelationID: requestID,
		Timestamp:     now,
		Data: event.UserRegisteredPayload{
			UserID: user.ID.String(),
			Email:  user.Email,
			Role:   "CUSTOMER",
			Status: string(user.Status),
		},
	}

	payloadBytes, err := json.Marshal(envelope)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal outbox event payload: %w", err)
	}

	outboxEvt := &domain.OutboxEvent{
		ID:            uuid.New(),
		AggregateType: "USER",
		AggregateID:   user.ID,
		EventType:     "UserRegistered",
		Payload:       payloadBytes,
		Status:        domain.OutboxStatusPending,
		RetryCount:    0,
		CreatedAt:     now,
	}

	// 4. Save user and outbox event in the same ACID transaction
	if err := s.repo.CreateUser(ctx, user, outboxEvt); err != nil {
		return nil, err
	}

	// 5. Record immutable security audit event
	s.repo.LogSecurityAudit(ctx, &user.ID, "USER_REGISTERED", requestID, ip)

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
	// 1. Normalize input email and retrieve user entity
	email := strings.ToLower(strings.TrimSpace(req.Email))

	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// 2. Verify password against Argon2id hash
	valid, err := security.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !valid {
		s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_FAILED_BAD_PASSWORD", requestID, ip)
		return nil, ErrInvalidCredentials
	}

	// 3. Verify account active status
	if user.Status != domain.StatusActive {
		s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_FAILED_INACTIVE_ACCOUNT", requestID, ip)
		return nil, ErrAccountInactive
	}

	// 4. Handle 2FA challenge branch if enabled
	if user.TwoFactorEnabled {
		tempToken, err := security.Generate2FATempToken(user.ID.String(), user.Email, s.authCfg.JWTSecret)
		if err != nil {
			return nil, fmt.Errorf("failed to generate 2fa challenge token: %w", err)
		}
		s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_2FA_CHALLENGE_ISSUED", requestID, ip)
		return &domain.AuthResponse{
			TwoFactorRequired: true,
			TempToken:         tempToken,
			User: domain.UserResponse{
				ID:        user.ID,
				Email:     user.Email,
				Status:    user.Status,
				Roles:     user.Roles,
				CreatedAt: user.CreatedAt,
			},
		}, nil
	}

	// 5. Generate cryptographic JWT access and refresh token pair with multi-role claims
	tokenPair, err := security.GenerateTokenPair(
		user.ID.String(),
		user.Email,
		user.Roles,
		s.authCfg.JWTSecret,
		s.authCfg.AccessTokenExpiryMins,
		s.authCfg.RefreshTokenExpiryDays,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token pair: %w", err)
	}

	// 7. Hash refresh token & persist active session to database
	tokenHash := security.HashRefreshToken(tokenPair.RefreshToken)
	now := time.Now().UTC()
	session := &domain.Session{
		ID:               uuid.New(),
		UserID:           user.ID,
		RefreshTokenHash: tokenHash,
		DeviceID:         req.DeviceID,
		UserAgent:        stringPtr(userAgent),
		IPAddress:        stringPtr(ip),
		ExpiresAt:        now.Add(time.Duration(s.authCfg.RefreshTokenExpiryDays) * 24 * time.Hour),
		CreatedAt:        now,
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// 8. Record audit log and return full authentication response
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
	claims, err := security.ValidateToken(oldRefreshToken, s.authCfg.JWTSecret, security.TokenTypeRefresh)
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

	// 5. Issue new token pair preserving all user roles
	roles := claims.Roles
	if len(roles) == 0 && claims.Role != "" {
		roles = []string{claims.Role}
	}

	tokenPair, err := security.GenerateTokenPair(
		claims.UserID,
		claims.Email,
		roles,
		s.authCfg.JWTSecret,
		s.authCfg.AccessTokenExpiryMins,
		s.authCfg.RefreshTokenExpiryDays,
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
		ExpiresAt:        now.Add(time.Duration(s.authCfg.RefreshTokenExpiryDays) * 24 * time.Hour),
		CreatedAt:        now,
	}

	if err := s.repo.CreateSession(ctx, newSession); err != nil {
		return nil, fmt.Errorf("failed to store rotated session: %w", err)
	}

	// 7. Record token refresh audit event and return authentication response
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
			Roles:  roles,
		},
	}, nil
}

// Logout revokes the session associated with the provided refresh token.
func (s *authService) Logout(ctx context.Context, refreshToken, requestID, ip string) error {
	// 1. Compute SHA-256 hash of provided refresh token
	tokenHash := security.HashRefreshToken(refreshToken)

	// 2. Lookup session in database
	session, err := s.repo.GetSessionByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil // idempotent logout: don't error if session already gone
	}

	// 3. Mark session as revoked
	if err := s.repo.RevokeSession(ctx, session.ID); err != nil {
		return fmt.Errorf("failed to revoke session: %w", err)
	}

	// 4. Record security audit log
	s.repo.LogSecurityAudit(ctx, &session.UserID, "USER_LOGGED_OUT", requestID, ip)
	return nil
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
