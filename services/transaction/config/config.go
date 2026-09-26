package config

import (
	"os"
	"strings"
)

// Config holds runtime configuration options for the Transaction service.
type Config struct {
	Port         string
	DatabaseURL  string
	KafkaBrokers []string
	KafkaTopic   string
	JWTSecret    string
}

// Load populates configuration from environment variables with production defaults.
func Load() *Config {
	kafkaBrokersStr := getEnv("KAFKA_BROKERS", "localhost:19092")

	return &Config{
		Port:         getEnv("PORT", "8086"),
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://bastion:bastion_secret@localhost:5433/transaction_db?sslmode=disable"),
		KafkaBrokers: strings.Split(kafkaBrokersStr, ","),
		KafkaTopic:   getEnv("TRANSACTION_EVENTS_TOPIC", "bastion.transaction.events"),
		JWTSecret:    getEnv("JWT_SECRET", "super_secret_bastion_key_change_in_production_12345"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
