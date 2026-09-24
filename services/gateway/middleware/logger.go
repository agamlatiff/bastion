package middleware

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// JSONLogger logs structured JSON access records with full observability labels
func JSONLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		level := "INFO"
		if status >= 500 {
			level = "ERROR"
		} else if status >= 400 {
			level = "WARN"
		}

		logEntry := map[string]any{
			"service":        "api-gateway",
			"level":          level,
			"timestamp":      time.Now().UTC().Format(time.RFC3339),
			"request_id":     c.GetString("RequestID"),
			"correlation_id": c.GetString("CorrelationID"),
			"method":         c.Request.Method,
			"path":           c.Request.URL.Path,
			"status":         status,
			"latency_ms":     time.Since(start).Milliseconds(),
			"client_ip":      c.ClientIP(),
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
