package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// GenerateTOTPSecret generates a cryptographically secure 20-byte random secret encoded in Base32.
func GenerateTOTPSecret() (string, error) {
	secretBytes := make([]byte, 20)
	if _, err := rand.Read(secretBytes); err != nil {
		return "", fmt.Errorf("failed to generate random secret: %w", err)
	}

	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secretBytes), nil
}

// GenerateTOTPURI generates the standard `otpauth://` URI for scanning with authenticator apps.
func GenerateTOTPURI(secret, accountName, issuer string) string {
	authURL := url.URL{
		Scheme: "otpauth",
		Host:   "totp",
		Path:   fmt.Sprintf("%s:%s", issuer, accountName),
	}

	q := authURL.Query()
	q.Set("secret", secret)
	q.Set("issuer", issuer)
	q.Set("algorithm", "SHA1")
	q.Set("digits", "6")
	q.Set("period", "30")
	authURL.RawQuery = q.Encode()

	return authURL.String()
}

// GenerateTOTPCode generates a 6-digit TOTP code for a specific timestamp using RFC 6238 (HMAC-SHA1).
func GenerateTOTPCode(secret string, t time.Time) (string, error) {
	cleanedSecret := strings.ToUpper(strings.TrimSpace(secret))
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(cleanedSecret)
	if err != nil {
		// Fallback to padded decoding if necessary
		key, err = base32.StdEncoding.DecodeString(cleanedSecret)
		if err != nil {
			return "", fmt.Errorf("invalid base32 secret: %w", err)
		}
	}

	// 30-second time interval counter
	counter := uint64(t.Unix() / 30)
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], counter)

	mac := hmac.New(sha1.New, key)
	mac.Write(buf[:])
	hash := mac.Sum(nil)

	// Dynamic truncation
	offset := hash[len(hash)-1] & 0x0f
	binaryCode := binary.BigEndian.Uint32(hash[offset:offset+4]) & 0x7fffffff
	otp := binaryCode % 1000000

	return fmt.Sprintf("%06d", otp), nil
}

// ValidateTOTPCode validates a 6-digit TOTP code against the secret, allowing a +-1 time step tolerance (30s drift).
func ValidateTOTPCode(secret, passcode string) bool {
	if len(passcode) != 6 {
		return false
	}

	now := time.Now()
	// Check current time step and adjacent steps (-30s, current, +30s)
	for _, offset := range []int64{-30, 0, 30} {
		code, err := GenerateTOTPCode(secret, now.Add(time.Duration(offset)*time.Second))
		if err == nil && code == passcode {
			return true
		}
	}

	return false
}
