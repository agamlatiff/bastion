package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/agamlatiff/bastion/internal/audit"
	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/agamlatiff/bastion/internal/kyc"
	"github.com/agamlatiff/bastion/internal/platform/config"
	"github.com/agamlatiff/bastion/internal/platform/middleware"
	"github.com/agamlatiff/bastion/internal/wallet"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	// Load environment configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

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

	// Dependency Injection (Wiring modular packages)

	// Audit Module
	auditRepo := audit.NewRepository(dbPool)

	// Auth Module
	userRepo := auth.NewRepository(dbPool)
	authService := auth.NewService(userRepo, rdb, cfg.JWTSecret, cfg.JWTExpiryHours)
	authHandler := auth.NewHandler(authService, auditRepo)

	// Wallet Module
	walletRepo := wallet.NewRepository(dbPool)
	walletService := wallet.NewService(walletRepo, userRepo, rdb)
	walletHandler := wallet.NewHandler(walletService, auditRepo)

	// KYC Module
	kycRepo := kyc.NewRepository(dbPool)
	kycService := kyc.NewService(kycRepo)
	kycHandler := kyc.NewHandler(kycService, auditRepo)

	// Initialize Gin router engine
	r := gin.New()

	// Middleware
	r.Use(middleware.RequestIDMiddleware())
	r.Use(middleware.SecurityHeaderMiddleware())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.TimeoutMiddleware(10 * time.Second))
	r.Use(middleware.MaxBodySizeMiddleware(1 * 1024 * 1024))

	r.Use(gin.Recovery())
	r.Use(middleware.JSONLoggerMiddleware())


	publicRoutes := r.Group("/api/v1")
	{
		publicRoutes.GET("/healthz", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status": "ok",
				"message": "Healthcheck",
			})
		})
	}

	// Auth Routes
	authPublicRoutes := r.Group("/api/v1/auth")
	{
		authPublicRoutes.POST("/register", middleware.RateLimitMiddleware(rdb, "register", 3, 1*time.Minute), authHandler.Register)
		authPublicRoutes.POST("/login", middleware.RateLimitMiddleware(rdb, "login", 5, 1*time.Minute), authHandler.Login)
	}

	// Protected Auth Routes
	protectedRoutes := r.Group("/api/v1/auth")
	protectedRoutes.Use(middleware.AuthMiddleware(authService))
	{
		protectedRoutes.GET("/profile", authHandler.GetProfile)
		protectedRoutes.POST("/logout", authHandler.Logout)
		protectedRoutes.GET("/audit-logs", authHandler.GetAuditLogs)
	}

	// Protected Wallet Routes
	walletRoutes := r.Group("/api/v1/wallet")
	walletRoutes.Use(middleware.AuthMiddleware(authService))
	{
		walletRoutes.GET("/balance", walletHandler.GetBalance)
		walletRoutes.POST("/topup", walletHandler.TopUp)
		walletRoutes.GET("/transactions", walletHandler.GetTransaction)
		walletRoutes.POST("/transfer", walletHandler.Transfer)
	}

	// Protected KYC Routes
	kycRoutes := r.Group("/api/v1/auth/kyc")
	kycRoutes.Use(middleware.AuthMiddleware(authService))
	{
		kycRoutes.POST("", kycHandler.SubmitKYC)
		kycRoutes.GET("/status", kycHandler.GetKYCStatus)
		kycRoutes.POST("/review", middleware.RequireRole(auth.RoleAdmin, auth.RoleKYCReviewer), kycHandler.ReviewKYC)
	}

	srv := &http.Server{
		Addr: ":" + cfg.AppPort,
		Handler: r,
	}

	go func ()  {
		log.Printf("Bastion API is running on port %s", cfg.AppPort)
		
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit
	log.Println("Shutting down server... Giving 5 seconds for pending transactions to finish")

	ctxShutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctxShutdown); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting gracefully. Goodbye!")
}
