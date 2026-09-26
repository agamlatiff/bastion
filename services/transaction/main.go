package main

import (
	"context"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/transaction/config"
	"github.com/agamlatiff/bastion/services/transaction/handler"
	"github.com/agamlatiff/bastion/services/transaction/infra"
	"github.com/agamlatiff/bastion/services/transaction/outbox"
	"github.com/agamlatiff/bastion/services/transaction/repository"
	"github.com/agamlatiff/bastion/services/transaction/security"
	"github.com/agamlatiff/bastion/services/transaction/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	log.Printf("[Transaction Service] Starting service on port %s...\n", cfg.Port)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. PostgreSQL Database Connection
	dbPool, err := infra.ConnectPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("[Transaction Service] Warning: Failed to connect to PostgreSQL: %v\n", err)
	} else {
		defer dbPool.Close()
		log.Println("[Transaction Service] Connected to PostgreSQL (transaction_db)")
	}

	// 2. Initialize Repositories
	txRepo := repository.NewTransactionRepository(dbPool)
	outboxRepo := repository.NewOutboxRepository(dbPool)

	// 3. Initialize Domain Services
	txService := service.NewTransactionService(txRepo)
	jwtService := security.NewJWTService(cfg.JWTSecret)

	// 4. Start Outbox Event Publisher (Background Worker)
	outboxCtx, cancelOutbox := context.WithCancel(context.Background())
	defer cancelOutbox()

	outboxPublisher := outbox.NewPublisher(outboxRepo, cfg.KafkaBrokers, cfg.KafkaTopic)
	defer outboxPublisher.Stop()
	go outboxPublisher.Start(outboxCtx)

	// 5. Router Setup
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	txHdr := handler.NewTransactionHandler(txService)
	handler.RegisterRoutes(router, dbPool, txHdr, jwtService)

	// 6. Start HTTP Server with Graceful Shutdown
	infra.RunHTTPServer(router, cfg.Port)
}
