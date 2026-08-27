package security_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/agamlatiff/bastion/internal/platform/security"
	"golang.org/x/crypto/bcrypt"
)

func TestValidatePasword(t *testing.T) {
	tests := []struct {
		name        string
		password    string
		expectedErr error
	}{
		{"Valid password", "securePassword123", nil},
		{"Too short", "short", security.ErrPasswordTooShort},
		{"Whitespace only", "       ", security.ErrPasswordWhitespace},
		{"Empty password", "", security.ErrPasswordWhitespace},
		{"Too long (over 72 chars)", strings.Repeat("a", 73), security.ErrPasswordTooLong},
		{"Max allowed length (72 chars)", strings.Repeat("a", 72), nil},
	}


	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := security.ValidatePassword(tt.password)
			if !errors.Is(err, tt.expectedErr) {
				t.Errorf("ValidatePassword(%q) error = %v, want %v", tt.password, err, tt.expectedErr)
			}
		})
	}
}


func TestHashPasswordAndComparePassword(t *testing.T) {
	plainPassword := "SecretP@assword123"

	hashed, err := security.HashPassword(plainPassword)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	cost, err := bcrypt.Cost([]byte(hashed))

	if err != nil {
		t.Fatalf("Failed to extract bcrypt cost: %v", err)
	}
	
	if cost != security.BcrpytCost {
		t.Errorf("Expected bcrpyt cost %d, got %d", security.BcrpytCost, cost)
	}  

	err = security.ComparePassword(hashed, plainPassword)
	if err != nil {
		t.Errorf("ComparePassword failed on correct password: %v", err)
	}

	err = security.ComparePassword(hashed, "WrongPassword123")
	if !errors.Is(err, security.ErrInvalidPassword) {
		t.Errorf("Expected ErrInvalidPassword on wrong password, got: %v", err)
	}

	
}
