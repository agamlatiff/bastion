package security

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TokenType discriminates access tokens from refresh tokens.
type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
	TokenType2FATemp TokenType = "2fa_temp"
)

// TokenClaims represents the custom JWT claims used across the platform.
type TokenClaims struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`  // Primary role for backward compatibility
	Roles     []string  `json:"roles"` // Complete role list for multi-role RBAC
	TokenType TokenType `json:"token_type"`
	jwt.RegisteredClaims
}

// HasRole checks if the token claims include the specified role (case-insensitive).
func (c *TokenClaims) HasRole(role string) bool {
	for _, r := range c.Roles {
		if strings.EqualFold(r, role) {
			return true
		}
	}
	if strings.EqualFold(c.Role, role) {
		return true
	}
	return false
}

// HasAnyRole checks if the token claims include at least one of the specified roles.
func (c *TokenClaims) HasAnyRole(roles ...string) bool {
	for _, required := range roles {
		if c.HasRole(required) {
			return true
		}
	}
	return false
}

// TokenPair represents an access token and refresh token returned upon login/refresh.
type TokenPair struct {
	AccessToken      string `json:"access_token"`
	RefreshToken     string `json:"refresh_token"`
	ExpiresInSeconds int64  `json:"expires_in"`
}

// GenerateTokenPair generates both an access token (short-lived) and a refresh token (long-lived) with multi-role support.
func GenerateTokenPair(userID, email string, roles []string, secret string, accessMins, refreshDays int) (*TokenPair, error) {
	now := time.Now().UTC()

	primaryRole := "CUSTOMER"
	if len(roles) > 0 && roles[0] != "" {
		primaryRole = roles[0]
	}

	// 1. Access Token
	accessExpiry := now.Add(time.Duration(accessMins) * time.Minute)
	accessClaims := TokenClaims{
		UserID:    userID,
		Email:     email,
		Role:      primaryRole,
		Roles:     roles,
		TokenType: TokenTypeAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(), // jti (JWT ID)
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExpiry),
			Issuer:    "bastion-identity",
		},
	}

	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(secret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	// 2. Refresh Token
	refreshExpiry := now.Add(time.Duration(refreshDays) * 24 * time.Hour)
	refreshClaims := TokenClaims{
		UserID:    userID,
		Email:     email,
		Role:      primaryRole,
		Roles:     roles,
		TokenType: TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(), // jti (JWT ID)
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(refreshExpiry),
			Issuer:    "bastion-identity",
		},
	}

	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(secret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		ExpiresInSeconds: int64(time.Duration(accessMins) * time.Minute / time.Second),
	}, nil
}

// ValidateToken validates a JWT token signature, expiry, and ensures expected token type.
func ValidateToken(tokenString, secret string, expectedType TokenType) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing algorithm: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	if claims.TokenType != expectedType {
		return nil, fmt.Errorf("invalid token type: expected %s, got %s", expectedType, claims.TokenType)
	}

	if len(claims.Roles) == 0 && claims.Role != "" {
		claims.Roles = []string{claims.Role}
	}

	return claims, nil
}

// HashRefreshToken generates a SHA-256 hex string of the refresh token to safely store in the database.
func HashRefreshToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// Generate2FATempToken generates a short-lived (5-minute) token used solely to verify the 2FA OTP code.
func Generate2FATempToken(userID, email, secret string) (string, error) {
	now := time.Now().UTC()
	expiry := now.Add(5 * time.Minute)

	claims := TokenClaims{
		UserID:    userID,
		Email:     email,
		Role:      "",
		TokenType: TokenType2FATemp,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiry),
			Issuer:    "bastion-identity-2fa",
		},
	}

	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

// Validate2FATempToken validates the temporary 2FA challenge token.
func Validate2FATempToken(tokenString, secret string) (*TokenClaims, error) {
	return ValidateToken(tokenString, secret, TokenType2FATemp)
}
