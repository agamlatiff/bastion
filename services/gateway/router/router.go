package router

import (
	"net/http"
	"time"

	"github.com/agamlatiff/bastion/services/gateway/config"
	"github.com/agamlatiff/bastion/services/gateway/middleware"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// New constructs and configures the Gin engine with all gateway middlewares,
// health check probes, Prometheus metrics endpoint, and reverse proxy routing rules.
func New(cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	// Attach standard security and observability middlewares
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.Timeout(time.Duration(cfg.RequestTimeoutSec) * time.Second))
	r.Use(middleware.BodyLimit(cfg.MaxBodyBytes))
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(middleware.JSONLogger())

	// Health check endpoints (Liveness & Readiness probes)
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

	// Protected Prometheus metrics endpoint (requires Basic Auth)
	metricsGroup := r.Group("", gin.BasicAuth(gin.Accounts{
		cfg.MetricsUser: cfg.MetricsPassword,
	}))
	metricsGroup.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Public API Reverse Proxy Routing
	proxyIdentity := NewReverseProxy(cfg.IdentityServiceURL)
	proxyCustomer := NewReverseProxy(cfg.CustomerServiceURL)
	proxyWallet := NewReverseProxy(cfg.WalletServiceURL)
	proxyKYC := NewReverseProxy(cfg.KYCServiceURL)
	proxyTransaction := NewReverseProxy(cfg.TransactionServiceURL)

	r.Any("/v1/auth", proxyIdentity)
	r.Any("/v1/auth/*path", proxyIdentity)
	r.Any("/v1/customers", proxyCustomer)
	r.Any("/v1/customers/*path", proxyCustomer)
	r.Any("/v1/wallets", proxyWallet)
	r.Any("/v1/wallets/*path", proxyWallet)
	r.Any("/v1/kyc", proxyKYC)
	r.Any("/v1/kyc/*path", proxyKYC)
	r.Any("/v1/transactions", proxyTransaction)
	r.Any("/v1/transactions/*path", proxyTransaction)
	r.Any("/v1/transfers", proxyTransaction)
	r.Any("/v1/transfers/*path", proxyTransaction)
	r.Any("/v1/topups", proxyTransaction)
	r.Any("/v1/topups/*path", proxyTransaction)

	return r
}
