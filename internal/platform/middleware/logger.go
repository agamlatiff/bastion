package middleware

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

func JSONLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		latency := time.Since(start)
		requestID := c.GetString("RequestID")

		userID := c.GetString("userID")

		logData := map[string]any{
			"timestamp": time.Now().Format(time.RFC3339),
			"request_id": requestID,
			"method": c.Request.Method,
			"path": c.Request.URL.Path,
			"status": c.Writer.Status(),
			"latency_ms": latency.Milliseconds(),
			"ip": c.ClientIP(),
		}

		if userID != "" {
			logData["user_id"] = userID
		}

		if len(c.Errors) > 0 {
			logData["errors"] = c.Errors.Errors()
		}

		logJSON, _	:= json.Marshal(logData)
		log.Println(string(logJSON))
	}
}