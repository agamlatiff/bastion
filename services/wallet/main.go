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

	"github.com/agamlatiff/bastion/services/wallet/client"
	"github.com/agamlatiff/bastion/services/wallet/config"
	"github.com/agamlatiff/bastion/services/wallet/handler"
	"github.com/agamlatiff/bastion/services/wallet/middleware"
	"github.com/agamlatiff/bastion/services/wallet/outbox"
	"github.com/agamlatiff/bastion/services/wallet/repository"
	"github.com/agamlatiff/bastion/services/wallet/service"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()
	log.Println("[Wallet Service] Starting service...")

	// 1. Database Connection Pool
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[Wallet Service] Failed to parse database URL: %v", err)
	}
	poolConfig.MaxConns = 25
	poolConfig.MinConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("[Wallet Service] Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("[Wallet Service] Database ping failed: %v", err)
	}
	log.Println("[Wallet Service] Connected to PostgreSQL (wallet_db)")

	// 2. Initialize Layers
	ledgerClient := client.NewLedgerClient(cfg.LedgerServiceURL, cfg.InternalAuth)
	walletRepo := repository.NewWalletRepository(pool)
	walletService := service.NewWalletService(walletRepo, ledgerClient)
	walletHandler := handler.NewWalletHandler(walletService)

	// 3. Start Outbox Publisher Background Worker
	outboxPublisher := outbox.NewOutboxPublisher(walletRepo, cfg.KafkaBrokers, cfg.KafkaTopic)
	outboxCtx, outboxCancel := context.WithCancel(context.Background())
	defer outboxCancel()
	go outboxPublisher.Start(outboxCtx)

	// 4. Router Setup
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

	// Protected Routes (JWT Bearer Token Required)
	v1 := router.Group("/v1/wallets")
	v1.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		v1.POST("", walletHandler.CreateWallet)
		v1.GET("", walletHandler.ListCustomerWallets)
		v1.GET("/:id", walletHandler.GetWallet)
		v1.GET("/:id/balance", walletHandler.GetBalance)
		v1.POST("/:id/freeze", walletHandler.FreezeWallet)
		v1.POST("/:id/unfreeze", walletHandler.UnfreezeWallet)
	}

	// 5. HTTP Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[Wallet Service] HTTP Server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[Wallet Service] Server error: %v", err)
		}
	}()

	// Listen for termination signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[Wallet Service] Shutting down gracefully...")

	outboxCancel() // Stop outbox background worker

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[Wallet Service] Forced shutdown error: %v", err)
	}

	log.Println("[Wallet Service] Service exited cleanly")
}
