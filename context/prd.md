# 🏰 Bastion — Product Requirements Document (PRD)

> **Version**: 2.0 (Enterprise Edition)
> **Last Updated**: 2 August 2026
> **Author**: Agam Latiff
> **Status**: Approved — Ready for Implementation

---

## 1. Executive Summary

**Bastion** is an enterprise-grade digital payment processing platform that enables users to manage digital wallets, perform peer-to-peer money transfers, and receive real-time transaction notifications — backed by an ACID-compliant backend system adhering to Bank Indonesia E-Money regulations.

### Core Value Proposition

| Capability | Description |
|---|---|
| Digital Wallet Tiering | Tier 1 (Unverified, max 2M IDR) vs Tier 2 (KYC Verified, max 20M IDR + P2P transfer rights) |
| Virtual Account Top-Up | Bank Virtual Accounts (BCA, Mandiri, BRI) for simulated wallet top-ups |
| P2P Transfers | Instant peer-to-peer money transfers with deadlock prevention and limit enforcement |
| Transaction Ledger | Complete, immutable financial audit trail with double-entry bookkeeping |
| Transactional Outbox | Guaranteed *At-Least-Once* Kafka event delivery via `outbox_events` table |
| Security & Audit Logs | Full audit trail tracking IP addresses, User-Agents, and security actions |
| Real-time Notifications | Instant WebSocket push notifications on incoming transfers and account activity |

---

## 2. Problem Statement

Digital wallet platforms in Southeast Asia must adhere to strict central bank regulations while maintaining high performance, concurrency safety, and system reliability:

- **Data Integrity & Concurrency Risks** — Race conditions during simultaneous transfers can cause balance corruption or duplicate charges.
- **Reliability in Distributed Systems** — Dual-write issues where a database transaction succeeds but message broker (Kafka) publishing fails.
- **Regulatory E-Money Compliance** — Enforcing strict wallet balance limits based on user KYC verification tiers.
- **Auditability & Fraud Prevention** — Lack of immutable double-entry ledgers and audit logs for security tracking.

Bastion solves these problems by incorporating **ACID row-level locking**, the **Transactional Outbox Pattern**, **Bank Indonesia KYC tier limits**, **Double-Entry Bookkeeping**, and **Event-Driven WebSockets**.

---

## 3. Target Users & Compliance Tiers

### User Tiers (Bank Indonesia E-Money Rules)

| Tier | Status | Balance Limit | Privileges |
|---|---|---|---|
| **Tier 1** | Unverified (Default upon register) | Max `2,000,000 IDR` | Top-Up via VA, Receive Transfers, Pay Merchants |
| **Tier 2** | Verified (KYC Approved) | Max `20,000,000 IDR` | All Tier 1 features + **Outgoing P2P Transfers** & Cash Out |

---

## 4. User Journey

```
1. User registers → Tier 1 wallet auto-created with 0 IDR balance (Limit: 2,000,000 IDR)
2. User generates Virtual Account & tops up balance → balance increases via bank callback
3. User submits KTP & selfie for KYC verification → Admin approves → Upgraded to Tier 2 (Limit: 20,000,000 IDR)
4. User sends Rp50,000 to a friend
   ├── System locks both wallets in ascending UUID order (prevents deadlock & race condition)
   ├── Verifies receiver balance won't exceed receiver's max_balance_limit
   ├── Deducts sender balance & credits receiver balance atomically (ACID transaction)
   ├── Records debit & credit ledger entries (double-entry bookkeeping)
   ├── Writes event to outbox_events table (Transactional Outbox Pattern)
   ├── Outbox Worker publishes event to Kafka broker
   └── Receiver gets real-time push notification via WebSocket
5. User views paginated transaction history & security audit logs
6. User logs out → JWT token blacklisted via Redis
```

---

## 5. Core Features

### 5.1 Authentication & Security Audit
| Feature | Endpoint | Description |
|---|---|---|
| Register | `POST /api/v1/auth/register` | Register user, auto-create Tier 1 wallet |
| Login | `POST /api/v1/auth/login` | Authenticate, issue JWT, log client IP & User-Agent |
| Profile | `GET /api/v1/auth/me` | View user profile, current tier, and limits |
| Logout | `POST /api/v1/auth/logout` | Blacklist JWT in Redis |

### 5.2 KYC Verification & Tiering
| Feature | Endpoint | Description |
|---|---|---|
| Submit KYC | `POST /api/v1/kyc/submit` | Submit KTP ID number & image URLs |
| Approve KYC | `POST /api/v1/admin/kyc/:id/approve` | Approve KYC, upgrade to Tier 2 (20M limit + P2P transfer rights) |

### 5.3 Wallet & Virtual Account Top-Up
| Feature | Endpoint | Description |
|---|---|---|
| Get Balance | `GET /api/v1/wallet` | View current balance and tier limit |
| Create VA | `POST /api/v1/wallet/virtual-account` | Generate bank Virtual Account |
| Bank Callback | `POST /api/v1/webhooks/bank-callback` | Process top-up payment webhook with outbox event |

### 5.4 P2P Transfers & Double-Entry Ledger
| Feature | Endpoint | Description |
|---|---|---|
| Transfer | `POST /api/v1/transactions/transfer` | P2P transfer (Tier 2 only, deadlock-free locking, outbox event) |
| History | `GET /api/v1/transactions` | Paginated transaction history |
| Detail | `GET /api/v1/transactions/:id` | Transaction detail with ledger entries |

### 5.5 Event-Driven Real-Time Notifications
| Feature | Endpoint | Description |
|---|---|---|
| Notifications List | `GET /api/v1/notifications` | List user notifications |
| Mark Read | `PATCH /api/v1/notifications/:id/read` | Mark notification read status |
| Real-time Push | `WS /api/v1/ws` | WebSocket stream for incoming payment alerts |

---

## 6. System Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│              React + TypeScript (Port 3000)              │
│    Dashboard | Wallet | Send Money | History | Notifs    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS REST / WebSocket
┌────────────────────────▼────────────────────────────────┐
│            API Gateway — Go/Gin (Port 8080)              │
│  JWT Middleware | Rate Limiting | CORS | Request Router   │
└───────┬────────────────┬────────────────┬───────────────┘
        │ gRPC           │ gRPC           │ gRPC
        │ :50051         │ :50052         │ :50053
┌───────▼──────┐  ┌──────▼───────┐  ┌────▼──────────────┐
│ Auth Service │  │Wallet Service│  │Notification Svc   │
│              │  │  + Outbox    │  │ (Kafka Consumer)   │
│ - Register   │  │    Worker    │  │                   │
│ - Login      │  │ - TopUp      │  │ - Store notif     │
│ - ValidToken │  │ - Transfer   │  │ - Push WebSocket  │
│ - Audit Log  │  │ - KYC Check  │  │ - List notifs     │
└───────┬──────┘  └──────┬───────┘  └────┬──────────────┘
        │                │ publishes      │ consumes
        │         ┌──────▼───────────────▼────┐
        │         │          Kafka             │
        │         │  Topic: "payment.events"   │
        │         │  Topic: "payment.dlq"      │
        │         └───────────────────────────┘
        │                │
┌───────▼────────────────▼─────────────────────────────────┐
│                     Data Layer                            │
│                                                          │
│   PostgreSQL 16             Redis 7                      │
│   ─────────────             ───────                      │
│   users                     blacklist:{token}            │
│   kyc_verifications         idempotency:{key}            │
│   wallets                   wallet:cache:{userID}        │
│   virtual_accounts          rate_limit:{ip}:{endpoint}   │
│   transactions                                           │
│   ledger_entries                                         │
│   outbox_events                                          │
│   notifications                                          │
│   audit_logs                                             │
└──────────────────────────────────────────────────────────┘
                 All running in Docker containers
```

---

## 7. Data Model Summary

### Primary Database Tables (PostgreSQL 16)
- **`users`**: Account credentials, email, tier (`tier_1` / `tier_2`).
- **`kyc_verifications`**: KTP ID details, selfie URLs, approval status.
- **`wallets`**: Balance, `max_balance_limit` (2M IDR vs 20M IDR).
- **`virtual_accounts`**: Bank VA numbers assigned to users.
- **`transactions`**: Idempotent transaction log.
- **`ledger_entries`**: Double-entry accounting log (`debit` / `credit`).
- **`outbox_events`**: Transactional outbox events for Kafka.
- **`notifications`**: User alerts inbox.
- **`audit_logs`**: Security tracking (IP, User-Agent, action).

---

## 8. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Language | **Go** | High performance, low latency, fintech standard |
| Framework | **Gin** | Fast, lightweight HTTP framework |
| Database | **PostgreSQL 16** | ACID compliance, check constraints |
| Cache | **Redis 7** | Sub-millisecond lookup for idempotency & token blacklist |
| Messaging | **Kafka** | Event-driven streaming with Transactional Outbox pattern |
| RPC | **gRPC + Protobuf** | Fast binary inter-service communication |
| Security | **bcrypt + JWT** | Password hashing & stateless authentication |
| Frontend | **React + TypeScript** | Type-safe single page dashboard |
| Real-time | **WebSocket** | Instant notifications to clients |
| Container | **Docker + Compose** | Multi-container orchestration |

---

## 9. API Contract Summary

### Public Endpoints
- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/webhooks/bank-callback`

### Protected Endpoints (🔒 JWT Required)
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `POST /api/v1/kyc/submit`
- `GET /api/v1/wallet`
- `POST /api/v1/wallet/virtual-account`
- `POST /api/v1/transactions/transfer`
- `GET /api/v1/transactions`
- `GET /api/v1/transactions/:id`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`
- `GET /api/v1/ws`

### Admin Endpoints (🔒 Admin Auth Required)
- `POST /api/v1/admin/kyc/:id/approve`
