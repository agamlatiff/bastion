# 🏰 Bastion — Documentation

> Payment Processing Platform | Portfolio Project

---

## 📚 Documentation Index

| File | Description |
|---|---|
| [implementation_plan.md](./implementation_plan.md) | Full project plan — zoom out + zoom in per phase |
| [architecture.md](./architecture.md) | System design, service map, data flow |
| [database_schema.md](./database_schema.md) | All tables, columns, indexes, relationships |
| [api_contract.md](./api_contract.md) | Every REST endpoint with request/response examples |
| [phase_1_auth.md](./phase_1_auth.md) | Phase 1 guide — Auth Service |
| [phase_2_wallet.md](./phase_2_wallet.md) | Phase 2 guide — Wallet & Transactions |
| [phase_3_grpc.md](./phase_3_grpc.md) | Phase 3 guide — Microservices & gRPC |
| [phase_4_kafka.md](./phase_4_kafka.md) | Phase 4 guide — Kafka Event Streaming |
| [phase_5_frontend.md](./phase_5_frontend.md) | Phase 5 guide — React Frontend & Production Polish |

---

## 🚀 Quick Start

```bash
# Clone & enter project
cd C:\Projects\bastion

# Start all infrastructure
docker-compose up -d

# Run auth service (Phase 1)
go run services/auth/cmd/main.go

# Run all services (Phase 3+)
docker-compose up --build
```

---

## 🗺️ Project Roadmap

```
Phase 1 → Auth Service (Go + PostgreSQL + Redis + JWT)
Phase 2 → Wallet & Transactions (ACID, Idempotency, Ledger)
Phase 3 → Microservices & gRPC (Split services, API Gateway)
Phase 4 → Kafka Event Streaming (Async notifications, WebSocket)
Phase 5 → React Frontend + Production Polish
```

---

## 🎯 Target

Built to get hired at:
- **Indonesia**: Gojek, Xendit, Dana, OVO, Traveloka, Midtrans
- **Singapore**: Grab, Sea Group, Stripe, GovTech, DBS Tech
