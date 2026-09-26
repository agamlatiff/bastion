package main

import (
	"context"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/kyc/config"
	"github.com/agamlatiff/bastion/services/kyc/handler"
	"github.com/agamlatiff/bastion/services/kyc/infra"
	"github.com/agamlatiff/bastion/services/kyc/outbox"
	"github.com/agamlatiff/bastion/services/kyc/repository"
	"github.com/agamlatiff/bastion/services/kyc/security"
	"github.com/agamlatiff/bastion/services/kyc/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	log.Printf("[KYC Service] Starting service on port %s...\n", cfg.Port)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. PostgreSQL Database Connection
	dbPool, err := infra.ConnectPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("[KYC Service] Warning: Failed to connect to PostgreSQL: %v\n", err)
	} else {
		defer dbPool.Close()
		log.Println("[KYC Service] Connected to PostgreSQL (kyc_db)")
	}

	// 2. Initialize Repositories
	kycRepo := repository.NewKYCRepository(dbPool)
	outboxRepo := repository.NewOutboxRepository(dbPool)

	// 3. Initialize Services
	kycService := service.NewKYCService(kycRepo, cfg.EncryptionKey)
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

	kycHdr := handler.NewKYCHandler(kycService)
	handler.RegisterRoutes(router, dbPool, kycHdr, jwtService)

	// 6. Start HTTP Server with Graceful Shutdown
	infra.RunHTTPServer(router, cfg.Port)
}
