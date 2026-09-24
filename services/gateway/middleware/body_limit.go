package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// BodyLimit restricts the maximum request payload size to prevent memory exhaustion / DoS.
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
