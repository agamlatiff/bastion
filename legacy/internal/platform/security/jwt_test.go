package security_test

import (
	"errors"
	"testing"
	"time"

	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/golang-jwt/jwt/v5"
)

const testSecret = "super_secret_jwt_key_for_testing_12345"

func TestGenerateAndValidateToken_Success(t *testing.T) {
	userID := "usr_abc123"
	email := "user@gmail.com"
	tier := "tier_2"
	expiryHours := 24

	tokenStr, claims, err := security.GenerateToken(userID, email, tier, testSecret, expiryHours)

	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	if claims.Subject != userID || claims.UserID != userID {
		t.Errorf("Expected Subject and UserID to be %s, got sub=%s, user_id=%s", userID, claims.Subject, claims.UserID)
	}
	if claims.ID == "" {
		t.Errorf("Expected JTI (Token ID) to be generated, got empty string")
	}

	parsedClaims, err := security.ParseAndValidateToken(tokenStr, testSecret)
	if err != nil {
		t.Fatalf("ParseAndValidateToken failed on valid token: %v", err)
	}

	if parsedClaims.UserID != userID || parsedClaims.Email != email || parsedClaims.Tier != tier {
		t.Errorf("Parsed claims data mismatch: got %+v", parsedClaims)
	}

	if parsedClaims.ID != claims.ID {
		t.Errorf("Expected JTI %s, got %s", claims.ID, parsedClaims.ID)
	}
}


func TestValidateToken_Expired(t *testing.T) {
	tokenStr, _, err := security.GenerateToken("usr_123", "test@example.com", "tier_1", testSecret, -1)

	if err != nil {
		t.Fatalf("Failed to generate expired token: %v", err) 
	}

	_, err = security.ParseAndValidateToken(tokenStr, testSecret) 
	if !errors.Is(err, security.ErrExpiredToken) {
		t.Errorf("Expected ErrExpiredToken, got: %v", err)
	}
}


func TestValidateToken_WrongSecret(t *testing.T) {
	tokenStr, _, err := security.GenerateToken("usr_123", "test@example.com", "tier_1", testSecret, 24)

	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	_, err = security.ParseAndValidateToken(tokenStr,"wrong_secret_key_9999")
	if !errors.Is(err,security.ErrInvalidToken) {
		t.Errorf("Expected ErrInvalidToken on wrong secret, got: %v", err)
	}
}

func TestValidateToken_RejectNoneAlgorithm(t *testing.T) {
	claims := &security.UserClaims{
		UserID: "usr_hacker",
		Email: "hacker@darkweb.com",
		Tier: "tier_99",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: "usr_hacker",
			ID: "jti_hacker",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		},
	}

	unsignedToken := jwt.NewWithClaims(jwt.SigningMethodNone, claims)
	tokenStr, _ := unsignedToken.SignedString(jwt.UnsafeAllowNoneSignatureType)

	_, err := security.ParseAndValidateToken(tokenStr, testSecret)
	if !errors.Is(err, security.ErrInvalidSigningAlgo) && ! errors.Is(err, security.ErrInvalidToken) {
		t.Errorf("Expected token to be rejected due to invalid signing algorithm, got: %v", err)
	}
}    


func TestValidateToken_MalFormedClaims(t *testing.T) {
	claims := &security.UserClaims{
		UserID: "",
		Email: "whoisthis@gmail.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: "",
			ID: "",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(testSecret))

	_, err := security.ParseAndValidateToken(tokenStr, testSecret)
	if !errors.Is(err, security.ErrMalformedClaims) {
		t.Errorf("Expected ErrMalformedClaims for empty subject/jti, got: %v", err)
	}
}
