package security

import (
	"errors"
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

var pinRegex = regexp.MustCompile(`^[0-9]{6}$`)

func ValidatePIN(pin string) error {
	if !pinRegex.MatchString(pin) {
		return errors.New("pin must be exactly 6 numeric digits")
	}

	return nil
}

func HashPIN(pin string) (string, error) {
	if err := ValidatePIN(pin); err != nil {
		return "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(pin), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hash), nil
}

func ComparePIN(hashedPIN string, plainPIN string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPIN), []byte(plainPIN))
}