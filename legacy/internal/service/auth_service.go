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

// Token lifetime constants
const (
	AccessTokenDuration  = 15 * time.Minute      // Short-lived access token
	RefreshTokenDuration = 7 * 24 * time.Hour    // Long-lived refresh token (7 days)
)

type AuthService interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error)
	ValidateToken(ctx context.Context, tokenStr string) (*domain.User, error)
	Logout(ctx context.Context, tokenStr string) error
	RefreshToken(ctx context.Context, refreshTokenStr string) (*dto.AuthResponse, error)
	SetPIN(ctx context.Context, userID string, pin string) error
	ChangePIN(ctx context.Context, userID string, oldPIN, newPIN string) error
	Setup2FA(ctx context.Context, userID string) (*dto.TwoFactorSetupResponse, error)
	Enable2FA(ctx context.Context, userID, code string) error
	Disable2FA(ctx context.Context, userID, code string) error
	Verify2FALogin(ctx context.Context, req *dto.Verify2FALoginRequest) (*dto.AuthResponse, error)
}

type authService struct {
	transactor     repository.Transactor
	userRepo       repository.UserRepository
	walletRepo     repository.WalletRepository
	blacklistRepo  repository.TokenBlacklistRepository
	refreshRepo    repository.RefreshTokenRepository
	jwtSecret      string
	jwtExpiryHours int
	encryptionKey  []byte
}

func NewAuthService(
	transactor repository.Transactor,
	userRepo repository.UserRepository,
	walletRepo repository.WalletRepository,
	blacklistRepo repository.TokenBlacklistRepository,
	refreshRepo repository.RefreshTokenRepository,
	jwtSecret string,
	jwtExpiryHours int,
	encryptionKey []byte,
) AuthService {
	return &authService{
		transactor:     transactor,
		userRepo:       userRepo,
		walletRepo:     walletRepo,
		blacklistRepo:  blacklistRepo,
		refreshRepo:    refreshRepo,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
		encryptionKey:  encryptionKey,
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

	// Step 6: Generate signed Token Pair (Short-lived Access Token + Long-lived Refresh Token)
	accessToken, refreshToken, _, refreshClaims, err := security.GenerateTokenPair(
		newUser.ID,
		newUser.Email,
		newUser.Tier,
		s.jwtSecret,
		AccessTokenDuration,
		RefreshTokenDuration,
	)
	if err != nil {
		return nil, err
	}

	// Step 7: Store active refresh token ID in Redis repository
	if err := s.refreshRepo.Store(ctx, newUser.ID, refreshClaims.ID, RefreshTokenDuration); err != nil {
		return nil, err
	}

	// Step 8: Return authentication response with token pair
	return &dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         dto.ToUserResponse(newUser),
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

	// Step 3: Two-Factor Authentication Check
	if user.IsTwoFactorEnabled {
		tempToken, err := security.Generate2FATempToken(user.ID, user.Email, s.jwtSecret)
		if err != nil {
			return nil, err
		}
		return &dto.AuthResponse{
			TwoFactorRequired: true,
			TempToken:         tempToken,
		}, nil
	}

	// Step 4: Generate signed Token Pair
	accessToken, refreshToken, _, refreshClaims, err := security.GenerateTokenPair(
		user.ID,
		user.Email,
		user.Tier,
		s.jwtSecret,
		AccessTokenDuration,
		RefreshTokenDuration,
	)
	if err != nil {
		return nil, err
	}

	// Step 5: Store active refresh token ID in Redis repository
	if err := s.refreshRepo.Store(ctx, user.ID, refreshClaims.ID, RefreshTokenDuration); err != nil {
		return nil, err
	}

	// Step 6: Return authentication response with token pair
	return &dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         dto.ToUserResponse(user),
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

	// Step 3: Revoke all active refresh tokens for the user in Redis
	_ = s.refreshRepo.RevokeAllForUser(ctx, claims.UserID)

	// Step 4: Revoke access token in blacklist repository
	return s.blacklistRepo.Revoke(ctx, claims.ID, remainingDuration)
}

func (s *authService) RefreshToken(ctx context.Context, refreshTokenStr string) (*dto.AuthResponse, error) {
	// Step 1: Parse and validate refresh token signature & expiration
	claims, err := security.ParseAndValidateRefreshToken(refreshTokenStr, s.jwtSecret)
	if err != nil {
		return nil, domain.ErrInvalidRefreshToken
	}

	// Step 2: Check if this specific refresh token is still active in Redis
	isActive, err := s.refreshRepo.IsActive(ctx, claims.UserID, claims.ID)
	if err != nil {
		return nil, err
	}

	// Step 3: TOKEN REUSE DETECTION (Breach Prevention)
	if !isActive {
		_ = s.refreshRepo.RevokeAllForUser(ctx, claims.UserID)
		return nil, domain.ErrTokenReuseDetected
	}

	// Step 4: Fetch user data to ensure user is still active
	user, err := s.userRepo.FindByID(ctx, s.transactor.DB(), claims.UserID)
	if err != nil {
		return nil, domain.ErrUserNotFound
	}

	// Step 5: Invalidate/Revoke the used refresh token from Redis (One-Time-Use)
	if err := s.refreshRepo.Revoke(ctx, claims.UserID, claims.ID); err != nil {
		return nil, err
	}

	// Step 6: Generate a brand new Token Pair (Token Rotation)
	accessToken, refreshToken, _, newRefreshClaims, err := security.GenerateTokenPair(
		user.ID,
		user.Email,
		user.Tier,
		s.jwtSecret,
		AccessTokenDuration,
		RefreshTokenDuration,
	)
	if err != nil {
		return nil, err
	}

	// Step 7: Store the new rotated refresh token in Redis
	if err := s.refreshRepo.Store(ctx, user.ID, newRefreshClaims.ID, RefreshTokenDuration); err != nil {
		return nil, err
	}

	// Step 8: Return rotated token pair
	return &dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         dto.ToUserResponse(user),
	}, nil
}

func (s *authService) SetPIN(ctx context.Context, userID, pin string) error {
	// Step 1: Validate PIN is strictly 6 numeric digits
	if err := security.ValidatePIN(pin); err != nil {
		return domain.ErrInvalidPINFormat
	}

	// Step 2: Retrieve user and ensure PIN has not been previously set
	user, err := s.userRepo.FindByID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return err
	}
	if user.PINHash != nil && *user.PINHash != "" {
		return domain.ErrPINAlreadySet
	}

	// Step 3: Hash PIN using Bcrypt
	pinHash, err := security.HashPIN(pin)
	if err != nil {
		return err
	}

	// Step 4: Persist PIN hash into `users` table
	return s.userRepo.UpdatePIN(ctx, s.transactor.DB(), userID, pinHash)
}

func (s *authService) ChangePIN(ctx context.Context, userID, oldPIN, newPIN string) error {
	// Step 1: Validate new PIN format
	if err := security.ValidatePIN(newPIN); err != nil {
		return domain.ErrInvalidPINFormat
	}

	// Step 2: Prevent using the exact same PIN
	if oldPIN == newPIN {
		return domain.ErrSameOldAndNewPIN
	}

	// Step 3: Retrieve user and ensure PIN exists
	user, err := s.userRepo.FindByID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return err
	}
	if user.PINHash == nil || *user.PINHash == "" {
		return domain.ErrPINNotSet
	}

	// Step 4: Verify existing old PIN matches stored hash
	if err := security.ComparePIN(*user.PINHash, oldPIN); err != nil {
		return domain.ErrInvalidPIN
	}

	// Step 5: Hash new PIN and update
	newPINHash, err := security.HashPIN(newPIN)
	if err != nil {
		return err
	}

	return s.userRepo.UpdatePIN(ctx, s.transactor.DB(), userID, newPINHash)
}

func (s *authService) Setup2FA(ctx context.Context, userID string) (*dto.TwoFactorSetupResponse, error) {
	// Step 1: Fetch user record
	user, err := s.userRepo.FindByID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return nil, err
	}
	if user.IsTwoFactorEnabled {
		return nil, domain.ErrTwoFactorAlreadyEnabled
	}

	// Step 2: Generate random 20-byte Base32 secret
	rawSecret, err := security.GenerateTOTPSecret()
	if err != nil {
		return nil, err
	}

	// Step 3: Encrypt the secret using AES-256-GCM before database storage
	encryptedSecret, err := security.Encrypt(rawSecret, s.encryptionKey)
	if err != nil {
		return nil, err
	}

	// Step 4: Save encrypted pending secret into `users` table (disabled until verified)
	if err := s.userRepo.UpdateTwoFactor(ctx, s.transactor.DB(), userID, &encryptedSecret, false); err != nil {
		return nil, err
	}

	// Step 5: Return raw secret and QR Code URI for Google Authenticator setup
	qrCodeURI := security.GenerateTOTPURI(rawSecret, user.Email, "Bastion")
	return &dto.TwoFactorSetupResponse{
		Secret:    rawSecret,
		QRCodeURI: qrCodeURI,
	}, nil
}

func (s *authService) Enable2FA(ctx context.Context, userID, code string) error {
	// Step 1: Fetch user
	user, err := s.userRepo.FindByID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return err
	}
	if user.IsTwoFactorEnabled {
		return domain.ErrTwoFactorAlreadyEnabled
	}
	if user.TwoFactorSecret == nil || *user.TwoFactorSecret == "" {
		return domain.ErrTwoFactorNotEnabled
	}

	// Step 2: Decrypt stored 2FA secret
	rawSecret, err := security.Decrypt(*user.TwoFactorSecret, s.encryptionKey)
	if err != nil {
		return err
	}

	// Step 3: Validate 6-digit TOTP code
	if !security.ValidateTOTPCode(rawSecret, code) {
		return domain.ErrInvalidTwoFactorCode
	}

	// Step 4: Mark 2FA as permanently enabled
	return s.userRepo.UpdateTwoFactor(ctx, s.transactor.DB(), userID, user.TwoFactorSecret, true)
}

func (s *authService) Disable2FA(ctx context.Context, userID, code string) error {
	// Step 1: Fetch user
	user, err := s.userRepo.FindByID(ctx, s.transactor.DB(), userID)
	if err != nil {
		return err
	}
	if !user.IsTwoFactorEnabled || user.TwoFactorSecret == nil {
		return domain.ErrTwoFactorNotEnabled
	}

	// Step 2: Decrypt secret and validate code
	rawSecret, err := security.Decrypt(*user.TwoFactorSecret, s.encryptionKey)
	if err != nil {
		return err
	}
	if !security.ValidateTOTPCode(rawSecret, code) {
		return domain.ErrInvalidTwoFactorCode
	}

	// Step 3: Deactivate 2FA and remove secret
	return s.userRepo.UpdateTwoFactor(ctx, s.transactor.DB(), userID, nil, false)
}

func (s *authService) Verify2FALogin(ctx context.Context, req *dto.Verify2FALoginRequest) (*dto.AuthResponse, error) {
	// Step 1: Parse and validate temporary challenge token
	claims, err := security.ParseAndValidate2FATempToken(req.TempToken, s.jwtSecret)
	if err != nil {
		return nil, domain.ErrInvalidTempToken
	}

	// Step 2: Fetch user
	user, err := s.userRepo.FindByID(ctx, s.transactor.DB(), claims.UserID)
	if err != nil {
		return nil, domain.ErrUserNotFound
	}
	if !user.IsTwoFactorEnabled || user.TwoFactorSecret == nil {
		return nil, domain.ErrTwoFactorNotEnabled
	}

	// Step 3: Decrypt stored secret and validate code
	rawSecret, err := security.Decrypt(*user.TwoFactorSecret, s.encryptionKey)
	if err != nil {
		return nil, err
	}
	if !security.ValidateTOTPCode(rawSecret, req.Code) {
		return nil, domain.ErrInvalidTwoFactorCode
	}

	// Step 4: Issue final Token Pair
	accessToken, refreshToken, _, refreshClaims, err := security.GenerateTokenPair(
		user.ID,
		user.Email,
		user.Tier,
		s.jwtSecret,
		AccessTokenDuration,
		RefreshTokenDuration,
	)
	if err != nil {
		return nil, err
	}

	// Step 5: Store refresh token in Redis
	if err := s.refreshRepo.Store(ctx, user.ID, refreshClaims.ID, RefreshTokenDuration); err != nil {
		return nil, err
	}

	// Step 6: Return full authentication response
	return &dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         dto.ToUserResponse(user),
	}, nil
}