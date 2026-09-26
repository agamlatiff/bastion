package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds runtime configuration options for the customer service.
type Config struct {
	Port                 string
	DatabaseURL          string
	RedisHost            string
	RedisPort            string
	RedisPassword        string
	RedisDB              int
	KafkaBrokers         []string
	KafkaIdentityTopic   string
	KafkaWalletTopic     string
	KafkaIdentityGroupID string
	KafkaWalletGroupID   string
	JWTSecret            string
}

// Load populates configuration from environment variables with production-ready defaults.
func Load() *Config {
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	kafkaBrokersStr := getEnv("KAFKA_BROKERS", "localhost:19092")

	return &Config{
		Port:                 getEnv("PORT", "8082"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://bastion:bastion_secret@localhost:5433/customer_db?sslmode=disable"),
		RedisHost:            getEnv("REDIS_HOST", "localhost"),
		RedisPort:            getEnv("REDIS_PORT", "6379"),
		RedisPassword:        getEnv("REDIS_PASSWORD", ""),
		RedisDB:              redisDB,
		KafkaBrokers:         strings.Split(kafkaBrokersStr, ","),
		KafkaIdentityTopic:   getEnv("KAFKA_IDENTITY_TOPIC", "bastion.identity.events"),
		KafkaWalletTopic:     getEnv("KAFKA_WALLET_TOPIC", "bastion.wallet.events"),
		KafkaIdentityGroupID: getEnv("KAFKA_IDENTITY_GROUP_ID", "customer-service-group"),
		KafkaWalletGroupID:   getEnv("KAFKA_WALLET_GROUP_ID", "customer-wallet-group"),
		JWTSecret:            getEnv("JWT_SECRET", "super_secret_bastion_key_change_in_production_12345"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
