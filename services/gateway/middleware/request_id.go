package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestID handles distributed tracing headers. It validates that incoming
// X-Request-ID or X-Correlation-ID headers are valid UUIDs, generating a fresh UUID if missing.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rawID := strings.TrimSpace(c.GetHeader("X-Correlation-ID"))
		if rawID == "" {
			rawID = strings.TrimSpace(c.GetHeader("X-Request-ID"))
		}

		var traceID string
		if rawID != "" {
			if parsed, err := uuid.Parse(rawID); err == nil {
				traceID = parsed.String()
			}
		}

		if traceID == "" {
			traceID = uuid.New().String()
		}

		// Store in context for downstream handlers and propagate in response headers
		c.Set("RequestID", traceID)
		c.Set("CorrelationID", traceID)
		c.Header("X-Request-ID", traceID)
		c.Header("X-Correlation-ID", traceID)

		// Propagate to downstream HTTP reverse proxy request headers
		c.Request.Header.Set("X-Request-ID", traceID)
		c.Request.Header.Set("X-Correlation-ID", traceID)

		c.Next()
	}
}
