package security

import (
	"strings"
	"testing"
	"time"
)

func TestTOTP(t *testing.T) {
	t.Run("Generate Secret and URI", func(t *testing.T) {
		secret, err := GenerateTOTPSecret()
		if err != nil {
			t.Fatalf("expected secret generation to succeed, got error: %v", err)
		}

		if len(secret) == 0 {
			t.Errorf("expected non-empty secret")
		}

		uri := GenerateTOTPURI(secret, "user@bastion.com", "Bastion")
		if !strings.HasPrefix(uri, "otpauth://totp/Bastion:user@bastion.com?") {
			t.Errorf("unexpected URI format: %s", uri)
		}
		if !strings.Contains(uri, "secret="+secret) {
			t.Errorf("URI missing secret parameter")
		}
	})

	t.Run("Generate and Validate Code", func(t *testing.T) {
		secret, _ := GenerateTOTPSecret()
		now := time.Now()

		code, err := GenerateTOTPCode(secret, now)
		if err != nil {
			t.Fatalf("expected code generation to succeed, got error: %v", err)
		}

		if len(code) != 6 {
			t.Errorf("expected 6-digit code, got %s", code)
		}

		if !ValidateTOTPCode(secret, code) {
			t.Errorf("expected code %s to be valid for secret %s", code, secret)
		}
	})

	t.Run("Reject Invalid Code", func(t *testing.T) {
		secret, _ := GenerateTOTPSecret()
		if ValidateTOTPCode(secret, "000000") && ValidateTOTPCode(secret, "999999") {
			// Extremely unlikely for both to be valid
			t.Errorf("invalid code should not be accepted")
		}

		if ValidateTOTPCode(secret, "123") {
			t.Errorf("code with invalid length should be rejected")
		}
	})

	t.Run("Tolerate 30s Time Drift", func(t *testing.T) {
		secret, _ := GenerateTOTPSecret()
		// Code generated 25 seconds ago
		pastCode, _ := GenerateTOTPCode(secret, time.Now().Add(-25*time.Second))

		if !ValidateTOTPCode(secret, pastCode) {
			t.Errorf("expected code from 25 seconds ago to still be accepted within drift window")
		}
	})
}
