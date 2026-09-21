package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/agamlatiff/bastion/services/identity/config"
	"github.com/agamlatiff/bastion/services/identity/handler"
	"github.com/agamlatiff/bastion/services/identity/middleware"
	"github.com/agamlatiff/bastion/services/identity/outbox"
	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/agamlatiff/bastion/services/identity/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. Load runtime configuration
	cfg := config.Load()
	log.Printf("[IDENTITY] Starting Identity Service on port :%s...", cfg.Port)

	// 2. Initialize PostgreSQL connection pool with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[IDENTITY] Failed to parse database configuration: %v", err)
	}
	poolConfig.MaxConns = 25
	poolConfig.MinConns = 5
	poolConfig.MaxConnLifetime = 1 * time.Hour
	poolConfig.MaxConnIdleTime = 15 * time.Minute

	dbPool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("[IDENTITY] Unable to create database connection pool: %v", err)
	}
	defer dbPool.Close()

	// 3. Initialize Redis client
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisAddr,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("[IDENTITY] Redis ping failed: %v", err)
	}
	defer rdb.Close()
	log.Println("[IDENTITY] Connected to Redis successfully")

	// Fail-fast health check: ping database
	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("[IDENTITY] Database ping failed: %v", err)
	}
	log.Println("[IDENTITY] Connected to PostgreSQL identity_db successfully")

	// 4. Initialize layers (Clean Architecture / Dependency Injection)
	repo := repository.New(dbPool)
	authCfg := service.AuthConfig{
		JWTSecret:              cfg.JWTSecret,
		AccessTokenExpiryMins:  cfg.AccessTokenExpiryMins,
		RefreshTokenExpiryDays: cfg.RefreshTokenExpiryDays,
		EncryptionKey:          cfg.EncryptionKey,
	}
	authSvc := service.NewAuthService(repo, authCfg)
	authHdr := handler.NewAuthHandler(authSvc)

	// Start Transactional Outbox background worker
	outboxPub := outbox.NewOutboxPublisher(repo, strings.Split(cfg.KafkaBrokers, ","), "bastion.identity.events")
	go outboxPub.Start(context.Background())
	defer outboxPub.Stop()

	// 5. Setup Gin HTTP router
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())

	// Standard health check probes
	router.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP", "service": "identity-service"})
	})
	router.GET("/readyz", func(c *gin.Context) {
		if err := dbPool.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "error": "database unreachable"})
			return
		}
		if err := rdb.Ping(c.Request.Context()).Err(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "error": "redis unreachable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "READY", "service": "identity-service"})
	})

	// 6. Register API routes: /v1/auth/* (Composition Root)
	v1 := router.Group("/v1")
	auth := v1.Group("/auth")
	{
		// Register: max 5 requests per 1 minute
		auth.POST("/register", middleware.RateLimit(rdb, "register", 5, 1*time.Minute), authHdr.Register)

		// Login: max 5 requests per 1 minute (anti brute-force)
		auth.POST("/login", middleware.RateLimit(rdb, "login", 5, 1*time.Minute), authHdr.Login)

		// Refresh: max 10 requests per 1 minute
		auth.POST("/refresh", middleware.RateLimit(rdb, "refresh", 10, 1*time.Minute), authHdr.RefreshToken)

		// Logout: unthrottled
		auth.POST("/logout", authHdr.Logout)

		// 2FA Verification (Login Step 2): max 5 attempts per 1 minute
		auth.POST("/2fa/verify", middleware.RateLimit(rdb, "2fa_verify", 5, 1*time.Minute), authHdr.Verify2FA)

		// Protected 2FA Management Endpoints
		twoFactor := auth.Group("/2fa")
		twoFactor.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			twoFactor.POST("/setup", authHdr.Setup2FA)
			twoFactor.POST("/enable", authHdr.Enable2FA)
			twoFactor.POST("/disable", authHdr.Disable2FA)
		}
	}

	// 6. Configure HTTP Server with sane timeouts
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 7. Start server asynchronously
	go func() {
		log.Printf("[IDENTITY] Listening for HTTP traffic on http://localhost:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[IDENTITY] Server failed to start: %v", err)
		}
	}()

	// 8. Graceful Shutdown on SIGINT/SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[IDENTITY] Shutdown signal received, shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[IDENTITY] Server forced to shutdown: %v", err)
	}

	log.Println("[IDENTITY] Identity Service stopped cleanly")
}
