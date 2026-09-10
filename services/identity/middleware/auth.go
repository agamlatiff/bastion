package middleware

import (
	"net/http"
	"strings"

	"github.com/agamlatiff/bastion/services/identity/security"
	"github.com/gin-gonic/gin"
)

// AuthRequired validates the Authorization Bearer JWT access token and sets "userID" & "claims" into gin.Context.
func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Missing or invalid authorization header",
			})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := security.ValidateToken(tokenStr, jwtSecret, security.TokenTypeAccess)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired access token",
			})
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("claims", claims)
		c.Next()
	}
}
