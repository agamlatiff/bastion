package security

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestJWTService_ExtractClaims(t *testing.T) {
	secret := "test_kyc_jwt_secret_123"
	jwtSvc := NewJWTService(secret)
	expectedUserID := uuid.New()

	// 1. Valid token with roles
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": expectedUserID.String(),
		"roles":   []string{"CUSTOMER", "KYC_REVIEWER"},
		"exp":     time.Now().Add(1 * time.Hour).Unix(),
	})
	signedToken, _ := token.SignedString([]byte(secret))

	claims, err := jwtSvc.ExtractClaims("Bearer " + signedToken)
	if err != nil {
		t.Fatalf("expected successful claim extraction, got %v", err)
	}
	if claims.UserID != expectedUserID {
		t.Fatalf("expected user ID %s, got %s", expectedUserID, claims.UserID)
	}
	if !HasRole(claims.Roles, "KYC_REVIEWER") {
		t.Fatalf("expected claims to include KYC_REVIEWER role")
	}

	// 2. Missing Bearer prefix
	_, err = jwtSvc.ExtractClaims(signedToken)
	if err == nil {
		t.Fatalf("expected error for missing Bearer prefix, got nil")
	}
}
