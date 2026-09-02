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

type Config struct {
	AppPort           string
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	RedisHost         string
	RedisPort         string
	JWTSecret         string
	JWTExpiryHours    int
	AllowedOrigins    []string
	DataEncryptionKey []byte
	TrustedProxies    []string
}

func LoadConfig() (*Config, error) {
	env := getEnv("APP_ENV", "development")

	envFile := ".env"
	if env == "test" {
		envFile = ".env.test"
	}

	if err := godotenv.Load(envFile); err != nil {
		log.Printf("Info: %s file not found or already loaded from system environment\n", envFile)
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, errors.New("FATAL: JWT_SECRET environment variable is required and cannot be empty")
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" && env == "production" {
		return nil, errors.New("FATAL: DB_PASSWORD is required in production environment")
	}

	rawEncryptionKey := getEnv("DATA_ENCRYPTION_KEY", "01234567890123456789012345678901") // 32-byte default for development
	encryptionKey, err := security.ParseEncryptionKey(rawEncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("FATAL: invalid DATA_ENCRYPTION_KEY: %w", err)
	}

	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		expiryHours = 24
	}

	// Parse comma-separated whitelist origins
	rawOrigins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
	var allowedOrigins []string
	for _, origin := range strings.Split(rawOrigins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	// Parse comma-separated trusted proxies
	rawProxies := getEnv("TRUSTED_PROXIES", "127.0.0.1,::1")
	var trustedProxies []string
	for _, proxy := range strings.Split(rawProxies, ",") {
		trimmed := strings.TrimSpace(proxy)
		if trimmed != "" {
			trustedProxies = append(trustedProxies, trimmed)
		}
	}

	cfg := &Config{
		AppPort:           getEnv("APP_PORT", "8080"),
		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnv("DB_PORT", "5433"),
		DBUser:            getEnv("DB_USER", "bastion"),
		DBPassword:        getEnv("DB_PASSWORD", "bastion_secret"),
		DBName:            getEnv("DB_NAME", "bastion_db"),
		RedisHost:         getEnv("REDIS_HOST", "localhost"),
		RedisPort:         getEnv("REDIS_PORT", "6379"),
		JWTSecret:         jwtSecret,
		JWTExpiryHours:    expiryHours,
		AllowedOrigins:    allowedOrigins,
		DataEncryptionKey: encryptionKey,
		TrustedProxies:    trustedProxies,
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	value, exists := os.LookupEnv(key)
	if !exists || value == "" {
		return defaultValue
	}
	return value
}

func (c *Config) DatabaseURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}
