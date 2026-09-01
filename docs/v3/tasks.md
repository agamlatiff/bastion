# Bastion V3 — External Systems & Reliable Async Processing

V3 focuses on migrating Bastion from a purely synchronous financial core to a resilient financial system capable of interacting with external systems asynchronously and reliably. 

## Philosophy
*   **Modular Monolith:** We are NOT splitting into microservices yet. The goal is to master distributed communication concepts (webhooks, outbox, reconciliation) without the overhead of service decomposition.
*   **Learning Track Mandatory:** Every sprint requires completing a strict learning track (Build, Learn, Review, Practice, Interview). Code completion alone is not enough; deep understanding is required.

---

# Sprint 19 — Transaction Lifecycle

### Goal
Transform transactions from simple synchronous operations into **stateful business processes**.

### Tasks
* [x] Review transaction implementation V2
* [x] Define transaction lifecycle
* [x] Define transaction states
* [x] Define valid state transitions
* [x] Define invalid transitions
* [x] Implement transition rules
* [x] Add transaction status history
* [x] Add transition reason
* [x] Update transaction domain model
* [x] Update database schema
* [x] Update API response
* [x] Add state transition tests
* [x] Add invalid transition tests
* [x] Add concurrent transition tests

### Learning Track
**LEARN:** State machine, Domain invariants, State transition, Business lifecycle, Finite-state machines, Transaction vs HTTP request lifecycle.
**KNOWLEDGE CHECK:**
> Why do transactions need state?
> Why is `COMPLETED → PROCESSING` an invalid transition?
> What is the difference between transaction state and HTTP status?
> What happens if two concurrent requests attempt to change the state simultaneously?

---

# Sprint 20 — External Payment Provider

### Goal
Enable Bastion to communicate with an external payment system securely and reliably.

### Tasks
* [ ] Define external provider interface
* [ ] Define provider request model
* [ ] Define provider response model
* [ ] Create provider client
* [ ] Implement authentication
* [ ] Configure provider credentials
* [ ] Implement request timeout
* [ ] Implement response validation
* [ ] Handle provider errors
* [ ] Map provider errors → Bastion errors
* [ ] Implement payment initiation
* [ ] Store provider transaction ID
* [ ] Store provider metadata
* [ ] Add provider mock
* [ ] Add integration tests

### Learning Track
**LEARN:** External API integration, HTTP client, Timeout, Dependency inversion, Adapter pattern, Error mapping, Third-party API reliability.
**KNOWLEDGE CHECK:**
> Why do we need an interface for the provider?
> What happens if the provider times out?
> Does a timeout guarantee the payment failed? (Crucial question)

---

# Sprint 21 — Webhook Processing

### Goal
Allow Bastion to securely receive and process asynchronous notifications from the external provider.

### Tasks
* [ ] Design webhook endpoint
* [ ] Define webhook payload
* [ ] Implement signature verification
* [ ] Validate webhook timestamp
* [ ] Validate provider event ID
* [ ] Store incoming webhook
* [ ] Implement webhook parsing
* [ ] Map provider event → transaction state
* [ ] Implement state transition
* [ ] Return correct HTTP response
* [ ] Add webhook logging
* [ ] Add webhook tests
* [ ] Add invalid signature tests
* [ ] Add malformed payload tests

### Learning Track
**LEARN:** Webhooks, HMAC/signatures, Authentication vs verification, Event-driven communication, At-least-once delivery.
**KNOWLEDGE CHECK:**
> Why must webhooks be verified?
> What happens if the same webhook is received twice?
> Why can't we blindly trust the payload sent by the provider?

---

# Sprint 22 — Idempotency, Retry & Failure Handling

### Goal
Ensure operations remain safe during timeouts, retries, network failures, and duplicate requests/webhooks. (Core V3 concept)

### Tasks
* [ ] Review idempotency implementation V2
* [ ] Define idempotency requirements V3
* [ ] Add idempotency key handling
* [ ] Store idempotency records
* [ ] Handle duplicate requests
* [ ] Handle duplicate webhooks
* [ ] Implement retry policy
* [ ] Implement exponential backoff
* [ ] Define retryable errors
* [ ] Define non-retryable errors
* [ ] Add retry limit
* [ ] Add retry state
* [ ] Handle provider timeout
* [ ] Handle provider 5xx
* [ ] Handle network failure
* [ ] Add retry tests
* [ ] Add duplicate request tests
* [ ] Add duplicate webhook tests

### Learning Track
**LEARN:** Idempotency, Retry, Exponential backoff, Transient vs permanent failure, At-least-once delivery, Exactly-once illusion.
**KNOWLEDGE CHECK:**
> If the provider times out after a payment request is sent, can we safely retry immediately?
> What happens when a duplicate webhook arrives?
> Why can retry mechanisms cause duplicate payments?

---

# Sprint 23 — Asynchronous Processing

### Goal
Decouple heavy external interactions from the main HTTP request thread via background workers.

### Tasks
* [ ] Define asynchronous jobs
* [ ] Define job states
* [ ] Create jobs table
* [ ] Implement job enqueue
* [ ] Implement worker
* [ ] Implement polling
* [ ] Implement job execution
* [ ] Implement job retry
* [ ] Implement failed job state
* [ ] Implement retry delay
* [ ] Implement graceful worker shutdown
* [ ] Implement worker concurrency
* [ ] Prevent duplicate job execution
* [ ] Add worker metrics
* [ ] Add worker logging
* [ ] Add worker tests

### Learning Track
**LEARN:** Background jobs, Worker pattern, Producer/consumer, Queue, Concurrency, Backpressure, Graceful shutdown.
**KNOWLEDGE CHECK:**
> Why shouldn't payment processing block the HTTP request?
> What happens if the worker crashes mid-execution?
> How do we prevent two workers from executing the exact same job twice?

---

# Sprint 24 — Transactional Outbox

### Goal
Solve the dual-write problem by guaranteeing atomicity between database writes and external event publishing.

### Tasks
* [ ] Define outbox event schema
* [ ] Create outbox table
* [ ] Write domain event + business data atomically
* [ ] Implement outbox publisher
* [ ] Implement polling
* [ ] Implement event publishing
* [ ] Add published status
* [ ] Add retry count
* [ ] Add failure state
* [ ] Implement retry
* [ ] Handle duplicate event delivery
* [ ] Add cleanup/retention strategy
* [ ] Add metrics
* [ ] Add tests
* [ ] Simulate publisher failure

### Learning Track
**LEARN:** Transactional Outbox, Dual-write problem, Atomicity across DB + external systems, Event delivery guarantees, Eventual consistency.
**KNOWLEDGE CHECK:**
> Why can't we simply publish an event immediately after calling `DB COMMIT`?
> What exactly is the dual-write problem?
> Why can the outbox pattern still result in duplicate events?

---

# Sprint 25 — Reconciliation

### Goal
Ensure data consistency between Bastion and the external provider by detecting and resolving mismatches.

### Tasks
* [ ] Define reconciliation requirements
* [ ] Define reconciliation window
* [ ] Fetch provider transactions
* [ ] Match transaction IDs
* [ ] Compare status
* [ ] Compare amount
* [ ] Compare currency
* [ ] Detect missing transactions
* [ ] Detect mismatched transactions
* [ ] Create reconciliation record
* [ ] Create reconciliation discrepancy
* [ ] Add discrepancy status
* [ ] Implement manual review flow
* [ ] Add reconciliation report
* [ ] Add tests

### Learning Track
**LEARN:** Reconciliation, Eventual consistency, Data integrity, Financial operations, Batch processing, Operational tooling.
**KNOWLEDGE CHECK:**
> Why is reconciliation necessary even if our webhook system is reliable?
> What actions should be taken when a discrepancy is found?
> Which system (Bastion or the Provider) is considered the source of truth?

---

# Sprint 26 — V3 Reliability & Integration Audit

### Goal
Final audit to verify all V3 components work together flawlessly as a single, resilient system.

### Testing
* [ ] Unit test audit
* [ ] Integration test audit
* [ ] End-to-end payment flow
* [ ] Webhook flow
* [ ] Retry flow
* [ ] Duplicate webhook
* [ ] Duplicate request
* [ ] Provider timeout
* [ ] Provider failure
* [ ] Worker failure
* [ ] Outbox failure
* [ ] Reconciliation mismatch

### Reliability
* [ ] Review timeout configuration
* [ ] Review retry policy
* [ ] Review idempotency
* [ ] Review failure handling
* [ ] Review transaction consistency
* [ ] Review race conditions
* [ ] Review worker concurrency

### Security
* [ ] Webhook signature review
* [ ] Secrets review
* [ ] API authentication review
* [ ] Authorization review
* [ ] Sensitive data logging review

### Observability
* [ ] Structured logging
* [ ] Payment metrics
* [ ] Webhook metrics
* [ ] Retry metrics
* [ ] Worker metrics
* [ ] Outbox metrics
* [ ] Reconciliation metrics

### Documentation
* [ ] Update architecture.md
* [ ] Update api.md
* [ ] Update database.md
* [ ] Update tech-spec.md
* [ ] Document failure scenarios
* [ ] Document transaction lifecycle
* [ ] Document provider integration
* [ ] Document webhook flow
* [ ] Document retry strategy
* [ ] Document outbox architecture
* [ ] Document reconciliation
