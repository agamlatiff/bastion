.PHONY: run test lint fmt vet migrate-up migrate-down

# --- Standard Go Tooling ---
fmt:
	@echo "Formatting code..."
	go fmt ./...

vet:
	@echo "Running go vet..."
	go vet ./...

lint:
	@echo "Running golangci-lint..."
	golangci-lint run ./...

# --- Development Commands ---
run:
	@echo "Starting Bastion API..."
	go run cmd/main.go

test:
	@echo "Running tests..."
	go test -v ./...

# --- Migration Commands (Placeholder for now) ---
# --- Migration Commands ---
DB_URL="postgres://bastion:bastion_secret@localhost:5433/bastion_db?sslmode=disable"

migrate-up:
	@echo "Running database migrations via Docker..."
	@for file in infra/postgres/migrations/*.sql; do \
		echo "Applying $$file..."; \
		docker exec -i bastion_postgres psql -U bastion -d bastion_db < "$$file"; \
	done

migrate-down:
	@echo "Warning: Down migrations are not supported with raw SQL files."
	@echo "To reset the database, run: docker compose down -v && docker compose up -d"


