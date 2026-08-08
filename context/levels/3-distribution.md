# Level 3 — Distribution

> **Goal**: Split into microservices with asynchronous event-driven communication
> **Technologies**: gRPC, Protocol Buffers, Kafka, API Gateway
> **Observability introduced**: Correlation IDs (cross-service tracing)

---

## Sprint 3.1 — Service Split & gRPC

**Goal**: Auth and Wallet become separate gRPC services behind an API Gateway.

In simple terms:
1. Define service contracts using Protocol Buffers (`.proto` files)
2. Convert Auth Service from REST to gRPC (port 50051)
3. Extract Wallet Service as a separate gRPC service (port 50052)
4. Build API Gateway — single REST entry point that translates JSON to Protobuf
5. Update Docker Compose to wire services together

**Tasks**:
- [ ] Define `.proto` files for Auth and Wallet services
- [ ] Generate Go code from `.proto` files
- [ ] Convert Auth Service to gRPC server
- [ ] Extract Wallet Service as gRPC server
- [ ] Build API Gateway (Go/Gin — REST ↔ gRPC translation)
- [ ] Correlation ID propagation from Gateway through gRPC metadata
- [ ] Update Docker Compose for multi-service deployment

---

## Sprint 3.2 — Kafka & Notification Service

**Goal**: Transfers publish events to Kafka. A Notification Service consumes them and pushes real-time alerts.

In simple terms:
1. Set up Kafka in Docker Compose
2. Wallet Service publishes transfer events to Kafka after successful transfer
3. Build Notification Service — consumes Kafka events, stores notifications, pushes via WebSocket
4. API Gateway manages WebSocket connections for real-time push

**Tasks**:
- [ ] Add Kafka + Zookeeper to Docker Compose
- [ ] Wallet Service: publish event after transfer commit
- [ ] Notification Service: Kafka consumer
- [ ] SQL migration (add `notifications` table)
- [ ] Notification API endpoints (list, mark read)
- [ ] WebSocket hub in API Gateway
- [ ] End-to-end test: transfer → Kafka → notification → WebSocket

---

## Acceptance Criteria (Level 3 Complete)

- [ ] Auth and Wallet run as separate services communicating via gRPC
- [ ] API Gateway translates external REST to internal gRPC
- [ ] Successful transfer publishes event to Kafka
- [ ] Notification Service consumes event and stores notification
- [ ] WebSocket pushes real-time alert to connected clients
- [ ] Correlation ID flows from Gateway → gRPC → Kafka → consumer
