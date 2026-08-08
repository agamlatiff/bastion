# Level 5 — Production Engineering

> **Goal**: Observe, test, and present the running system
> **Technologies**: OpenTelemetry, k6, React (Vite), golangci-lint, gosec
> **Observability introduced**: Distributed tracing (OpenTelemetry)

---

## Sprint 5.1 — Distributed Tracing & Observability

**Goal**: Visualize end-to-end request flow across all services.

In simple terms:
1. Integrate OpenTelemetry SDK into all services
2. Trace requests from Gateway → gRPC → database → Kafka → consumer
3. Export traces to Jaeger or similar collector
4. Verify correlation IDs appear in traces

**Tasks**:
- [ ] OpenTelemetry SDK integration
- [ ] Trace propagation across gRPC boundaries
- [ ] Jaeger or OTLP collector in Docker Compose
- [ ] Verify end-to-end trace for transfer flow

---

## Sprint 5.2 — Load Testing & Performance

**Goal**: Prove the system handles concurrent load without deadlocks or data corruption.

In simple terms:
1. Write k6 load test scripts for registration, login, and transfer flows
2. Simulate hundreds of concurrent users
3. Verify zero deadlocks under concurrent transfers
4. Measure and document latency percentiles (p50, p95, p99)

**Tasks**:
- [ ] k6 test scripts (auth flow, transfer flow)
- [ ] Concurrent transfer stress test
- [ ] Performance results documentation
- [ ] Identify and fix bottlenecks

---

## Sprint 5.3 — Frontend Dashboard

**Goal**: Build a polished web UI that visualizes the financial core.

In simple terms:
1. Initialize React (Vite) project
2. Build auth pages (login, register)
3. Build dashboard (balance, recent transactions, quick actions)
4. Build transfer page with idempotency protection
5. Build transaction history with filters
6. Integrate WebSocket for real-time notifications

**Tasks**:
- [ ] React + Vite project setup
- [ ] Auth pages (login, register, route guards)
- [ ] Dashboard page (balance card, transactions, quick actions)
- [ ] Transfer page (recipient lookup, amount, confirmation)
- [ ] Transaction history (paginated, filtered)
- [ ] WebSocket notification integration
- [ ] API Gateway rate limiting (Redis-based)

---

## Sprint 5.4 — Code Quality & Security Audit

**Goal**: Clean up technical debt and audit for security vulnerabilities.

In simple terms:
1. Run golangci-lint and fix all warnings
2. Run gosec and fix security findings
3. Write unit tests with mock repositories (target >80% coverage)
4. Final documentation review

**Tasks**:
- [ ] golangci-lint pass (zero critical warnings)
- [ ] gosec audit (zero critical findings)
- [ ] Unit tests with table-driven patterns
- [ ] Mock repositories for testing without database
- [ ] Code coverage report

---

## Acceptance Criteria (Level 5 Complete)

- [ ] End-to-end request traces are visible in Jaeger
- [ ] k6 load test passes with zero deadlocks under concurrent transfers
- [ ] Frontend dashboard is functional and polished
- [ ] golangci-lint and gosec produce zero critical findings
- [ ] Unit test coverage exceeds 80%
