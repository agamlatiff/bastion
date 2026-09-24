package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS applies strict whitelist checks for allowed cross-origin requests.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	originMap := make(map[string]bool, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		originMap[strings.TrimSpace(origin)] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if origin != "" && originMap[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization, X-Request-ID, X-Correlation-ID, Accept, Origin")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			c.Header("Vary", "Origin")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
