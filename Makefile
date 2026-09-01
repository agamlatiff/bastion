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
	@echo "Running database migrations UP..."
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest -path infra/postgres/migrations -database $(DB_URL) up

migrate-down:
	@echo "Running database migrations DOWN..."
	go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest -path infra/postgres/migrations -database $(DB_URL) down

table-postgresql:
	docker exec -it bastion_postgres psql -U bastion -d bastion_db