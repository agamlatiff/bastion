package config

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

func Load() *Config{
	
}
