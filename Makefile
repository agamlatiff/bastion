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
	go run services/auth/cmd/main.go

test:
	@echo "Running tests..."
	go test -v ./...

# --- Migration Commands (Placeholder for now) ---
migrate-up:
	@echo "Running database migrations UP..."

migrate-down:
	@echo "Running database migrations DOWN..."
	