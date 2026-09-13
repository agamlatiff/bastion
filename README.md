# Bastion

<p align="center">
  <strong>Bank-Grade Financial Transaction & Ledger Infrastructure</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Polyglot_Microservices-blue?style=flat-square" alt="Architecture" />
  <img src="https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat-square&logo=go" alt="Go" />
  <img src="https://img.shields.io/badge/Java-Spring_Boot_3-6DB33F?style=flat-square&logo=springboot" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Kafka-Redpanda_v24-E00034?style=flat-square&logo=apachekafka" alt="Redpanda" />
  <img src="https://img.shields.io/badge/Redis-7.0-DC382D?style=flat-square&logo=redis" alt="Redis" />
</p>

---

## 🏦 Overview

**Bastion** is an API-first financial infrastructure platform engineered to manage money movement, account balances, and double-entry bookkeeping with bank-grade data integrity and auditability.

> **Core Philosophy:**  
> *"No money is created or lost. Every monetary movement must be explainable through the ledger."*

---

## 🏗️ System Architecture

Bastion adopts an **Event-Driven Polyglot Microservices** architecture with strict service boundaries and isolated storage (**Database-per-Service** pattern):

```text
                                [ Web Client / React 19 ]
                                            │
                                            ▼
                           ┌──────────────────────────────────┐
                           │   API Gateway (Reverse Proxy)    │ :8080
                           │  • Rate Limiting  • Security Hdr │
                           │  • Correlation ID • Prometheus   │
                           └─────────────────┬────────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               │ :8081                       │ :8082                       │ :8083
               ▼                             ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
     │ Identity Service │          │ Customer Service │          │  Wallet Service  │
     │     (Go/Gin)     │          │  (Spring Boot 3) │          │     (Go/Gin)     │
     └────────┬─────────┘          └────────┬─────────┘          └────────┬─────────┘
              │                             │                             │
              │ (Domain Events)             │                             │ (Internal Sync)
              ▼                             ▼                             ▼
  ┌────────────────────────────────────────────────────────┐     ┌──────────────────┐
  │         Redpanda / Kafka Event Streaming (19092)       │     │  Ledger Service  │ :8084
  │   Topics: identity.events, customer.events, wallet...  │     │     (Go/Gin)     │
  └───────────────────────────▲────────────────────────────┘     └────────┬─────────┘
                              │                                           │
                              └─────────── Outbox Worker ─────────────────┘
                                          (Transactional Outbox)
```

---

## ✨ Key Capabilities & Engineering Highlights

### 1. Bank-Grade Double-Entry Bookkeeping (`services/ledger`)
- **Immutable Financial Ledger**: Every monetary transaction is recorded as balanced debit and credit journal entries ($\sum \text{Debit} = \sum \text{Credit}$).
- **Chart of Accounts (CoA)**: Structured financial accounts categorized into Assets, Liabilities, and Equity.
- **Zero-Trust Internal Communication**: Service-to-service communication is secured via internal shared secrets and token verification (`X-Internal-Secret`).

### 2. Transactional Outbox Pattern (`services/wallet`)
- **Dual-Write Elimination**: Solves data inconsistency between the PostgreSQL database and the Kafka event broker.
- State mutations and domain events are committed atomically within a single ACID database transaction before an asynchronous background worker publishes events with exponential backoff retries.

### 3. Comprehensive Security & Step-Up 2FA (`services/identity`)
- **RFC 6238 TOTP**: Application-based two-factor authentication (e.g., Google Authenticator) with step-up verification for high-risk operations.
- **AES-GCM Encryption**: TOTP secret keys are encrypted at rest using authenticated symmetric encryption.
- **Cryptographic Password Hashing**: Passwords hashed using salted adaptive *bcrypt*.
- **Stateless Tokens**: Short-lived JSON Web Tokens (JWT) paired with Role-Based Access Control (RBAC).

### 4. Resilient API Gateway (`services/gateway`)
- **Distributed Rate Limiting**: Redis-backed token-bucket algorithm mitigating brute-force and DoS attacks.
- **Distributed Tracing**: Automatic propagation of `X-Correlation-ID` and `X-Request-ID` headers across all downstream services.
- **Hardened Security Headers**: Configured with strict HSTS, CSP, X-Frame-Options, and X-Content-Type-Options.
- **Observability Probes**: Protected Prometheus metrics endpoint (`/metrics`) alongside health probes (`/livez`, `/readyz`).

### 5. Interactive Frontend Suite (`web/`)
- Modern single-page application built with **React 19**, **Vite**, and **Tailwind CSS v4**.
- Interactive 3D virtual debit card with physical tilt simulation.
- Real-time financial movement simulation suite for end-to-end testing.

---

## 🧭 Service Catalog & Port Allocation

| Service | Technology | Port | Database | Description |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway** | Go 1.24 / Gin | `:8080` | Redis (`:6379`) | Reverse proxy, rate limiting, request validation |
| **Identity Service** | Go 1.24 / Gin | `:8081` | `identity_db` (Postgres) | Authentication, RBAC, 2FA TOTP, user credentials |
| **Customer Service** | Java 21 / Spring Boot 3 | `:8082` | `customer_db` (Postgres) | Customer profiles, KYC verification workflows |
| **Wallet Service** | Go 1.24 / Gin | `:8083` | `wallet_db` (Postgres) | Balance tracking, top-up, P2P transfers, transactional outbox |
| **Ledger Service** | Go 1.24 / Gin | `:8084` | `ledger_db` (Postgres) | Double-entry journal, chart of accounts, audits |
| **Web Frontend** | React 19 / Vite | `:5173` | — | Interactive client UI and fintech simulation suite |
| **Redpanda (Kafka)** | Redpanda v24 | `:19092` | — | Distributed domain event streaming backbone |

---

## 📁 Repository Structure

```text
bastion/
├── contracts/               # API specifications and domain event schemas
│   ├── events/              # Kafka domain event schemas
│   ├── openapi/             # OpenAPI / Swagger contracts
│   └── proto/               # gRPC / Protobuf contracts
├── docs/                    # Architectural & domain documentation
│   ├── adr/                 # Architecture Decision Records
│   ├── erd.md               # Entity Relationship Diagram (all services)
│   ├── prd.md               # Product Requirements Document
│   └── technical-debt.md    # Technical debt tracking & mitigation backlog
├── infrastructure/          # Infrastructure configurations & initialization
│   ├── docker/              # Dockerfiles and support scripts
│   ├── kafka/               # Kafka topics and broker setup
│   ├── postgres/            # Database initialization scripts (DB-per-service)
│   └── redis/               # Cache & rate-limiting configurations
├── services/                # Polyglot microservices source code
│   ├── gateway/             # API Gateway reverse proxy
│   ├── identity/            # Identity, authentication, and 2FA TOTP
│   ├── customer/            # Customer profile service (Java Spring Boot)
│   ├── wallet/              # Wallet balances & transactional outbox publisher
│   ├── ledger/              # Double-entry ledger accounting service
│   ├── kyc/                 # (Roadmap) KYC verification service
│   └── transaction/         # (Roadmap) Transaction orchestration service
├── web/                     # Frontend client (React 19 + Vite + Tailwind CSS)
├── docker-compose.yml       # PostgreSQL, Redis, and Redpanda orchestration
└── Makefile                 # Build, test, lint, and database automation targets
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Go**: `1.24+`
- **Node.js**: `20+` & `npm`
- **Java**: `JDK 21+` & `Maven` *(optional, required for Customer Service)*
- **Docker & Docker Compose**

### 2. Start Core Infrastructure
Launch PostgreSQL, Redis, and Redpanda using Docker Compose:

```bash
# Start background containers
docker compose up -d

# Initialize required Kafka topics
make kafka-topics
```

### 3. Run Microservices (Development Mode)

#### Option A: Run All Concurrently (Recommended for Web & Core APIs)
Navigate to the `web` directory and execute the concurrent dev script:
```bash
cd web
npm install
npm run dev:all
```
*This command launches API Gateway (`:8080`), Identity Service (`:8081`), Wallet Service (`:8083`), and the Web Client (`:5173`) simultaneously.*

#### Option B: Run Services Individually
```bash
# 1. Start Ledger Service (internal port 8084)
go run ./services/ledger/main.go

# 2. Start Wallet Service (port 8083)
go run ./services/wallet/main.go

# 3. Start Identity Service (port 8081)
go run ./services/identity/main.go

# 4. Start API Gateway (port 8080)
go run ./services/gateway/main.go

# 5. Start Customer Service (Java Spring Boot, port 8082)
cd services/customer && ./mvnw spring-boot:run

# 6. Start Web UI
cd web && npm run dev
```

---

## 🧪 Testing & Code Quality

```bash
# Format Go source code
make fmt

# Run static analysis and linter
make lint

# Execute unit and integration tests
make test
```

---

## 📚 Engineering Documentation

Comprehensive technical documentation is maintained in the [`docs/`](file:///c:/Projects/bastion/docs) directory:
- [Product Requirements Document (PRD)](file:///c:/Projects/bastion/docs/prd.md)
- [Entity Relationship Diagram (ERD)](file:///c:/Projects/bastion/docs/erd.md)
- [Technical Debt & Architectural Backlog](file:///c:/Projects/bastion/docs/technical-debt.md)
- [OpenAPI Specification](file:///c:/Projects/bastion/openapi.yml)

---

## 📄 License & Attribution

Built as a high-performance financial infrastructure portfolio project demonstrating financial data consistency, event-driven distributed systems, and modern security best practices.
