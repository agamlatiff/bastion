# 🏗️ Bastion — System Architecture

---

## System Design Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              React + TypeScript (Port 3000)                 │
│     Dashboard | Wallet | Send Money | History | Notifs      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS REST / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│              API Gateway — Go/Gin (Port 8080)                │
│    JWT Middleware | Rate Limiting | CORS | Request Router    │
└───────┬──────────────────┬──────────────────┬───────────────┘
        │ gRPC             │ gRPC             │ gRPC
        │ (port 50051)     │ (port 50052)     │ (port 50053)
┌───────▼──────┐   ┌───────▼──────┐   ┌──────▼────────────┐
│ Auth Service │   │Wallet Service│   │Notification Svc   │
│              │   │              │   │ (Kafka Consumer)   │
│ - Register   │   │ - GetWallet  │   │                   │
│ - Login      │   │ - TopUp      │   │ - Store notif     │
│ - ValidToken │   │ - Transfer   │   │ - Push WebSocket  │
│ - GetUser    │   │ - ListTx     │   │ - List notifs     │
└───────┬──────┘   └───────┬──────┘   └──────┬─────────────┘
        │                  │ publishes         │ consumes
        │          ┌───────▼───────────────────▼───┐
        │          │            Kafka               │
        │          │   Topic: "payment.events"      │
        │          │   Topic: "payment.dlq"         │
        │          └────────────────────────────────┘
        │                  │
┌───────▼──────────────────▼──────────────────────────────────┐
│                    Data Layer                                │
│                                                             │
│   PostgreSQL 16              Redis 7                        │
│   ─────────────              ───────                        │
│   users                      blacklist:{token}              │
│   wallets                    idempotency:{key}              │
│   transactions               wallet:cache:{userID}          │
│   ledger_entries             rate_limit:{ip}:{endpoint}     │
│   notifications                                             │
└─────────────────────────────────────────────────────────────┘
                  All running in Docker containers
```

---

## Service Responsibilities

### API Gateway (Port 8080)
- **Only service exposed to the outside world**
- Accepts REST requests from the React frontend
- Validates JWT tokens (calls Auth Service via gRPC)
- Routes requests to appropriate microservices
- Handles rate limiting, CORS, request logging
- Manages WebSocket connections for real-time notifications

### Auth Service (Port 50051 — gRPC only)
- User registration and login
- JWT token generation and validation
- Token blacklisting via Redis (logout)
- User profile retrieval

### Wallet Service (Port 50052 — gRPC only)
- Wallet balance management
- Top-up operations
- Peer-to-peer transfers (with row locking)
- Transaction history
- Publishes events to Kafka after successful operations

### Notification Service (Port 50053 — gRPC only)
- Consumes events from Kafka topic `payment.events`
- Stores notifications in PostgreSQL
- Pushes real-time notifications to connected WebSocket clients
- Marks notifications as read

---

## Data Flow Examples

### Registration Flow
```
Client → POST /api/v1/auth/register
  → Gateway validates input
  → Gateway calls Auth Service gRPC: Register()
    → Auth Service: hash password (bcrypt)
    → Auth Service: INSERT into users (PostgreSQL)
    → Auth Service: INSERT into wallets (PostgreSQL)
    → Auth Service: generate JWT
  → Gateway returns { token, user }
```

### Transfer Flow
```
Client → POST /api/v1/transactions/transfer
  (with header: Authorization: Bearer <token>)
  → Gateway: validates JWT (calls Auth Service ValidateToken)
  → Gateway calls Wallet Service gRPC: Transfer()
    → Wallet Service: check idempotency key in Redis
      → if exists: return cached response (no double-charge)
      → if new: continue
    → Wallet Service: BEGIN transaction
      → SELECT wallet_A FOR UPDATE (lock row)
      → SELECT wallet_B FOR UPDATE (lock row)
      → check sender balance >= amount
      → UPDATE wallets SET balance = balance - amount WHERE id = A
      → UPDATE wallets SET balance = balance + amount WHERE id = B
      → INSERT INTO transactions
      → INSERT INTO ledger_entries (x2: debit + credit)
    → COMMIT
    → store idempotency key in Redis (TTL: 24h)
    → publish to Kafka: "payment.events"
  → Gateway returns { transaction }

Kafka Consumer (Notification Service):
  → reads event from "payment.events"
  → INSERT into notifications for receiver
  → push to WebSocket hub
  → receiver's browser shows: "🔔 You received Rp50,000"
```

---

## Docker Network

All containers communicate via internal Docker network `bastion_network`:

```yaml
# Internal hostnames (used in .env for production containers):
postgres    → bastion_postgres:5432
redis       → bastion_redis:6379
kafka       → bastion_kafka:9092
auth        → bastion_auth:50051
wallet      → bastion_wallet:50052
notification→ bastion_notification:50053
gateway     → bastion_gateway:8080  ← only one exposed externally
frontend    → bastion_frontend:3000 ← only one exposed externally
```

---

## Folder Structure

```
bastion/
├── docker-compose.yml
├── .env
├── .gitignore
├── go.mod
├── go.sum
├── README.md
│
├── documentation/           ← you are here
│   ├── README.md
│   ├── implementation_plan.md
│   ├── architecture.md
│   ├── database_schema.md
│   ├── api_contract.md
│   ├── phase_1_auth.md
│   ├── phase_2_wallet.md
│   ├── phase_3_grpc.md
│   ├── phase_4_kafka.md
│   └── phase_5_frontend.md
│
├── proto/
│   ├── auth/auth.proto
│   ├── wallet/wallet.proto
│   └── notification/notification.proto
│
├── services/
│   ├── gateway/
│   │   ├── cmd/main.go
│   │   ├── internal/
│   │   │   ├── handler/
│   │   │   ├── middleware/
│   │   │   └── client/
│   │   └── Dockerfile
│   │
│   ├── auth/
│   │   ├── cmd/main.go
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   ├── domain/
│   │   │   ├── handler/
│   │   │   ├── middleware/
│   │   │   ├── repository/
│   │   │   └── service/
│   │   └── Dockerfile
│   │
│   ├── wallet/
│   │   ├── cmd/main.go
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   ├── domain/
│   │   │   ├── handler/
│   │   │   ├── repository/
│   │   │   └── service/
│   │   └── Dockerfile
│   │
│   └── notification/
│       ├── cmd/main.go
│       ├── internal/
│       │   ├── config/
│       │   ├── consumer/
│       │   ├── domain/
│       │   ├── repository/
│       │   └── service/
│       └── Dockerfile
│
├── infra/
│   └── postgres/
│       └── migrations/
│           ├── 001_init.sql
│           ├── 002_transactions.sql
│           └── 003_notifications.sql
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── hooks/
    │   ├── api/
    │   └── types/
    ├── package.json
    └── Dockerfile
```
