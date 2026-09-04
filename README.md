# Bastion

**Financial Transaction Infrastructure**

Bastion is an API-first financial platform for building secure wallets
and reliable money movement between users and businesses.

## Features

-   Authentication & JWT
-   Wallet & balance
-   Top-up
-   P2P transfers
-   Transaction history
-   Transaction PIN
-   2FA
-   KYC
-   Audit logs
-   Idempotent transactions
-   Redis-backed infrastructure

## Tech Stack

### Frontend

-   React 19
-   TypeScript
-   Vite
-   React Router
-   TanStack Query
-   Axios
-   Tailwind CSS
-   Lucide React

### Backend

-   Go 1.26
-   Gin
-   PostgreSQL 16
-   Redis 7
-   pgx
-   JWT

### Infrastructure

-   Docker
-   Docker Compose
-   GitHub Actions
-   OpenAPI

## Architecture

``` text
React
  ↓
Go API
  ↓
PostgreSQL
  ↕
Redis
```

## Roadmap

-   Merchant payments
-   Double-entry ledger
-   Refunds & payouts
-   Kafka event processing
-   NestJS services
-   Java services
-   gRPC
-   Microservices
-   Observability

## Documentation

Detailed engineering documentation will live separately from this
README:

-   Product Requirements
-   Architecture
-   Domain Model
-   API Design
-   ADRs
-   Failure Modes
-   Threat Model
-   Testing
-   Runbook

## Getting Started

### Backend

``` bash
docker compose up -d
go run ./cmd/...
```

### Frontend

``` bash
cd web
npm install
npm run dev
```

## API

The API contract is defined in `openapi.yml`.

------------------------------------------------------------------------

Built as a portfolio project focused on reliable financial transaction
infrastructure.
