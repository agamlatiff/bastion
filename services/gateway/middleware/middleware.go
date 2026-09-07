package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestID handles distributed tracing headers. It validates that incoming
// X-Request-ID headers are valid UUIDs, generating a fresh UUID if missing or invalid.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rawID := strings.TrimSpace(c.GetHeader("X-Request-ID"))

		var requestID string
		if rawID != "" {
			// Validate that the caller-provided ID is a valid UUID
			if parsed, err := uuid.Parse(rawID); err == nil {
				requestID = parsed.String()
			}
		}

		// If missing or invalid UUID format, generate a new one
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Store in context for downstream handlers and inject into response headers
		c.Set("RequestID", requestID)
		c.Header("X-Request-ID", requestID)

		// Propagate to downstream HTTP request headers
		c.Request.Header.Set("X-Request-ID", requestID)

		c.Next()
	}
}

// SecurityHeaders applies standard OWASP recommended security headers.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}

// Timeout limits the maximum execution time of any request context.
func Timeout(duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), duration)
		defer cancel()

		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// BodyLimit restricts the maximum request payload size to prevent memory exhaustion / DoS.
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

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
			c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Authorization, X-Request-ID, Accept, Origin")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			c.Header("Vary", "Origin")
		}

		// Handle preflight requests
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// JSONLogger logs structured JSON access records with trace correlation IDs.
func JSONLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		logEntry := map[string]any{
			"timestamp":  time.Now().UTC().Format(time.RFC3339),
			"request_id": c.GetString("RequestID"),
			"method":     c.Request.Method,
			"path":       c.Request.URL.Path,
			"status":     c.Writer.Status(),
			"latency_ms": time.Since(start).Milliseconds(),
			"client_ip":  c.ClientIP(),
		}

		if len(c.Errors) > 0 {
			logEntry["errors"] = c.Errors.Errors()
		}

		encoded, err := json.Marshal(logEntry)
		if err == nil {
			log.Println(string(encoded))
		}
	}
}

// Recovery catches unhandled panics and returns a standardized 500 error response.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				requestID := c.GetString("RequestID")
				log.Printf("[PANIC RECOVERED] RequestID: %s, Error: %v\n", requestID, r)

				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error":      "Internal Server Error",
					"request_id": requestID,
				})
			}
		}()
		c.Next()
	}
}
