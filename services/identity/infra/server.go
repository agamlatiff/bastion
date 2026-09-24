package infra

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// RunHTTPServer runs an HTTP server with production-ready timeouts and gracefully handles OS termination signals.
func RunHTTPServer(handler http.Handler, port string) {
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server asynchronously
	go func() {
		log.Printf("[IDENTITY] Listening for HTTP traffic on http://localhost:%s", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[IDENTITY] Server failed to start: %v", err)
		}
	}()

	// Graceful Shutdown on SIGINT/SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[IDENTITY] Shutdown signal received, shutting down gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[IDENTITY] Server forced to shutdown: %v", err)
	}

	log.Println("[IDENTITY] Identity Service stopped cleanly")
}
