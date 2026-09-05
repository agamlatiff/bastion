package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/agamlatiff/bastion/internal/platform/security"
	"github.com/joho/godotenv"
)

// defaultDevEncryptionKey is a 32-byte key strictly used for local development.
const defaultDevEncryptionKey = "01234567890123456789012345678901"

// Config holds all centralized runtime configuration for the platform.
type Config struct {
	AppEnv            string
	AppPort           string
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBSSLMode         string
	RedisHost         string
	RedisPort         string
	KafkaBrokers      []string
	JWTSecret         string
	JWTExpiryHours    int
	AllowedOrigins    []string
	DataEncryptionKey []byte
	TrustedProxies    []string
}

// LoadConfig reads configuration from environment variables or .env files,
// applying strict validation and fail-fast assertions in production mode.
func LoadConfig() (*Config, error) {
	env := getEnv("APP_ENV", "development")

	envFile := ".env"
	if env == "test" {
		envFile = ".env.test"
	}

	if err := godotenv.Load(envFile); err != nil {
		log.Printf("Info: %s file not found or already loaded from system environment\n", envFile)
	}

	// 1. JWT Secret validation
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("FATAL: JWT_SECRET environment variable is required and cannot be empty")
	}
	if env == "production" && strings.Contains(jwtSecret, "change_in_production") {
		return nil, errors.New("FATAL: JWT_SECRET is using default placeholder in production environment")
	}

	// 2. Database password validation (fail-fast in production)
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" && env == "production" {
		return nil, errors.New("FATAL: DB_PASSWORD is required in production environment")
	}
	if dbPassword == "" {
		dbPassword = "bastion_secret"
	}

	// 3. Data encryption key validation (prevent default fallback in production)
	rawEncryptionKey := os.Getenv("DATA_ENCRYPTION_KEY")
	if rawEncryptionKey == "" {
		if env == "production" {
			return nil, errors.New("FATAL: DATA_ENCRYPTION_KEY is required in production environment")
		}
		rawEncryptionKey = defaultDevEncryptionKey
	} else if env == "production" && rawEncryptionKey == defaultDevEncryptionKey {
		return nil, errors.New("FATAL: DATA_ENCRYPTION_KEY cannot use default development key in production")
	}
	encryptionKey, err := security.ParseEncryptionKey(rawEncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("FATAL: invalid DATA_ENCRYPTION_KEY: %w", err)
	}

	// 4. Parse JWT expiry hours
	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		expiryHours = 24
	}

	// 5. Parse Kafka broker addresses (comma-separated)
	rawKafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:19092")
	var kafkaBrokers []string
	for _, broker := range strings.Split(rawKafkaBrokers, ",") {
		trimmed := strings.TrimSpace(broker)
		if trimmed != "" {
			kafkaBrokers = append(kafkaBrokers, trimmed)
		}
	}
	// 6. Parse allowed CORS origins (comma-separated)
	rawOrigins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
	var allowedOrigins []string
	for _, origin := range strings.Split(rawOrigins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	// 7. Parse trusted proxy IPs (comma-separated)
	rawProxies := getEnv("TRUSTED_PROXIES", "127.0.0.1,::1")
	var trustedProxies []string
	for _, proxy := range strings.Split(rawProxies, ",") {
		trimmed := strings.TrimSpace(proxy)
		if trimmed != "" {
			trustedProxies = append(trustedProxies, trimmed)
		}
	}

	cfg := &Config{
		AppEnv:            env,
		AppPort:           getEnv("APP_PORT", "8080"),
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "5433"),
		DBUser:            getEnv("DB_USER", "bastion"),
		DBPassword:        dbPassword,
		DBName:            getEnv("DB_NAME", "bastion_db"),
		DBSSLMode:         getEnv("DB_SSLMODE", "disable"),
		RedisHost:         getEnv("REDIS_HOST", "localhost"),
		RedisPort:         getEnv("REDIS_PORT", "6379"),
		KafkaBrokers:      kafkaBrokers,
		JWTSecret:         jwtSecret,
		JWTExpiryHours:    expiryHours,
		AllowedOrigins:    allowedOrigins,
		DataEncryptionKey: encryptionKey,
		TrustedProxies:    trustedProxies,
	}
	return cfg, nil
}

// getEnv retrieves an environment variable or returns the defaultValue if not present.
func getEnv(key, defaultValue string) string {
	value, exists := os.LookupEnv(key)
	if !exists || value == "" {
		return defaultValue
	}
	return value
}

// DatabaseURL constructs the PostgreSQL connection string using the configured SSL mode.
func (c *Config) DatabaseURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode)
}

// RedisAddr returns the formatted Redis host:port address.
func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}
