package main

import (
	"context"
	"log"

	"github.com/agamlatiff/bastion/services/auth/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// Load environment configuration
	cfg, err := config.LoadConfig()

}