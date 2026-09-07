package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds runtime settings specific to the API Gateway.
type Config struct {
	Port              string
	AllowedOrigins    []string
	MetricsUser       string
	MetricsPassword   string
	RequestTimeoutSec int
	MaxBodyBytes      int64
}

// Load reads Gateway configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		AllowedOrigins:    getEnvAsSlice("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"),
		MetricsUser:       getEnv("METRICS_USER", "bastion_metrics"),
		MetricsPassword:   getEnv("METRICS_PASSWORD", "bastion_metrics_secret"),
		RequestTimeoutSec: getEnvAsInt("REQUEST_TIMEOUT_SEC", 15),
		MaxBodyBytes:      getEnvAsInt64("MAX_BODY_BYTES", 2*1024*1024), // Default: 2MB limit
	}
}

func getEnv(key, defaultValue string) string {
	if val, exists := os.LookupEnv(key); exists && strings.TrimSpace(val) != "" {
		return val
	}
	return defaultValue
}


func getEnvAsSlice(key, defaultValue string) []string {
	raw := getEnv(key, defaultValue)
	var items []string
	for _, item := range strings.Split(raw, ",") {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			items = append(items, trimmed)
		}
	}
	return items
}

func getEnvAsInt(key string, defaultValue int) int {
	if valStr := os.Getenv(key); valStr != "" {
		if val, err := strconv.Atoi(valStr); err == nil {
			return val
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if valStr := os.Getenv(key); valStr != "" {
		if val, err := strconv.ParseInt(valStr, 10, 64); err == nil {
			return val
		}
	}
	return defaultValue
}
