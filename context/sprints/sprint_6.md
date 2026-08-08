# 🏃 Sprint 6 — Code Quality, Refactoring & Production Hardening

> **Module**: Phase 6 — Technical Debt Cleanup & Enterprise Readiness
> **Timeline**: Week 11–12 (14 Days)
> **Goal**: Clean up all technical debt accumulated from Sprint 1–5, harden security configurations, and ensure the codebase is production-ready.

---

## 🎯 Sprint Goal

Refactor and strengthen the entire codebase built across Sprint 1–5. By the end of this sprint, the server will refuse to start if security keys are unsafe (Fail-Fast), all server logs will be structured JSON ready for Grafana/Datadog, the server can shut down cleanly without interrupting active database transactions (Graceful Shutdown), and all code will be covered by unit tests above 80%.

In simple terms:
1. Refactor `config.go` to return errors — if `JWT_SECRET` is missing or still using a default value in production mode, the server refuses to start immediately.
2. Replace all `log.Printf` with structured JSON logging (`log/slog`) — every log line includes timestamp, level, method, path, status, and duration so monitoring tools can parse them automatically.
3. Build Graceful Shutdown — when someone presses `Ctrl+C` or the server receives a termination signal, it finishes all active database transactions before shutting down cleanly (Exit Code 0).
4. Write Table-Driven Unit Tests with Mock Repository — test login failure, duplicate email, and expired JWT scenarios without needing a real PostgreSQL database running.
5. Run static analysis and security linting (`golangci-lint` and `gosec`) — catch dead code, memory leaks, SQL injection risks, and hardcoded secrets before they reach production.

---

## 📋 Detailed Task Breakdown

---

### Task 1: Fail-Fast Configuration & Strict Validation

**Goal**: Ensure the server never runs with weak or default security keys.

**Details**:
- Refactor `LoadConfig()` to return `(*Config, error)` instead of just `*Config`.
- If `JWT_SECRET` is empty or still using the default value while running in production mode, return a fatal error.
- Validate PostgreSQL connection string format and Redis port number.

**Files**:
- `services/auth/internal/config/config.go`
- `services/auth/cmd/main.go` (update to handle the new error return)

---

### Task 2: Structured JSON Logging (`log/slog`)

**Goal**: Replace plain text logs with structured JSON logs that monitoring tools can parse.

**Details**:
- Replace all `log.Printf` and `log.Fatalf` calls with Go's built-in `log/slog` package.
- Each HTTP request log includes: `timestamp`, `level`, `method`, `path`, `status`, `duration_ms`.
- Add a **Request ID / Correlation ID** header so a single request can be traced from the API Gateway through to the Kafka worker.

**Files**:
- `services/auth/cmd/main.go`
- `services/auth/internal/handler/auth_handler.go`
- Custom Gin middleware for request logging

---

### Task 3: Graceful Shutdown (`SIGINT` & `SIGTERM`)

**Goal**: Allow the server to shut down cleanly without cutting off active database transactions.

**Details**:
- Listen for OS signals (`os.Interrupt`, `syscall.SIGTERM`).
- Use `server.Shutdown(ctx)` with a 10-second timeout to let active requests finish.
- Close `pgxpool` and `redis.Client` connections cleanly on shutdown.

**Files**:
- `services/auth/cmd/main.go`

---

### Task 4: Table-Driven Unit Testing & Mocking

**Goal**: Prove the code works correctly without needing a real database running.

**Details**:
- Create `auth_service_test.go` using Go's Table-Driven Test pattern.
- Build a Mock Repository that simulates database behavior in memory.
- Test scenarios: successful registration, duplicate email rejection, login with wrong password, expired JWT validation.
- Target: code coverage above 80%.

**Files**:
- `services/auth/internal/service/auth_service_test.go`
- `services/auth/internal/repository/mock_user_repository.go`

---

### Task 5: Static Analysis & Security Linting

**Goal**: Catch dead code, potential memory leaks, and security vulnerabilities before production.

**Details**:
- Install and run `golangci-lint` to clean up warnings and anti-patterns.
- Run `gosec` to audit for SQL injection, token leaks, and hardcoded secrets.
- Fix all critical and high-severity findings.

**Commands**:
```bash
golangci-lint run ./...
gosec ./...
```

---

## 🧪 Sprint Acceptance Criteria

- [ ] Server refuses to start if `JWT_SECRET` is unsafe in production mode (Fail-Fast).
- [ ] All server logs are structured JSON parseable by Grafana Loki / Datadog.
- [ ] Pressing `Ctrl+C` prints "Shutting down gracefully..." and finishes active transactions before exit (Exit Code 0).
- [ ] Unit tests pass (`go test ./...`) with coverage above 80%.
- [ ] `golangci-lint run` and `gosec ./...` produce 0 critical warnings.
