package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
)

var (
	ErrInvalidKeyLength  = errors.New("encryption key must be exactly 32 bytes (256 bits) for AES-256")
	ErrCiphertextTooShort = errors.New("ciphertext is too short or malformed")
	ErrDecryptionFailed  = errors.New("failed to decrypt data: invalid key or corrupted ciphertext")
)

// ParseEncryptionKey parses a 32-byte key from either a 64-character hex string or raw 32-byte string.
func ParseEncryptionKey(rawKey string) ([]byte, error) {
	if len(rawKey) == 64 {
		decoded, err := hex.DecodeString(rawKey)
		if err == nil && len(decoded) == 32 {
			return decoded, nil
		}
	}

	keyBytes := []byte(rawKey)
	if len(keyBytes) != 32 {
		return nil, ErrInvalidKeyLength
	}

	return keyBytes, nil
}

// Encrypt encrypts plaintext using AES-256-GCM authenticated symmetric encryption.
// Returns a Base64-encoded string containing [12-byte Nonce + Ciphertext + 16-byte Tag].
func Encrypt(plaintext string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", ErrInvalidKeyLength
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to initialize GCM mode: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("failed to generate random nonce: %w", err)
	}

	// Seal appends the ciphertext and tag to the nonce
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a Base64-encoded AES-256-GCM ciphertext string using the provided 32-byte key.
func Decrypt(ciphertextBase64 string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", ErrInvalidKeyLength
	}

	data, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", fmt.Errorf("invalid base64 ciphertext: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("failed to create AES cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("failed to initialize GCM mode: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", ErrCiphertextTooShort
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	return string(plaintext), nil
}
