package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort        string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	RedisHost      string
	RedisPort      string
	JWTSecret      string
	JWTExpiryHours int
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

	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))

	if err != nil {
		expiryHours = 24
	}

	cfg := &Config{
		AppPort:        getEnv("APP_PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5433"),
		DBUser:         getEnv("DB_USER", "bastion"),
		DBPassword:     getEnv("DB_PASSWORD", "bastion_secret"),
		DBName:         getEnv("DB_NAME", "bastion_db"),
		RedisHost:      getEnv("REDIS_HOST", "localhost"),
		RedisPort:      getEnv("REDIS_PORT", "6379"),
		JWTSecret:      jwtSecret,
		JWTExpiryHours: expiryHours,
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
