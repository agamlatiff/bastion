package middleware

import (
	"net/http"
	"strings"

	"github.com/agamlatiff/bastion/services/auth/internal/service"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware(authService service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Header Authorization
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  "Missing or invalid authorization header",
			})
			return
		}

		// Get Token Authorization
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// Validation token & check redis blacklist via AuthService
		user, err := authService.ValidateToken(c.Request.Context(), tokenStr)

		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}

		// Save user data & raw token into Context Gin
		c.Set("currentUser", user)
		c.Set("token", tokenStr)

		// Next Handler
		c.Next()
	}
}
