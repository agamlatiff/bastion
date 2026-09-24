package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

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
