package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/agamlatiff/bastion/internal/domain"
	"github.com/agamlatiff/bastion/internal/handler"
	"github.com/agamlatiff/bastion/internal/platform/config"
	"github.com/agamlatiff/bastion/internal/platform/middleware"
	"github.com/agamlatiff/bastion/internal/repository"
	"github.com/agamlatiff/bastion/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
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

	// Repositories (Stateless PostgreSQL & Redis abstractions)
	transactor := repository.NewTransactor(dbPool)
	userRepo := repository.NewUserRepository()
	walletRepo := repository.NewWalletRepository()
	txRepo := repository.NewTransactionRepository()
	ledgerRepo := repository.NewLedgerRepository()
	kycRepo := repository.NewKYCRepository()
	auditRepo := repository.NewAuditRepository()
	blacklistRepo := repository.NewTokenBlacklistRepository(rdb)
	refreshRepo := repository.NewRefreshTokenRepository(rdb)
	locker := repository.NewRedisLocker(rdb)

	// Services (100% pure business logic, zero DB/Redis driver coupling)
	authService := service.NewAuthService(transactor, userRepo, walletRepo, blacklistRepo, refreshRepo, cfg.JWTSecret, cfg.JWTExpiryHours)
	walletService := service.NewWalletService(transactor, walletRepo, txRepo, ledgerRepo, userRepo, locker)
	kycService := service.NewKYCService(transactor, kycRepo, userRepo, walletRepo)

	// Handlers (HTTP Presentation layer)
	authHandler := handler.NewAuthHandler(authService, auditRepo, transactor.DB())
	walletHandler := handler.NewWalletHandler(walletService, auditRepo, transactor.DB())
	kycHandler := handler.NewKYCHandler(kycService, auditRepo, transactor.DB())

	// Initialize Gin router engine
	r := gin.New()

	// Middleware
	r.Use(middleware.RequestIDMiddleware())
	r.Use(middleware.SecurityHeaderMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.AllowedOrigins))
	r.Use(middleware.TimeoutMiddleware(10 * time.Second))
	r.Use(middleware.MaxBodySizeMiddleware(1 * 1024 * 1024))

	r.Use(gin.Recovery())
	r.Use(middleware.JSONLoggerMiddleware())
	r.Use(middleware.MetricsMiddleware())

	publicRoutes := r.Group("/api/v1")
	{
		publicRoutes.GET("/healthz", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "Healthcheck",
			})
		})

		publicRoutes.GET("/metrics", gin.WrapH(promhttp.Handler()))
	}

	// Auth Routes
	authPublicRoutes := r.Group("/api/v1/auth")
	{
		authPublicRoutes.POST("/register", middleware.RateLimitMiddleware(rdb, "register", 3, 1*time.Minute), authHandler.Register)
		authPublicRoutes.POST("/login", middleware.RateLimitMiddleware(rdb, "login", 5, 1*time.Minute), authHandler.Login)
		authPublicRoutes.POST("/refresh", middleware.RateLimitMiddleware(rdb, "refresh", 10, 1*time.Minute), authHandler.RefreshToken)
	}

	// Protected Auth Routes
	protectedRoutes := r.Group("/api/v1/auth")
	protectedRoutes.Use(middleware.AuthMiddleware(authService))
	{
		protectedRoutes.GET("/profile", authHandler.GetProfile)
		protectedRoutes.POST("/logout", authHandler.Logout)
		protectedRoutes.GET("/audit-logs", authHandler.GetAuditLogs)
		protectedRoutes.POST("/pin", authHandler.SetPIN)
		protectedRoutes.PUT("/pin", authHandler.ChangePIN)
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
		kycRoutes.POST("/review", middleware.RequireRole(domain.RoleAdmin, domain.RoleKYCReviewer), kycHandler.ReviewKYC)
	}

	srv := &http.Server{
		Addr:    ":" + cfg.AppPort,
		Handler: r,
	}

	go func() {
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
