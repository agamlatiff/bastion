package security

import (
	"testing"
)

func TestAES256GCM_EncryptionAndDecryption(t *testing.T) {
	key := []byte("01234567890123456789012345678901") // exactly 32 bytes
	nik := "3171012345670001"

	t.Run("Successful Roundtrip", func(t *testing.T) {
		cipherBase64, err := Encrypt(nik, key)
		if err != nil {
			t.Fatalf("expected encryption to succeed, got error: %v", err)
		}

		if cipherBase64 == nik {
			t.Errorf("expected ciphertext to differ from plaintext")
		}

		decrypted, err := Decrypt(cipherBase64, key)
		if err != nil {
			t.Fatalf("expected decryption to succeed, got error: %v", err)
		}

		if decrypted != nik {
			t.Errorf("expected decrypted text %s, got %s", nik, decrypted)
		}
	})

	t.Run("Randomized Ciphertext (Non-Deterministic Nonce)", func(t *testing.T) {
		cipher1, _ := Encrypt(nik, key)
		cipher2, _ := Encrypt(nik, key)

		if cipher1 == cipher2 {
			t.Errorf("two encryptions of the same plaintext should produce different ciphertexts due to random nonces")
		}
	})

	t.Run("Wrong Key Decryption Fails", func(t *testing.T) {
		cipherBase64, _ := Encrypt(nik, key)
		wrongKey := []byte("11111111111111111111111111111111")

		_, err := Decrypt(cipherBase64, wrongKey)
		if err != ErrDecryptionFailed {
			t.Errorf("expected ErrDecryptionFailed, got %v", err)
		}
	})

	t.Run("Invalid Key Length", func(t *testing.T) {
		shortKey := []byte("too_short")
		_, err := Encrypt(nik, shortKey)
		if err != ErrInvalidKeyLength {
			t.Errorf("expected ErrInvalidKeyLength on encrypt, got %v", err)
		}

		_, err = Decrypt("some_ciphertext", shortKey)
		if err != ErrInvalidKeyLength {
			t.Errorf("expected ErrInvalidKeyLength on decrypt, got %v", err)
		}
	})

	t.Run("Tampered Ciphertext Detection", func(t *testing.T) {
		cipherBase64, _ := Encrypt(nik, key)
		// Tamper with ciphertext by corrupting characters
		tampered := "A" + cipherBase64[1:]

		_, err := Decrypt(tampered, key)
		if err == nil {
			t.Errorf("expected error on tampered ciphertext, got nil")
		}
	})
}
