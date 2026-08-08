package main

import (
	"context"
	"log"

	"github.com/agamlatiff/bastion/services/auth/internal/config"
	"github.com/agamlatiff/bastion/services/auth/internal/handler"
	"github.com/agamlatiff/bastion/services/auth/internal/repository"
	"github.com/agamlatiff/bastion/services/auth/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	// Load environment configuration
	cfg := config.LoadConfig()

	// Connect to PostgreSQL database pool
	ctx := context.Background()
	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL())
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}

	defer dbPool.Close()

	// Connect to Redis Client
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr(),
	})

	defer rdb.Close()

	// Dependency Injection (Wiring layers together)
	userRepo := repository.NewUserRepository(dbPool)
	authService := service.NewAuthService(userRepo, rdb, cfg.JWTSecret, cfg.JWTExpiryHours)
	authHandler := handler.NewAuthHandler(authService)

	// Initialize Gin router engine
	r := gin.Default()

	// Register Auth API Routes
	authRoutes := r.Group("/api/v1/auth")
	{
		authRoutes.POST("/register", authHandler.Register)
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.GET("/profile", authHandler.GetProfile)
		authRoutes.POST("/logout", authHandler.Logout)
	}

	// Start HTTP Server
	log.Printf("Auth Service is running on port %s", cfg.AppPort)
	if err := r.Run(":" + cfg.AppPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

}
