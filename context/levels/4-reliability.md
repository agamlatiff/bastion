# Level 4 — Reliability

> **Goal**: Handle failures gracefully without corrupting data or losing events
> **Technologies**: Timeouts, retries, circuit patterns, graceful shutdown
> **Observability introduced**: Metrics (Prometheus)

---

## Sprint 4.1 — Failure Handling & Graceful Degradation

**Goal**: The system behaves predictably when components fail.

In simple terms:
1. Add timeouts to all gRPC calls and database queries
2. Add retry with exponential backoff for transient failures
3. Handle Redis unavailability (fail-open for blacklist, fail-closed for idempotency)
4. Handle Kafka unavailability (events stay pending, worker retries)
5. Implement graceful shutdown — finish active requests before stopping

**Tasks**:
- [ ] Context deadlines on all database queries
- [ ] gRPC call timeouts and retry policy
- [ ] Redis failure handling (fallback behavior per use case)
- [ ] Graceful shutdown (SIGINT/SIGTERM handling)
- [ ] Connection pool health checks
- [ ] Failure scenario testing

---

## Sprint 4.2 — Config Hardening & Metrics

**Goal**: Server refuses to start with unsafe configuration. System exposes health metrics.

In simple terms:
1. Fail-fast config validation — reject missing or default JWT secrets in production
2. Expose Prometheus metrics endpoint
3. Track key metrics: request rate, error rate, latency, active connections

**Tasks**:
- [ ] Refactor config to return errors (fail-fast)
- [ ] Prometheus metrics middleware
- [ ] Custom metrics (transfer count, transfer latency, error rate)
- [ ] Health check endpoint
- [ ] Grafana dashboard (optional)

---

## Acceptance Criteria (Level 4 Complete)

- [ ] gRPC calls timeout after configured deadline
- [ ] Transient failures are retried with backoff
- [ ] Server shuts down gracefully (finishes active requests, closes connections)
- [ ] Server refuses to start with default JWT secret in production mode
- [ ] Prometheus metrics are exposed and scrapable
- [ ] System behaves predictably when Redis or Kafka is temporarily unavailable
