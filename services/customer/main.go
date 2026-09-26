package main

import (
	"context"
	"log"
	"time"

	"github.com/agamlatiff/bastion/services/customer/config"
	"github.com/agamlatiff/bastion/services/customer/event"
	"github.com/agamlatiff/bastion/services/customer/handler"
	"github.com/agamlatiff/bastion/services/customer/infra"
	"github.com/agamlatiff/bastion/services/customer/repository"
	"github.com/agamlatiff/bastion/services/customer/security"
	"github.com/agamlatiff/bastion/services/customer/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	log.Printf("[Customer Service] Starting service on port %s...\n", cfg.Port)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. PostgreSQL Database Connection
	dbPool, err := infra.ConnectPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Printf("[Customer Service] Warning: Failed to connect to PostgreSQL: %v\n", err)
	} else {
		defer dbPool.Close()
		log.Println("[Customer Service] Connected to PostgreSQL (customer_db)")
	}

	// 2. Redis Cache Connection (with graceful degradation)
	rdb, err := infra.ConnectRedis(ctx, cfg.RedisHost, cfg.RedisPort, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Printf("[Customer Service] Warning: Redis unavailable, continuing without caching: %v\n", err)
		rdb = nil
	} else {
		defer rdb.Close()
		log.Println("[Customer Service] Connected to Redis")
	}

	// 3. Initialize Repositories
	customerRepo := repository.NewCustomerRepository(dbPool)
	processedEventRepo := repository.NewProcessedEventRepository(dbPool)

	// 4. Initialize Domain Services & JWT Security
	customerService := service.NewCustomerService(customerRepo, rdb)
	jwtService := security.NewJWTService(cfg.JWTSecret)

	// 5. Start Kafka Event Consumers (Background Workers)
	consumerCtx, cancelConsumers := context.WithCancel(context.Background())
	defer cancelConsumers()

	identityConsumer := event.NewIdentityEventConsumer(
		cfg.KafkaBrokers,
		cfg.KafkaIdentityTopic,
		cfg.KafkaIdentityGroupID,
		customerService,
	)
	defer identityConsumer.Close()
	go identityConsumer.Start(consumerCtx)

	walletConsumer := event.NewWalletEventConsumer(
		cfg.KafkaBrokers,
		cfg.KafkaWalletTopic,
		cfg.KafkaWalletGroupID,
		processedEventRepo,
	)
	defer walletConsumer.Close()
	go walletConsumer.Start(consumerCtx)

	// 6. Router Setup
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	customerHdr := handler.NewCustomerHandler(customerService)
	handler.RegisterRoutes(router, dbPool, rdb, customerHdr, jwtService)

	// 7. Start HTTP Server with Graceful Shutdown
	infra.RunHTTPServer(router, cfg.Port)
}
