package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// InternalAuthMiddleware ensures only trusted internal services (like Wallet Service)
// can access internal Ledger endpoints using a pre-shared secret header.
func InternalAuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		incomingSecret := c.GetHeader("X-Internal-Secret")
		if incomingSecret == "" || incomingSecret != secret {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Invalid or missing internal service secret",
			})
			return
		}
		c.Next()
	}
}
