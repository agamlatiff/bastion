# Level 2 — Correctness

> **Goal**: Ensure data integrity under concurrent load
> **Technologies**: PostgreSQL transactions, row-level locking, Redis idempotency
> **Observability introduced**: Request IDs

---

## Sprint 2.1 — P2P Transfer with Concurrency Safety

**Goal**: Users can transfer money to each other safely — even under simultaneous requests.

In simple terms:
1. Build P2P transfer endpoint — Tier 2 users can send money by recipient email
2. Implement deadlock prevention — lock wallets in ascending UUID order
3. Implement double-entry bookkeeping — every transfer creates debit + credit entries
4. Implement idempotency — duplicate requests return cached response, not double-charge

**Tasks**:
- [ ] Transfer handler & service
- [ ] Deadlock-safe wallet locking (ascending UUID order)
- [ ] Double-entry ledger recording within same transaction
- [ ] Redis idempotency key check
- [ ] Tier gate (only Tier 2 can send transfers)
- [ ] Receiver balance limit check
- [ ] Concurrent transfer testing

---

## Sprint 2.2 — Audit Logging & Request IDs

**Goal**: Every critical action is logged with security context. Every request has a traceable ID.

In simple terms:
1. Add audit logging for login, transfer, and KYC submission
2. Add request ID middleware — attach unique ID to every request
3. Include request ID in all log lines for traceability

**Tasks**:
- [ ] SQL migration (add `audit_logs` table)
- [ ] Audit log repository
- [ ] Audit logging in auth service (login events)
- [ ] Audit logging in wallet service (transfer events)
- [ ] Request ID middleware (generate UUID, attach to context)
- [ ] Structured logging with request ID

---

## Acceptance Criteria (Level 2 Complete)

- [ ] Two users can transfer money to each other simultaneously without deadlock
- [ ] Duplicate transfer requests (same idempotency key) return cached response
- [ ] Tier 1 users are rejected from sending transfers (403)
- [ ] Transfers that exceed receiver's limit are rejected (422)
- [ ] All critical actions are recorded in audit logs with IP and User-Agent
- [ ] Every log line includes a request ID
