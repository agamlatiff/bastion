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

	"github.com/agamlatiff/bastion/services/gateway/config"
	"github.com/agamlatiff/bastion/services/gateway/middleware"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	// 1. Load runtime configuration
	cfg := config.Load()

	// 2. Setup Gin router (Release Mode)
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// 3. Attach standard gateway security and observability middlewares
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.SecurityHeaders())

	r.Use(middleware.Timeout(time.Duration(cfg.RequestTimeoutSec) * time.Second))
	r.Use(middleware.BodyLimit(cfg.MaxBodyBytes))
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(middleware.JSONLogger())

	// 4. Health Check endpoints (Liveness & Readiness probes)
	r.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "alive",
		})
	})
	r.GET("/readyz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ready",
		})
	})

	// 5. Protected Prometheus metrics endpoint (requires Basic Auth)
	metricsGroup := r.Group("", gin.BasicAuth(gin.Accounts{
		cfg.MetricsUser: cfg.MetricsPassword,
	}))
	metricsGroup.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 6. Configure HTTP Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 7. Start server in a background goroutine
	go func() {
		log.Printf("[GATEWAY] Service started successfully on port %s\n", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[GATEWAY FATAL] Listen and serve failed: %v\n", err)
		}
	}()

	// 8. Graceful Shutdown listener
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit // Block execution until interrupt signal received
	log.Println("[GATEWAY] Shutdown signal received, gracefully draining connections...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[GATEWAY FATAL] Forced shutdown due to timeout: %v\n", err)
	}
	log.Println("[GATEWAY] Server exited cleanly.")
}
