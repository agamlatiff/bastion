package handler

import (
	"net/http"

	"github.com/agamlatiff/bastion/services/kyc/security"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes registers HTTP routes, security middlewares, and role authorization gates.
func RegisterRoutes(
	router *gin.Engine,
	dbPool *pgxpool.Pool,
	kycHdr *KYCHandler,
	jwtSvc *security.JWTService,
) {
	// Liveness and Readiness Probes
	router.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP", "service": "kyc-service"})
	})

	router.GET("/readyz", func(c *gin.Context) {
		if dbPool != nil {
			if err := dbPool.Ping(c.Request.Context()); err != nil {
				c.JSON(http.StatusServiceUnavailable, gin.H{"status": "DOWN", "error": "database unreachable"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": "READY", "service": "kyc-service"})
	})

	// Auth Middleware
	authMiddleware := func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		claims, err := jwtSvc.ExtractClaims(authHeader)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: " + err.Error()})
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
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
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
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: insufficient permissions"})
				return
			}

			c.Next()
		}
	}

	// Protected KYC Endpoints
	v1 := router.Group("/v1")
	kyc := v1.Group("/kyc")
	kyc.Use(authMiddleware)
	{
		// End-user actions
		kyc.POST("", kycHdr.SubmitKYC)
		kyc.GET("/me", kycHdr.GetMyKYC)

		// Admin / KYC Reviewer actions
		kyc.POST("/:id/review", requireRole("ADMIN", "KYC_REVIEWER"), kycHdr.ReviewKYC)
	}
}
