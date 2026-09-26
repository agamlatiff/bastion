package security

import (
	"errors"
	"fmt"
	"strings"

	"github.com/agamlatiff/bastion/services/customer/domain"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTService handles token verification and user ID extraction.
type JWTService struct {
	secret []byte
}

// NewJWTService instantiates a JWT verification service with a shared HMAC secret.
func NewJWTService(secret string) *JWTService {
	return &JWTService{
		secret: []byte(secret),
	}
}

// ExtractUserIDFromHeader extracts and validates the JWT Bearer token from the Authorization header.
func (s *JWTService) ExtractUserIDFromHeader(authHeader string) (uuid.UUID, error) {
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return uuid.Nil, fmt.Errorf("%w: missing or malformed Bearer token", domain.ErrUnauthorized)
	}

	rawToken := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if rawToken == "" {
		return uuid.Nil, fmt.Errorf("%w: empty token string", domain.ErrUnauthorized)
	}

	token, err := jwt.Parse(rawToken, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.secret, nil
	})

	if err != nil || !token.Valid {
		return uuid.Nil, fmt.Errorf("%w: invalid or expired token: %v", domain.ErrUnauthorized, err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, fmt.Errorf("%w: invalid token claims format", domain.ErrUnauthorized)
	}

	var userIdStr string
	if val, ok := claims["user_id"].(string); ok && val != "" {
		userIdStr = val
	} else if sub, ok := claims["sub"].(string); ok && sub != "" {
		userIdStr = sub
	}

	if userIdStr == "" {
		return uuid.Nil, errors.New("token does not contain user ID")
	}

	parsedID, err := uuid.Parse(userIdStr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("malformed user ID in token: %w", err)
	}

	return parsedID, nil
}
