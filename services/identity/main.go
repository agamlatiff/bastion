package main

import (
	"context"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/identity/config"
	"github.com/agamlatiff/bastion/services/identity/handler"
	"github.com/agamlatiff/bastion/services/identity/infra"
	"github.com/agamlatiff/bastion/services/identity/outbox"
	"github.com/agamlatiff/bastion/services/identity/repository"
	"github.com/agamlatiff/bastion/services/identity/service"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load runtime configuration
	cfg := config.Load()
	log.Printf("[IDENTITY] Starting Identity Service on port :%s...", cfg.Port)

	// 2. Connect infrastructure with fail-fast health checks
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbPool, err := infra.ConnectPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[IDENTITY] %v", err)
	}
	defer dbPool.Close()
	log.Println("[IDENTITY] Connected to PostgreSQL identity_db successfully")

	rdb, err := infra.ConnectRedis(ctx, cfg.RedisAddr)
	if err != nil {
		log.Fatalf("[IDENTITY] %v", err)
	}
	defer rdb.Close()
	log.Println("[IDENTITY] Connected to Redis successfully")

	// 3. Assemble Clean Architecture layers (Composition Root)
	repo := repository.New(dbPool)

	authCfg := service.AuthConfig{
		JWTSecret:              cfg.JWTSecret,
		AccessTokenExpiryMins:  cfg.AccessTokenExpiryMins,
		RefreshTokenExpiryDays: cfg.RefreshTokenExpiryDays,
		EncryptionKey:          cfg.EncryptionKey,
	}
	authSvc := service.NewAuthService(repo, authCfg)
	authHdr := handler.NewAuthHandler(authSvc)

	adminSvc := service.NewAdminService(repo)
	adminHdr := handler.NewAdminHandler(adminSvc)

	// 4. Start Transactional Outbox background worker
	outboxPub := outbox.NewOutboxPublisher(repo, cfg.KafkaBrokerList(), "bastion.identity.events")
	go outboxPub.Start(context.Background())
	defer outboxPub.Stop()

	// 5. Mount HTTP routes
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery())
	handler.RegisterRoutes(router, rdb, dbPool, authHdr, adminHdr, cfg.JWTSecret)

	// 6. Run HTTP server with graceful shutdown
	infra.RunHTTPServer(router, cfg.Port)
}
