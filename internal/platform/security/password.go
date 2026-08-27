package security

import (
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	BcrpytCost        = 12
	MinPasswordLength = 8
	MaxPasswordLength = 72
)

var (
	ErrPasswordTooShort = errors.New("password must be at least 8 characters long")
	ErrPasswordTooLong = errors.New("password cannot exceed 72 characters")
	ErrPasswordWhitespace = errors.New("password cannot contain only whitespace")
	ErrInvalidPassword = errors.New("invalid password")
)

func ValidatePassword(password string) error {
	trimmed := strings.TrimSpace(password)
	if len(trimmed) == 0 {
		return ErrPasswordWhitespace
	}

	if len(password) < MinPasswordLength {
		return ErrPasswordTooShort
	}

	if len(password) > MaxPasswordLength {
		return ErrPasswordTooLong
	}

	return nil
}

func HashPassword(password string) (string, error) {
	if err := ValidatePassword(password); err != nil {
		return "", err
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), BcrpytCost)

	if err != nil {
		return "", err
	}

	return string(hashedBytes), nil
}

func ComparePassword(hashedPassword, password string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return ErrInvalidPassword
	}

	return nil
}
