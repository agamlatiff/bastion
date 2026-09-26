package security

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestJWTService_ExtractUserIDFromHeader(t *testing.T) {
	secret := "test_secret_key_12345"
	jwtSvc := NewJWTService(secret)
	expectedUserID := uuid.New()

	// 1. Valid Token with user_id claim
	validToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": expectedUserID.String(),
		"exp":     time.Now().Add(1 * time.Hour).Unix(),
	})
	signedToken, err := validToken.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}

	extractedID, err := jwtSvc.ExtractUserIDFromHeader("Bearer " + signedToken)
	if err != nil {
		t.Fatalf("expected successful token extraction, got error: %v", err)
	}
	if extractedID != expectedUserID {
		t.Fatalf("expected user ID %s, got %s", expectedUserID, extractedID)
	}

	// 2. Missing Bearer prefix
	_, err = jwtSvc.ExtractUserIDFromHeader(signedToken)
	if err == nil {
		t.Fatalf("expected error for missing Bearer prefix, got nil")
	}

	// 3. Expired Token
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": expectedUserID.String(),
		"exp":     time.Now().Add(-1 * time.Hour).Unix(),
	})
	signedExpired, _ := expiredToken.SignedString([]byte(secret))
	_, err = jwtSvc.ExtractUserIDFromHeader("Bearer " + signedExpired)
	if err == nil {
		t.Fatalf("expected error for expired token, got nil")
	}

	// 4. Invalid Signature
	wrongSecretToken, _ := validToken.SignedString([]byte("wrong_secret_key"))
	_, err = jwtSvc.ExtractUserIDFromHeader("Bearer " + wrongSecretToken)
	if err == nil {
		t.Fatalf("expected error for invalid signature, got nil")
	}
}
