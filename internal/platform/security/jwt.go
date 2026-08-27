package security

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token has expired")
	ErrInvalidSigningAlgo = errors.New("invalid token signing algorithm")
	ErrMalformedClaims = errors.New("token contains malformed or missing claims")
)

type UserClaims struct {
	UserID string `json:"user_id"`
	Email string `json:"email"`
	Tier string `json:"tier"`
	jwt.RegisteredClaims
}

func GenerateToken (userID, email, tier, secret string, expiryHours int) (string, *UserClaims, error) {
	if secret == "" {
		return "", nil, errors.New("jwt secret cannot be empty")
	}

	now := time.Now()
	expiredAt := now.Add(time.Duration(expiryHours) * time.Hour)
	tokenID := uuid.New().String()

	claims := &UserClaims{
		UserID: userID,
		Email: email,
		Tier: tier,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: userID,
			ID: tokenID,
			IssuedAt: jwt.NewNumericDate(now),
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

	return claims, nil
}
