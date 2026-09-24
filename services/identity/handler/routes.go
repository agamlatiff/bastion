package handler

import (
	"net/http"
	"time"

	"github.com/agamlatiff/bastion/services/identity/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// RegisterRoutes sets up all HTTP endpoints, health check probes, and security middlewares.
func RegisterRoutes(
	router *gin.Engine,
	rdb *redis.Client,
	dbPool *pgxpool.Pool,
	authHdr *AuthHandler,
	adminHdr *AdminHandler,
	jwtSecret string,
) {
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

	// Public & Protected Auth Routes: /v1/auth/*
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
		twoFactor.Use(middleware.AuthRequired(jwtSecret))
		{
			twoFactor.POST("/setup", authHdr.Setup2FA)
			twoFactor.POST("/enable", authHdr.Enable2FA)
			twoFactor.POST("/disable", authHdr.Disable2FA)
		}
	}

	// Admin RBAC Routes: /v1/admin/* (Protected by AuthRequired + RequireRole("ADMIN"))
	admin := v1.Group("/admin")
	admin.Use(middleware.AuthRequired(jwtSecret), middleware.RequireRole("ADMIN"))
	{
		admin.GET("/users", adminHdr.ListUsers)
		admin.POST("/users/:id/roles", adminHdr.AssignRole)
		admin.DELETE("/users/:id/roles/:role", adminHdr.RevokeRole)
		admin.GET("/roles", adminHdr.ListRoles)
	}
}
