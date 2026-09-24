package main

import (
	"github.com/agamlatiff/bastion/services/gateway/config"
	"github.com/agamlatiff/bastion/services/gateway/router"
	"github.com/agamlatiff/bastion/services/gateway/server"
)

func main() {
	// 1. Load runtime configuration from environment
	cfg := config.Load()

	// 2. Build reverse proxy router and middleware pipeline
	r := router.New(cfg)

	// 3. Start HTTP server and gracefully handle OS shutdown signals
	server.Run(r, cfg.Port)
}
