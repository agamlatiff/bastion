package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds runtime configuration for Identity Service.
type Config struct {
	Port                   string
	DatabaseURL            string
	RedisAddr              string
	JWTSecret              string
	AccessTokenExpiryMins  int
	RefreshTokenExpiryDays int
	KafkaBrokers           string
	EncryptionKey          string
}

// Load loads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:                   getEnv("PORT", "8081"), // Port 8081 (Gateway uses 8080)
		DatabaseURL:            getEnv("DATABASE_URL", "postgres://bastion:bastion_secret@localhost:5433/identity_db?sslmode=disable"),
		RedisAddr:              getEnv("REDIS_ADDR", "localhost:6379"),
		JWTSecret:              getEnv("JWT_SECRET", "super_secret_bastion_key_change_in_production_12345"),
		AccessTokenExpiryMins:  getEnvAsInt("ACCESS_TOKEN_EXPIRY_MINS", 15),
		RefreshTokenExpiryDays: getEnvAsInt("REFRESH_TOKEN_EXPIRY_DAYS", 7),
		KafkaBrokers:           getEnv("KAFKA_BROKERS", "localhost:19092"),
		EncryptionKey:          getEnv("ENCRYPTION_KEY", "01234567890123456789012345678901"), // 32 bytes for AES-256
	}
}

func getEnv(key, defaultValue string) string {
	if val, exists := os.LookupEnv(key); exists && strings.TrimSpace(val) != "" {
		return val
	}
	return defaultValue
}
func getEnvAsInt(key string, defaultValue int) int {
	if valStr := os.Getenv(key); valStr != "" {
		if val, err := strconv.Atoi(valStr); err == nil {
			return val
		}
	}
	return defaultValue
}
