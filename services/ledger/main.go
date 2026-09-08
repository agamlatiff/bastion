package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/agamlatiff/bastion/services/ledger/config"
	"github.com/agamlatiff/bastion/services/ledger/handler"
	"github.com/agamlatiff/bastion/services/ledger/middleware"
	"github.com/agamlatiff/bastion/services/ledger/repository"
	"github.com/agamlatiff/bastion/services/ledger/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()
	log.Println("[Ledger Service] Starting service...")

	// 1. PostgreSQL Connection Pool
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[Ledger Service] Failed to parse database URL: %v", err)
	}
	poolConfig.MaxConns = 25
	poolConfig.MinConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("[Ledger Service] Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("[Ledger Service] Database ping failed: %v", err)
	}
	log.Println("[Ledger Service] Connected to PostgreSQL (ledger_db)")

	// 2. Initialize Layers
	ledgerRepo := repository.NewLedgerRepository(pool)
	ledgerService := service.NewLedgerService(ledgerRepo)
	ledgerHandler := handler.NewLedgerHandler(ledgerService)

	// 3. Router Setup
	router := gin.Default()

	// Health Check Endpoints
	router.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP"})
	})

	router.GET("/readyz", func(c *gin.Context) {
		pingCtx, pingCancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer pingCancel()

		if err := pool.Ping(pingCtx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "error": "database unreachable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "READY"})
	})

	// Internal Routes (Protected by Shared Secret Header)
	internal := router.Group("/internal/v1/ledger")
	internal.Use(middleware.InternalAuthMiddleware(cfg.InternalAuth))
	{
		internal.POST("/accounts", ledgerHandler.CreateAccount)
		internal.GET("/accounts/:id", ledgerHandler.GetAccount)
		internal.GET("/accounts/by-code/:code", ledgerHandler.GetAccountByCode)
	}

	// 4. HTTP Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[Ledger Service] HTTP Server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[Ledger Service] Server error: %v", err)
		}
	}()

	// Listen for termination signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[Ledger Service] Shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[Ledger Service] Forced shutdown error: %v", err)
	}

	log.Println("[Ledger Service] Service exited cleanly")
}
