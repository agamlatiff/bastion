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
	ErrInvalidCredentials     = errors.New("invalid email or password")
	ErrAccountInactive        = errors.New("account is inactive or suspended")
	ErrInvalidToken           = errors.New("invalid or expired token")
	ErrTokenRevoked           = errors.New("token has been revoked")
	ErrTokenReused            = errors.New("token reuse detected, session terminated")
	ErrTwoFactorAlreadyEnabled = errors.New("two-factor authentication is already enabled")
	ErrTwoFactorNotEnabled     = errors.New("two-factor authentication is not enabled")
	ErrInvalidTwoFactorCode    = errors.New("invalid two-factor authentication code")
	ErrInvalidTempToken        = errors.New("invalid or expired two-factor challenge token")
)

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

	// If 2FA is enabled, issue short-lived challenge token instead of full session
	if user.TwoFactorEnabled {
		tempToken, err := security.Generate2FATempToken(user.ID.String(), user.Email, s.cfg.JWTSecret)
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

// Setup2FA generates a new TOTP secret and saves it in pending state (enabled = false).
func (s *authService) Setup2FA(ctx context.Context, userID uuid.UUID) (*domain.TwoFactorSetupResponse, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.TwoFactorEnabled {
		return nil, ErrTwoFactorAlreadyEnabled
	}

	rawSecret, err := security.GenerateTOTPSecret()
	if err != nil {
		return nil, fmt.Errorf("failed to generate totp secret: %w", err)
	}

	encryptionKey, err := security.ParseEncryptionKey(s.cfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key config: %w", err)
	}

	encryptedSecret, err := security.Encrypt(rawSecret, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt totp secret: %w", err)
	}

	if err := s.repo.UpdateTwoFactor(ctx, userID, &encryptedSecret, false); err != nil {
		return nil, err
	}

	qrCodeURI := security.GenerateTOTPURI(rawSecret, user.Email, "Bastion")
	return &domain.TwoFactorSetupResponse{
		Secret:    rawSecret,
		QRCodeURI: qrCodeURI,
	}, nil
}

// Enable2FA verifies the 6-digit TOTP code and marks 2FA as permanently enabled.
func (s *authService) Enable2FA(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	if user.TwoFactorEnabled {
		return ErrTwoFactorAlreadyEnabled
	}
	if user.TwoFactorSecretEncrypted == nil || *user.TwoFactorSecretEncrypted == "" {
		return ErrTwoFactorNotEnabled
	}

	encryptionKey, err := security.ParseEncryptionKey(s.cfg.EncryptionKey)
	if err != nil {
		return fmt.Errorf("invalid encryption key config: %w", err)
	}

	rawSecret, err := security.Decrypt(*user.TwoFactorSecretEncrypted, encryptionKey)
	if err != nil {
		return fmt.Errorf("failed to decrypt totp secret: %w", err)
	}

	if !security.ValidateTOTPCode(rawSecret, code) {
		s.repo.LogSecurityAudit(ctx, &userID, "2FA_ENABLE_FAILED_INVALID_CODE", requestID, ip)
		return ErrInvalidTwoFactorCode
	}

	if err := s.repo.UpdateTwoFactor(ctx, userID, user.TwoFactorSecretEncrypted, true); err != nil {
		return err
	}

	s.repo.LogSecurityAudit(ctx, &userID, "2FA_ENABLED", requestID, ip)
	return nil
}

// Disable2FA validates the 6-digit TOTP code and deactivates 2FA.
func (s *authService) Disable2FA(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}
	if !user.TwoFactorEnabled || user.TwoFactorSecretEncrypted == nil {
		return ErrTwoFactorNotEnabled
	}

	encryptionKey, err := security.ParseEncryptionKey(s.cfg.EncryptionKey)
	if err != nil {
		return fmt.Errorf("invalid encryption key config: %w", err)
	}

	rawSecret, err := security.Decrypt(*user.TwoFactorSecretEncrypted, encryptionKey)
	if err != nil {
		return fmt.Errorf("failed to decrypt totp secret: %w", err)
	}

	if !security.ValidateTOTPCode(rawSecret, code) {
		s.repo.LogSecurityAudit(ctx, &userID, "2FA_DISABLE_FAILED_INVALID_CODE", requestID, ip)
		return ErrInvalidTwoFactorCode
	}

	if err := s.repo.UpdateTwoFactor(ctx, userID, nil, false); err != nil {
		return err
	}

	s.repo.LogSecurityAudit(ctx, &userID, "2FA_DISABLED", requestID, ip)
	return nil
}

// Verify2FALogin verifies a temporary 2FA challenge token + 6-digit OTP and issues full tokens.
func (s *authService) Verify2FALogin(ctx context.Context, req domain.TwoFactorVerifyRequest, requestID, ip, userAgent string) (*domain.AuthResponse, error) {
	claims, err := security.Validate2FATempToken(req.TempToken, s.cfg.JWTSecret)
	if err != nil {
		return nil, ErrInvalidTempToken
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, ErrInvalidTempToken
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if !user.TwoFactorEnabled || user.TwoFactorSecretEncrypted == nil {
		return nil, ErrTwoFactorNotEnabled
	}

	encryptionKey, err := security.ParseEncryptionKey(s.cfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key config: %w", err)
	}

	rawSecret, err := security.Decrypt(*user.TwoFactorSecretEncrypted, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt totp secret: %w", err)
	}

	if !security.ValidateTOTPCode(rawSecret, req.Code) {
		s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_2FA_FAILED_BAD_CODE", requestID, ip)
		return nil, ErrInvalidTwoFactorCode
	}

	primaryRole := "CUSTOMER"
	if len(user.Roles) > 0 {
		primaryRole = user.Roles[0]
	}

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

	tokenHash := security.HashRefreshToken(tokenPair.RefreshToken)
	now := time.Now().UTC()
	session := &domain.Session{
		ID:               uuid.New(),
		UserID:           user.ID,
		RefreshTokenHash: tokenHash,
		UserAgent:        stringPtr(userAgent),
		IPAddress:        stringPtr(ip),
		ExpiresAt:        now.Add(time.Duration(s.cfg.RefreshTokenExpiryDays) * 24 * time.Hour),
		CreatedAt:        now,
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_2FA_SUCCESS", requestID, ip)

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

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

