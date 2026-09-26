package config

import (
	"os"
	"strings"

	"github.com/agamlatiff/bastion/services/kyc/security"
)

// Config holds runtime configuration options for the KYC service.
type Config struct {
	Port          string
	DatabaseURL   string
	KafkaBrokers  []string
	KafkaTopic    string
	EncryptionKey []byte
	JWTSecret     string
}

// Load populates configuration from environment variables with production defaults.
func Load() *Config {
	rawEncryptionKey := getEnv("DATA_ENCRYPTION_KEY", "01234567890123456789012345678901")
	parsedKey, err := security.ParseEncryptionKey(rawEncryptionKey)
	if err != nil {
		// Fallback to safe 32-byte default key in development
		parsedKey = []byte("01234567890123456789012345678901")
	}

	kafkaBrokersStr := getEnv("KAFKA_BROKERS", "localhost:19092")

	return &Config{
		Port:          getEnv("PORT", "8085"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://bastion:bastion_secret@localhost:5433/kyc_db?sslmode=disable"),
		KafkaBrokers:  strings.Split(kafkaBrokersStr, ","),
		KafkaTopic:    getEnv("KYC_EVENTS_TOPIC", "bastion.kyc.events"),
		EncryptionKey: parsedKey,
		JWTSecret:     getEnv("JWT_SECRET", "super_secret_bastion_key_change_in_production_12345"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
