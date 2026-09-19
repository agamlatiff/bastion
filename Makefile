.PHONY: help infra-up infra-down infra-restart infra-logs infra-clean \
        migrate-identity-up migrate-identity-down \
        migrate-wallet-up migrate-wallet-down \
        migrate-ledger-up migrate-ledger-down \
        migrate-all-up \
        db-identity db-wallet db-ledger redis-cli kafka-topics kafka-list \
        run-identity run-wallet run-ledger run-gateway run-customer \
        run-web run-all \
        tidy fmt lint test

# ==============================================================================
# Variables & Database Connection Strings
# Note: Host port for PostgreSQL defined in docker-compose.yml is 5433
# ==============================================================================
DB_BASE_URL := postgres://bastion:bastion_secret@localhost:5433
DB_IDENTITY := $(DB_BASE_URL)/identity_db?sslmode=disable
DB_WALLET   := $(DB_BASE_URL)/wallet_db?sslmode=disable
DB_LEDGER   := $(DB_BASE_URL)/ledger_db?sslmode=disable

MIGRATE_BIN := go run -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# ==============================================================================
# Help Menu (Default)
# ==============================================================================
help:
	@echo "======================================================================"
	@echo "                      BASTION PLATFORM CLI                            "
	@echo "======================================================================"
	@echo "Infrastructure Commands:"
	@echo "  make infra-up             - Start core infrastructure (PostgreSQL, Redis, Redpanda)"
	@echo "  make infra-down           - Stop core infrastructure containers"
	@echo "  make infra-restart        - Restart core infrastructure containers"
	@echo "  make infra-logs           - Follow real-time container logs"
	@echo "  make infra-clean          - Stop containers and remove persistent volumes"
	@echo ""
	@echo "Database Migration Commands:"
	@echo "  make migrate-all-up       - Execute all migrations UP (Identity, Wallet, Ledger)"
	@echo "  make migrate-identity-up  - Execute UP migrations for Identity DB"
	@echo "  make migrate-identity-down- Rollback 1 migration step for Identity DB"
	@echo "  make migrate-wallet-up    - Execute UP migrations for Wallet DB"
	@echo "  make migrate-wallet-down  - Rollback 1 migration step for Wallet DB"
	@echo "  make migrate-ledger-up    - Execute UP migrations for Ledger DB"
	@echo "  make migrate-ledger-down  - Rollback 1 migration step for Ledger DB"
	@echo ""
	@echo "Interactive Shell & CLI Inspection:"
	@echo "  make db-identity          - Open interactive psql shell for identity_db"
	@echo "  make db-wallet            - Open interactive psql shell for wallet_db"
	@echo "  make db-ledger            - Open interactive psql shell for ledger_db"
	@echo "  make redis-cli            - Open interactive redis-cli shell"
	@echo "  make kafka-topics         - Create domain event topics in Redpanda"
	@echo "  make kafka-list           - List active Kafka topics in Redpanda"
	@echo ""
	@echo "Run Microservices (Development):"
	@echo "  make run-identity         - Start Identity Service (Go :8081)"
	@echo "  make run-wallet           - Start Wallet Service (Go :8082)"
	@echo "  make run-ledger           - Start Ledger Service (Go :8084)"
	@echo "  make run-gateway          - Start API Gateway (Go :8080)"
	@echo "  make run-customer         - Start Customer Service (Spring Boot :8083)"
	@echo "  make run-web              - Start Web Frontend (React Vite :5173)"
	@echo "  make run-all              - Start Gateway, Identity, Wallet & Web concurrently"
	@echo ""
	@echo "Code Quality & Maintenance:"
	@echo "  make tidy                 - Run go mod tidy across all Go services"
	@echo "  make fmt                  - Format Go source code across all services"
	@echo "  make lint                 - Run golangci-lint static analysis"
	@echo "  make test                 - Execute unit and integration test suites"
	@echo "======================================================================"

# ==============================================================================
# 1. Infrastructure Management (Docker Compose)
# ==============================================================================
infra-up:
	@echo "Starting core infrastructure containers (PostgreSQL, Redis, Redpanda)..."
	docker compose up -d

infra-down:
	@echo "Stopping core infrastructure containers..."
	docker compose down

infra-restart:
	@echo "Restarting core infrastructure containers..."
	docker compose restart

infra-logs:
	docker compose logs -f

infra-clean:
	@echo "WARNING: Tearing down all containers and deleting persistent volumes..."
	docker compose down -v

# ==============================================================================
# 2. Database Migrations (golang-migrate)
# ==============================================================================
migrate-identity-up:
	@echo "--> Executing Identity DB Migrations (UP)..."
	$(MIGRATE_BIN) -path services/identity/migrations -database "$(DB_IDENTITY)" up

migrate-identity-down:
	@echo "--> Rolling back Identity DB Migration (DOWN)..."
	$(MIGRATE_BIN) -path services/identity/migrations -database "$(DB_IDENTITY)" down 1

migrate-wallet-up:
	@echo "--> Executing Wallet DB Migrations (UP)..."
	$(MIGRATE_BIN) -path services/wallet/migrations -database "$(DB_WALLET)" up

migrate-wallet-down:
	@echo "--> Rolling back Wallet DB Migration (DOWN)..."
	$(MIGRATE_BIN) -path services/wallet/migrations -database "$(DB_WALLET)" down 1

migrate-ledger-up:
	@echo "--> Executing Ledger DB Migrations (UP)..."
	$(MIGRATE_BIN) -path services/ledger/migrations -database "$(DB_LEDGER)" up

migrate-ledger-down:
	@echo "--> Rolling back Ledger DB Migration (DOWN)..."
	$(MIGRATE_BIN) -path services/ledger/migrations -database "$(DB_LEDGER)" down 1

migrate-all-up: migrate-identity-up migrate-wallet-up migrate-ledger-up
	@echo "All database migrations executed successfully!"

# ==============================================================================
# 3. Interactive Shell & CLI Inspection
# ==============================================================================
db-identity:
	docker exec -it bastion_postgres psql -U bastion -d identity_db

db-wallet:
	docker exec -it bastion_postgres psql -U bastion -d wallet_db

db-ledger:
	docker exec -it bastion_postgres psql -U bastion -d ledger_db

redis-cli:
	docker exec -it bastion_redis redis-cli

kafka-topics:
	@echo "Creating Kafka domain topics in Redpanda..."
	docker exec bastion_redpanda rpk topic create \
		bastion.identity.events \
		bastion.customer.events \
		bastion.wallet.events \
		bastion.transaction.events \
		bastion.ledger.events

kafka-list:
	docker exec bastion_redpanda rpk topic list

# ==============================================================================
# 4. Running Microservices (Local Development)
# ==============================================================================
run-identity:
	@echo "Starting Identity Service..."
	cd services/identity && go run main.go

run-wallet:
	@echo "Starting Wallet Service..."
	cd services/wallet && go run main.go

run-ledger:
	@echo "Starting Ledger Service..."
	cd services/ledger && go run main.go

run-gateway:
	@echo "Starting API Gateway..."
	cd services/gateway && go run main.go

run-customer:
	@echo "Starting Customer Service (Spring Boot)..."
	cd services/customer && ./mvnw spring-boot:run

run-web:
	@echo "Starting Web Frontend (Vite)..."
	cd web && npm run dev

run-all:
	@echo "Starting Gateway, Identity, Wallet, and Web Frontend simultaneously..."
	cd web && npm run dev:all

# ==============================================================================
# 5. Code Quality, Tidy & Tests
# ==============================================================================
tidy:
	@echo "Running go mod tidy across all Go services..."
	go mod tidy
	cd services/identity && go mod tidy
	cd services/wallet && go mod tidy
	cd services/ledger && go mod tidy
	cd services/gateway && go mod tidy

fmt:
	@echo "Formatting Go source code across all services..."
	go fmt ./...
	cd services/identity && go fmt ./...
	cd services/wallet && go fmt ./...
	cd services/ledger && go fmt ./...
	cd services/gateway && go fmt ./...

lint:
	@echo "Running golangci-lint static analysis..."
	golangci-lint run ./...

test:
	@echo "Executing unit and integration tests across all Go services..."
	go test -v ./...
	cd services/identity && go test -v ./...
	cd services/wallet && go test -v ./...
	cd services/ledger && go test -v ./...
	cd services/gateway && go test -v ./...
	@echo "Executing tests for Java Customer Service..."
	cd services/customer && ./mvnw test
