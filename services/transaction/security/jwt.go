package security

import (
	"errors"
	"fmt"
	"strings"

	"github.com/agamlatiff/bastion/services/transaction/domain"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTService handles parsing, verification, and role evaluation of incoming JWTs.
type JWTService struct {
	secret []byte
}

// UserClaims encapsulates identity attributes extracted from validated tokens.
type UserClaims struct {
	UserID uuid.UUID
	Roles  []string
}

// NewJWTService instantiates a JWT authentication service.
func NewJWTService(secret string) *JWTService {
	return &JWTService{
		secret: []byte(secret),
	}
}

// ExtractClaims verifies the Authorization Bearer header and extracts user ID and assigned roles.
func (s *JWTService) ExtractClaims(authHeader string) (*UserClaims, error) {
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, fmt.Errorf("%w: missing or malformed Bearer token", domain.ErrUnauthorized)
	}

	rawToken := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	if rawToken == "" {
		return nil, fmt.Errorf("%w: empty token string", domain.ErrUnauthorized)
	}

	token, err := jwt.Parse(rawToken, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing algorithm: %v", token.Header["alg"])
		}
		return s.secret, nil
	})

	if err != nil || !token.Valid {
		return nil, fmt.Errorf("%w: invalid or expired token: %v", domain.ErrUnauthorized, err)
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("%w: invalid token claims payload", domain.ErrUnauthorized)
	}

	var userIdStr string
	if val, ok := mapClaims["user_id"].(string); ok && val != "" {
		userIdStr = val
	} else if sub, ok := mapClaims["sub"].(string); ok && sub != "" {
		userIdStr = sub
	}

	if userIdStr == "" {
		return nil, errors.New("token does not contain user ID")
	}

	parsedID, err := uuid.Parse(userIdStr)
	if err != nil {
		return nil, fmt.Errorf("malformed user ID in token: %w", err)
	}

	var roles []string
	if roleList, ok := mapClaims["roles"].([]any); ok {
		for _, r := range roleList {
			if rStr, ok := r.(string); ok && rStr != "" {
				roles = append(roles, rStr)
			}
		}
	}
	if singleRole, ok := mapClaims["role"].(string); ok && singleRole != "" {
		roles = append(roles, singleRole)
	}

	return &UserClaims{
		UserID: parsedID,
		Roles:  roles,
	}, nil
}

// HasRole checks whether a claim has the target role (case-insensitive).
func HasRole(roles []string, targetRole string) bool {
	for _, r := range roles {
		if strings.EqualFold(r, targetRole) {
			return true
		}
	}
	return false
}
