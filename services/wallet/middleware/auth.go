package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type CustomClaims struct {
	UserID    string   `json:"user_id"`
	Email     string   `json:"email"`
	Role      string   `json:"role"`
	Roles     []string `json:"roles"`
	TokenType string   `json:"token_type"`
	jwt.RegisteredClaims
}

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Missing Authorization header",
			})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Invalid Authorization header format. Expected 'Bearer <token>'",
			})
			return
		}

		tokenString := strings.TrimSpace(parts[1])
		token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Invalid or expired access token",
			})
			return
		}

		claims, ok := token.Claims.(*CustomClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Malformed token claims",
			})
			return
		}

		// Ensure token is an access token
		if claims.TokenType != "" && claims.TokenType != "access" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Token is not a valid access token",
			})
			return
		}

		rawID := claims.UserID
		if rawID == "" {
			rawID = claims.Subject
		}

		customerID, err := uuid.Parse(rawID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Invalid user ID claim format",
			})
			return
		}

		// Set customer_id, user_id, roles, and claims in Gin context
		c.Set("customer_id", customerID)
		c.Set("user_id", customerID)

		roles := claims.Roles
		if len(roles) == 0 && claims.Role != "" {
			roles = []string{claims.Role}
		}
		c.Set("roles", roles)
		c.Set("claims", claims)
		c.Next()
	}
}

// GetCustomerID extracts the authenticated customer ID from the Gin context.
func GetCustomerID(c *gin.Context) (uuid.UUID, error) {
	val, exists := c.Get("customer_id")
	if !exists {
		return uuid.Nil, errors.New("customer ID not found in context")
	}
	id, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil, errors.New("invalid customer ID type in context")
	}
	return id, nil
}

// GetRoles extracts the roles array from the Gin context.
func GetRoles(c *gin.Context) []string {
	val, exists := c.Get("roles")
	if !exists {
		return nil
	}
	roles, ok := val.([]string)
	if !ok {
		return nil
	}
	return roles
}

// HasRole checks if the authenticated user has the specified role (case-insensitive).
func HasRole(c *gin.Context, role string) bool {
	roles := GetRoles(c)
	for _, r := range roles {
		if strings.EqualFold(r, role) {
			return true
		}
	}
	return false
}

// HasAnyRole checks if the authenticated user has at least one of the specified roles.
func HasAnyRole(c *gin.Context, roles ...string) bool {
	for _, role := range roles {
		if HasRole(c, role) {
			return true
		}
	}
	return false
}

// RequireRole enforces that the caller has at least one of the specified roles.
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if HasAnyRole(c, allowedRoles...) {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":   "Forbidden",
			"message": "Access denied: insufficient role privileges",
		})
	}
}
