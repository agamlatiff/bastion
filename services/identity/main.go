package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/agamlatiff/bastion/services/identity/config"
	"github.com/agamlatiff/bastion/services/identity/handler"
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
	authSvc := service.NewAuthService(repo, cfg)
	authHdr := handler.NewAuthHandler(authSvc)

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

	// Register API routes: /v1/auth/*
	v1 := router.Group("/v1")
	authHdr.RegisterRoutes(v1, rdb)

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
