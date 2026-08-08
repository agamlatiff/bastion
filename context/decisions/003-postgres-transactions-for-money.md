# ADR-003: PostgreSQL Transactions for Money Movement

**Date**: 2026-08-05
**Status**: Accepted

## Context

Bastion handles wallet-to-wallet money transfers. When user A sends money to user B, two wallet balances must change simultaneously. If either update fails, neither should be applied.

## Decision

Use **PostgreSQL ACID transactions** with **row-level locking** (`SELECT ... FOR UPDATE`) for all balance-mutating operations.

## Reasoning

- **Atomicity**: `BEGIN` / `COMMIT` ensures both balance changes happen together or not at all. A crashed server mid-transfer cannot leave money "in limbo."
- **Consistency**: `CHECK (balance >= 0)` constraint at the database level prevents negative balances even if application logic has bugs
- **Isolation**: `SELECT ... FOR UPDATE` acquires row-level locks, preventing concurrent transactions from reading stale balances
- **Deadlock prevention**: Locking wallets in ascending UUID order guarantees consistent lock acquisition, preventing deadlocks when two users transfer to each other simultaneously

**Why not application-level locking (e.g., Redis distributed locks)?**
- Redis locks can fail silently (network partition, TTL expiry)
- Database locks are released automatically on transaction commit/rollback
- Financial data integrity should rely on the database, not a separate system

## Consequences

- All money-movement code must run inside a database transaction
- `SELECT FOR UPDATE` holds locks until commit — transactions must be short-lived
- Must implement consistent lock ordering (ascending UUID) in all transfer code paths
