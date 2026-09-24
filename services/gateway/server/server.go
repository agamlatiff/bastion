package server

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

// Run initializes and starts the HTTP server with standard production timeouts
// and listens for OS termination signals to perform a graceful shutdown.
func Run(handler http.Handler, port string) {
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in background goroutine
	go func() {
		log.Printf("[GATEWAY] Service started successfully on port %s\n", port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[GATEWAY FATAL] Listen and serve failed: %v\n", err)
		}
	}()

	// Listen for OS interrupt or termination signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[GATEWAY] Shutdown signal received, gracefully draining connections...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[GATEWAY FATAL] Forced shutdown due to timeout: %v\n", err)
	}
	log.Println("[GATEWAY] Server exited cleanly.")
}
