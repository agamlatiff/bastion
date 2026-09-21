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

// RequireRole enforces that the authenticated caller has at least one of the specified roles.
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get("claims")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Authentication required",
			})
			return
		}

		claims, ok := claimsVal.(*security.TokenClaims)
		if !ok || claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Invalid token claims context",
			})
			return
		}

		if claims.HasAnyRole(allowedRoles...) {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "Access denied: insufficient role privileges",
		})
	}
}

// GetClaims retrieves the parsed TokenClaims from the Gin context.
func GetClaims(c *gin.Context) (*security.TokenClaims, bool) {
	val, exists := c.Get("claims")
	if !exists {
		return nil, false
	}
	claims, ok := val.(*security.TokenClaims)
	return claims, ok
}
