package handler

import (
	"net/http"

	"github.com/agamlatiff/bastion/services/customer/security"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// RegisterRoutes sets up HTTP routes, health probes, and authentication middleware.
func RegisterRoutes(
	router *gin.Engine,
	dbPool *pgxpool.Pool,
	rdb *redis.Client,
	customerHdr *CustomerHandler,
	jwtSvc *security.JWTService,
) {
	// Liveness & Readiness probes
	router.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP", "service": "customer-service"})
	})

	router.GET("/readyz", func(c *gin.Context) {
		if dbPool != nil {
			if err := dbPool.Ping(c.Request.Context()); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "error": "database unreachable"})
				return
			}
		}
		if rdb != nil {
			if err := rdb.Ping(c.Request.Context()).Err(); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "error": "redis unreachable"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": "READY", "service": "customer-service"})
	})

	// Auth Middleware
	authMiddleware := func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		userID, err := jwtSvc.ExtractUserIDFromHeader(authHeader)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: " + err.Error()})
			return
		}
		c.Set("identity_user_id", userID)
		c.Next()
	}

	// Customer profile API group
	v1 := router.Group("/v1")
	customers := v1.Group("/customers")
	customers.Use(authMiddleware)
	{
		customers.GET("/me", customerHdr.GetProfile)
		customers.PATCH("/me", customerHdr.UpdateProfile)
	}
}
