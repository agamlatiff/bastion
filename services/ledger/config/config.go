package config

import (
	"os"
	"strings"
)

// Config holds runtime configuration for Ledger Service.
type Config struct {
	Port         string
	DatabaseURL  string
	InternalAuth string
}

// Load loads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8084"), // Port 8084 (Identity: 8081, Customer: 8082, Wallet: 8083)
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://bastion:bastion_secret@localhost:5433/ledger_db?sslmode=disable"),
		InternalAuth: getEnv("INTERNAL_API_SECRET", "bastion_internal_service_secret_2026"),
	}
}

func getEnv(key, defaultValue string) string {
	if val, exists := os.LookupEnv(key); exists && strings.TrimSpace(val) != "" {
		return val
	}
	return defaultValue
}
