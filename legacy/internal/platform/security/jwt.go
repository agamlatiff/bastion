package security

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWT Package-Level Sentinel Errors
var (
	ErrInvalidToken       = errors.New("invalid token")
	ErrExpiredToken       = errors.New("token has expired")
	ErrInvalidSigningAlgo = errors.New("invalid token signing algorithm")
	ErrMalformedClaims    = errors.New("token contains malformed or missing claims")
	ErrInvalidTokenType   = errors.New("invalid token type for this operation")
)

// Internal token type identifiers for JWT payload claims
const (
	TokenTypeAccess       = "access"
	TokenTypeRefresh      = "refresh"
	TokenType2FAChallenge = "2fa_challenge"
)

// UserClaims defines the structured payload inside Bastion JWT tokens.
type UserClaims struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Tier      string `json:"tier"`
	TokenType string `json:"token_type"`
	jwt.RegisteredClaims
}

// GenerateToken creates a single signed JWT token (used for backward-compatibility or specific flows).
func GenerateToken(userID, email, tier, secret string, expiryHours int) (string, *UserClaims, error) {
	if secret == "" {
		return "", nil, errors.New("jwt secret cannot be empty")
	}

	now := time.Now()
	expiredAt := now.Add(time.Duration(expiryHours) * time.Hour)
	tokenID := uuid.New().String()

	claims := &UserClaims{
		UserID:    userID,
		Email:     email,
		Tier:      tier,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ID:        tokenID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiredAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", nil, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenStr, claims, nil
}

// GenerateTokenPair creates both a short-lived Access Token and a long-lived Refresh Token.
func GenerateTokenPair(userID, email, tier, secret string, accessTTL, refreshTTL time.Duration) (string, string, *UserClaims, *UserClaims, error) {
	if secret == "" {
		return "", "", nil, nil, errors.New("jwt secret cannot be empty")
	}

	now := time.Now()

	// 1. Access Token (Short-lived)
	accessTokenID := uuid.New().String()
	accessClaims := &UserClaims{
		UserID:    userID,
		Email:     email,
		Tier:      tier,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ID:        accessTokenID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(accessTTL)),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenStr, err := accessToken.SignedString([]byte(secret))
	if err != nil {
		return "", "", nil, nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	// 2. Refresh Token (Long-lived)
	refreshTokenID := uuid.New().String()
	refreshClaims := &UserClaims{
		UserID:    userID,
		Email:     email,
		Tier:      tier,
		TokenType: TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ID:        refreshTokenID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(refreshTTL)),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenStr, err := refreshToken.SignedString([]byte(secret))
	if err != nil {
		return "", "", nil, nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return accessTokenStr, refreshTokenStr, accessClaims, refreshClaims, nil
}

// Generate2FATempToken generates a short-lived (5 minutes) temporary token for 2FA verification challenge.
func Generate2FATempToken(userID, email, secret string) (string, error) {
	if secret == "" {
		return "", errors.New("jwt secret cannot be empty")
	}

	now := time.Now()
	tokenID := uuid.New().String()
	claims := &UserClaims{
		UserID:    userID,
		Email:     email,
		TokenType: TokenType2FAChallenge,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ID:        tokenID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseAndValidateToken parses and verifies an Access Token.
func ParseAndValidateToken(tokenStr, secret string) (*UserClaims, error) {
	if secret == "" {
		return nil, errors.New("jwt secret cannot be empty")
	}

	claims := &UserClaims{}

	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, ErrInvalidSigningAlgo
		}

		return []byte(secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}

		if errors.Is(err, ErrInvalidSigningAlgo) {
			return nil, ErrInvalidSigningAlgo
		}

		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.UserID == "" || claims.ID == "" || claims.Subject == "" {
		return nil, ErrMalformedClaims
	}

	// Reject non-access tokens if used as access tokens
	if claims.TokenType != "" && claims.TokenType != TokenTypeAccess {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}

// ParseAndValidateRefreshToken parses and verifies a Refresh Token.
func ParseAndValidateRefreshToken(tokenStr, secret string) (*UserClaims, error) {
	if secret == "" {
		return nil, errors.New("jwt secret cannot be empty")
	}

	claims := &UserClaims{}

	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, ErrInvalidSigningAlgo
		}

		return []byte(secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}

		if errors.Is(err, ErrInvalidSigningAlgo) {
			return nil, ErrInvalidSigningAlgo
		}

		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.UserID == "" || claims.ID == "" || claims.Subject == "" {
		return nil, ErrMalformedClaims
	}

	if claims.TokenType != TokenTypeRefresh {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}

// ParseAndValidate2FATempToken parses and verifies a 2FA Challenge Temporary Token.
func ParseAndValidate2FATempToken(tokenStr, secret string) (*UserClaims, error) {
	if secret == "" {
		return nil, errors.New("jwt secret cannot be empty")
	}

	claims := &UserClaims{}

	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, ErrInvalidSigningAlgo
		}

		return []byte(secret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}

		if errors.Is(err, ErrInvalidSigningAlgo) {
			return nil, ErrInvalidSigningAlgo
		}

		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.UserID == "" || claims.ID == "" || claims.Subject == "" {
		return nil, ErrMalformedClaims
	}

	if claims.TokenType != TokenType2FAChallenge {
		return nil, ErrInvalidTokenType
	}

	return claims, nil
}
