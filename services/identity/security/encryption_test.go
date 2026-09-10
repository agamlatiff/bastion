package security

import (
	"testing"
)

func TestEncryption(t *testing.T) {
	key, err := ParseEncryptionKey("01234567890123456789012345678901")
	if err != nil {
		t.Fatalf("failed to parse key: %v", err)
	}

	plaintext := "JBSWY3DPEHPK3PXP"

	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("failed to encrypt: %v", err)
	}

	decrypted, err := Decrypt(ciphertext, key)
	if err != nil {
		t.Fatalf("failed to decrypt: %v", err)
	}

	if decrypted != plaintext {
		t.Fatalf("expected decrypted plaintext %s, got %s", plaintext, decrypted)
	}
}
