package security

import (
	"strings"
	"testing"
	"time"
)

func TestTOTP(t *testing.T) {
	t.Run("GenerateTOTPSecret produces 32-char Base32 string", func(t *testing.T) {
		secret, err := GenerateTOTPSecret()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(secret) != 32 {
			t.Fatalf("expected 32-char secret, got %d", len(secret))
		}
	})

	t.Run("GenerateTOTPURI produces correct otpauth URI", func(t *testing.T) {
		secret, _ := GenerateTOTPSecret()
		uri := GenerateTOTPURI(secret, "user@bastion.id", "Bastion")
		if !strings.HasPrefix(uri, "otpauth://totp/Bastion:user@bastion.id?") {
			t.Fatalf("unexpected URI prefix: %s", uri)
		}
		if !strings.Contains(uri, "secret="+secret) {
			t.Fatalf("URI should contain secret: %s", uri)
		}
	})

	t.Run("GenerateTOTPCode and ValidateTOTPCode success", func(t *testing.T) {
		secret, _ := GenerateTOTPSecret()
		now := time.Now()
		code, err := GenerateTOTPCode(secret, now)
		if err != nil {
			t.Fatalf("failed to generate code: %v", err)
		}
		if len(code) != 6 {
			t.Fatalf("expected 6-digit code, got %s", code)
		}

		if !ValidateTOTPCode(secret, code) {
			t.Fatal("expected valid code to pass validation")
		}
	})

	t.Run("ValidateTOTPCode rejects invalid code", func(t *testing.T) {
		secret, _ := GenerateTOTPSecret()
		if ValidateTOTPCode(secret, "000000") && ValidateTOTPCode(secret, "999999") {
			t.Fatal("expected arbitrary code to fail validation")
		}
		if ValidateTOTPCode(secret, "123") {
			t.Fatal("code with length != 6 should be rejected immediately")
		}
	})

	t.Run("ValidateTOTPCode tolerates +-30s clock drift", func(t *testing.T) {
		secret, _ := GenerateTOTPSecret()
		pastCode, _ := GenerateTOTPCode(secret, time.Now().Add(-25*time.Second))
		if !ValidateTOTPCode(secret, pastCode) {
			t.Fatal("expected 25s old code to still be valid due to drift tolerance")
		}
	})
}
