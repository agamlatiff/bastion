package middleware

import (
	"net/http"

	"github.com/agamlatiff/bastion/internal/auth"
	"github.com/gin-gonic/gin"
)

func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("currentUser")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  "unauthorized: authentication required",
			})
			return
		}

		currentUser, ok := userVal.(*auth.User)
		if !ok || currentUser == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  "unauthorized: invalid user context",
			})
			return
		}

		for _, role := range allowedRoles {
			if currentUser.Role == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"status": "error",
			"error":  "forbidden: insufficient permissions",
		})
	}
}
