package main

import (
	"context"
	"log"

	"github.com/agamlatiff/bastion/services/auth/internal/config"
	"github.com/agamlatiff/bastion/services/auth/internal/handler"
	"github.com/agamlatiff/bastion/services/auth/internal/middleware"
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

	// Audit DI
	auditRepo := repository.NewAuditRepository(dbPool)

	// Auth DI
	userRepo := repository.NewUserRepository(dbPool)
	authService := service.NewAuthService(userRepo, rdb, cfg.JWTSecret, cfg.JWTExpiryHours)
	authHandler := handler.NewAuthHandler(authService, auditRepo)

	// Wallet DI
	walletRepo := repository.NewWalletRepository(dbPool)
	walletService := service.NewWalletService(walletRepo, userRepo, rdb)
	walletHandler := handler.NewWalletHandler(walletService, auditRepo)

	// KYC DI
	kycRepo := repository.NewKYCRepository(dbPool)
	kycService := service.NewKYCService(kycRepo)
	kycHandler := handler.NewKYCHandler(kycService, auditRepo)

	// Initialize Gin router engine
	r := gin.Default()

	// Public Routes
	publicRoutes := r.Group("/api/v1/auth")
	{
		publicRoutes.POST("/register", authHandler.Register)
		publicRoutes.POST("/login", authHandler.Login)
	}

	protectedRoutes := r.Group("/api/v1/auth")
	protectedRoutes.Use(middleware.AuthMiddleware(authService))
	{
		protectedRoutes.GET("/profile", authHandler.GetProfile)
		protectedRoutes.POST("/logout", authHandler.Logout)
		protectedRoutes.GET("/audit-logs", authHandler.GetAuditLogs)
	}

	walletRoutes := r.Group("/api/v1/wallet")
	walletRoutes.Use(middleware.AuthMiddleware(authService))
	{
		walletRoutes.GET("/balance", walletHandler.GetBalance)
		walletRoutes.POST("/topup", walletHandler.TopUp)
		walletRoutes.GET("/transactions", walletHandler.GetTransaction)
		walletRoutes.POST("/transfer", walletHandler.Transfer)
	}

	kycRoutes := r.Group("/api/v1/auth/kyc")
	kycRoutes.Use(middleware.AuthMiddleware(authService))
	{
		kycRoutes.POST("", kycHandler.SubmitKYC)
		kycRoutes.GET("/status", kycHandler.GetKYCStatus)
		kycRoutes.POST("/review", kycHandler.ReviewKYC)
	}

	// Start HTTP Server
	log.Printf("Auth Service is running on port %s", cfg.AppPort)
	if err := r.Run(":" + cfg.AppPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

}
