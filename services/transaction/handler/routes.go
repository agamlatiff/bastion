package handler

import (
	"net/http"

	"github.com/agamlatiff/bastion/services/transaction/security"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes registers HTTP routes, security middlewares, and role authorization gates.
func RegisterRoutes(
	router *gin.Engine,
	dbPool *pgxpool.Pool,
	txHdr *TransactionHandler,
	jwtSvc *security.JWTService,
) {
	// Liveness and Readiness Probes
	router.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP", "service": "transaction-service"})
	})

	router.GET("/readyz", func(c *gin.Context) {
		if dbPool != nil {
			if err := dbPool.Ping(c.Request.Context()); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "error": "database unreachable"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": "READY", "service": "transaction-service"})
	})

	// Auth Middleware
	authMiddleware := func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		claims, err := jwtSvc.ExtractClaims(authHeader)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": err.Error(),
				},
			})
			return
		}
		c.Set("claims", claims)
		c.Next()
	}

	// Role-based Access Control Middleware
	requireRole := func(allowedRoles ...string) gin.HandlerFunc {
		return func(c *gin.Context) {
			claimsVal, exists := c.Get("claims")
			if !exists {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"error": gin.H{
						"code":    "UNAUTHORIZED",
						"message": "authentication claims not found",
					},
				})
				return
			}
			claims := claimsVal.(*security.UserClaims)

			hasPermission := false
			for _, role := range allowedRoles {
				if security.HasRole(claims.Roles, role) {
					hasPermission = true
					break
				}
			}

			if !hasPermission {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error": gin.H{
						"code":    "FORBIDDEN",
						"message": "insufficient permissions for this resource",
					},
				})
				return
			}

			c.Next()
		}
	}

	// Protected Transaction Endpoints
	v1 := router.Group("/v1")
	v1.Use(authMiddleware)
	{
		// Transaction orchestration endpoints
		txGroup := v1.Group("/transactions")
		{
			txGroup.POST("", txHdr.CreateTransaction)
			txGroup.POST("/transfers", txHdr.Transfer)
			txGroup.POST("/topups", txHdr.Topup)
			txGroup.GET("", txHdr.List)
			txGroup.GET("/:id", txHdr.GetByID)
			txGroup.GET("/:id/history", txHdr.GetHistory)
			txGroup.PATCH("/:id/status", requireRole("ADMIN", "OPERATIONS"), txHdr.UpdateStatus)
		}

		// Direct convenience aliases matching PRD specifications
		v1.POST("/transfers", txHdr.Transfer)
		v1.POST("/topups", txHdr.Topup)
	}
}
