package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds runtime configuration for Wallet Service.
type Config struct {
	Port             string
	DatabaseURL      string
	RedisAddr        string
	JWTSecret        string
	LedgerServiceURL string
	InternalAuth     string
}

// Load loads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8083"),
		DatabaseURL:      getEnv("DATABASE_URL", "postgres://bastion:bastion_secret@localhost:5433/wallet_db?sslmode=disable"),
		RedisAddr:        getEnv("REDIS_ADDR", "localhost:6379"),
		JWTSecret:        getEnv("JWT_SECRET", "super_secret_bastion_key_change_in_production_12345"),
		LedgerServiceURL: getEnv("LEDGER_SERVICE_URL", "http://localhost:8084"),
		InternalAuth:     getEnv("INTERNAL_API_SECRET", "bastion_internal_service_secret_2026"),
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
