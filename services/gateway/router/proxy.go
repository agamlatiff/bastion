package router

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

// NewReverseProxy creates a single-host reverse proxy handler that forwards
// requests to the designated backend target while updating the Host header.
func NewReverseProxy(target string) gin.HandlerFunc {
	targetURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("[GATEWAY FATAL] Invalid target URL %s: %v", target, err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = targetURL.Host
	}

	return func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}
