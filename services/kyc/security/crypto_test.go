package security

import (
	"testing"
)

func TestCrypto_EncryptDecrypt(t *testing.T) {
	key := []byte("01234567890123456789012345678901") // 32 bytes
	plaintext := "3171012345670001"                  // Indonesian NIK

	// 1. Encrypt
	ciphertext, err := Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("expected encryption to succeed, got %v", err)
	}
	if ciphertext == plaintext {
		t.Fatalf("ciphertext must not match plaintext")
	}

	// 2. Decrypt
	decrypted, err := Decrypt(ciphertext, key)
	if err != nil {
		t.Fatalf("expected decryption to succeed, got %v", err)
	}
	if decrypted != plaintext {
		t.Fatalf("expected decrypted text %s, got %s", plaintext, decrypted)
	}

	// 3. Decrypt with invalid key
	wrongKey := []byte("11111111111111111111111111111111")
	_, err = Decrypt(ciphertext, wrongKey)
	if err == nil {
		t.Fatalf("expected decryption to fail with wrong key, got nil")
	}
}

func TestCrypto_BlindIndex(t *testing.T) {
	key := []byte("01234567890123456789012345678901")
	nik1 := "3171012345670001"
	nik2 := "3171012345670002"

	hash1a := HashBlindIndex(nik1, key)
	hash1b := HashBlindIndex(nik1, key)
	hash2 := HashBlindIndex(nik2, key)

	// Deterministic
	if hash1a != hash1b {
		t.Fatalf("expected same hash for identical input, got %s vs %s", hash1a, hash1b)
	}

	// Distinct for different NIKs
	if hash1a == hash2 {
		t.Fatalf("expected distinct hashes for different NIKs")
	}
}
