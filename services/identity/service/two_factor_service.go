package service

import (
	"context"
	"fmt"
	"time"

	"github.com/agamlatiff/bastion/services/identity/domain"
	"github.com/agamlatiff/bastion/services/identity/security"
	"github.com/google/uuid"
)

// Setup2FA generates a new TOTP secret and saves it in pending state (enabled = false).
func (s *authService) Setup2FA(ctx context.Context, userID uuid.UUID) (*domain.TwoFactorSetupResponse, error) {
	// 1. Retrieve user and verify 2FA is not already enabled
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.TwoFactorEnabled {
		return nil, ErrTwoFactorAlreadyEnabled
	}

	// 2. Generate cryptographically secure raw TOTP secret
	rawSecret, err := security.GenerateTOTPSecret()
	if err != nil {
		return nil, fmt.Errorf("failed to generate totp secret: %w", err)
	}

	// 3. Parse AES-256 master encryption key from configuration
	encryptionKey, err := security.ParseEncryptionKey(s.authCfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key config: %w", err)
	}

	// 4. Encrypt raw TOTP secret before persisting to database
	encryptedSecret, err := security.Encrypt(rawSecret, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt totp secret: %w", err)
	}

	// 5. Persist encrypted secret with pending status (enabled = false)
	if err := s.repo.UpdateTwoFactor(ctx, userID, &encryptedSecret, false); err != nil {
		return nil, err
	}

	// 6. Generate standard TOTP QR code URI and return setup response
	qrCodeURI := security.GenerateTOTPURI(rawSecret, user.Email, "Bastion")
	return &domain.TwoFactorSetupResponse{
		Secret:    rawSecret,
		QRCodeURI: qrCodeURI,
	}, nil
}

// Enable2FA verifies the 6-digit TOTP code and marks 2FA as permanently enabled.
func (s *authService) Enable2FA(ctx context.Context, userID uuid.UUID, code string, requestID, ip string) error {
	// 1. Retrieve user profile and validate 2FA prerequisites
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

	// 2. Parse AES-256 encryption key from configuration
	encryptionKey, err := security.ParseEncryptionKey(s.authCfg.EncryptionKey)
	if err != nil {
		return fmt.Errorf("invalid encryption key config: %w", err)
	}

	// 3. Decrypt stored TOTP secret from database using AES-256
	rawSecret, err := security.Decrypt(*user.TwoFactorSecretEncrypted, encryptionKey)
	if err != nil {
		return fmt.Errorf("failed to decrypt totp secret: %w", err)
	}

	// 4. Validate the submitted 6-digit TOTP code against the decrypted secret
	if !security.ValidateTOTPCode(rawSecret, code) {
		s.repo.LogSecurityAudit(ctx, &userID, "2FA_ENABLE_FAILED_INVALID_CODE", requestID, ip)
		return ErrInvalidTwoFactorCode
	}

	// 5. Officially activate 2FA status in database (enabled = true)
	if err := s.repo.UpdateTwoFactor(ctx, userID, user.TwoFactorSecretEncrypted, true); err != nil {
		return err
	}

	// 6. Record immutable security audit log for compliance
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

	encryptionKey, err := security.ParseEncryptionKey(s.authCfg.EncryptionKey)
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
	// 1. Validate the short-lived 2FA challenge token (TempToken)
	claims, err := security.Validate2FATempToken(req.TempToken, s.authCfg.JWTSecret)
	if err != nil {
		return nil, ErrInvalidTempToken
	}

	// 2. Parse and verify user identity from token claims
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

	// 3. Parse AES-256 encryption key and decrypt stored TOTP secret
	encryptionKey, err := security.ParseEncryptionKey(s.authCfg.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key config: %w", err)
	}

	rawSecret, err := security.Decrypt(*user.TwoFactorSecretEncrypted, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt totp secret: %w", err)
	}

	// 4. Validate the submitted 6-digit TOTP OTP code
	if !security.ValidateTOTPCode(rawSecret, req.Code) {
		s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_2FA_FAILED_BAD_CODE", requestID, ip)
		return nil, ErrInvalidTwoFactorCode
	}

	// 5. Resolve user's primary role
	primaryRole := "CUSTOMER"
	if len(user.Roles) > 0 {
		primaryRole = user.Roles[0]
	}

	// 6. Issue full access and refresh token pair
	tokenPair, err := security.GenerateTokenPair(
		user.ID.String(),
		user.Email,
		primaryRole,
		s.authCfg.JWTSecret,
		s.authCfg.AccessTokenExpiryMins,
		s.authCfg.RefreshTokenExpiryDays,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token pair: %w", err)
	}

	// 7. Hash the refresh token & persist active session to database
	tokenHash := security.HashRefreshToken(tokenPair.RefreshToken)
	now := time.Now().UTC()
	session := &domain.Session{
		ID:               uuid.New(),
		UserID:           user.ID,
		RefreshTokenHash: tokenHash,
		UserAgent:        stringPtr(userAgent),
		IPAddress:        stringPtr(ip),
		ExpiresAt:        now.Add(time.Duration(s.authCfg.RefreshTokenExpiryDays) * 24 * time.Hour),
		CreatedAt:        now,
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// 8. Record audit log and return full authentication response
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
