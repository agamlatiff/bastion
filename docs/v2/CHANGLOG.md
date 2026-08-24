# Bastion V2 — Changelog & Migration Guide

## Known V1 Bugs (To be fixed in V2)
- **Concurrency / Double Spending:** V1 wallet operations lacked database-level row locking, allowing concurrent top-ups and transfers to bypass the `max_balance_limit` and create inconsistent balances.
- **Idempotency:** V1 lacked a mechanism to safely retry financial operations, meaning a double-clicked "transfer" button could result in two actual transfers.
- **Security:** KYC endpoints were accessible to any authenticated user; no RBAC (Role-Based Access Control) existed to restrict admin actions.
- **JWT Revocation:** Missing infrastructure to cleanly revoke tokens upon logout.

## Frozen V1 Behavior (Unchanged in V2)
- The core modular monolith architecture (Handler -> Service -> Repository).
- The RESTful URL structure (`/api/v1/...`) remains intact.
- The PostgreSQL + Redis stack.
- The core domain entities (User, Wallet, Transaction, KYC).

## Breaking Changes in V2
- **[BREAKING]** `POST /api/v1/wallet/top-up` now requires an `Idempotency-Key` header.
- **[BREAKING]** `POST /api/v1/wallet/transfer` now requires an `Idempotency-Key` header.
- **[BREAKING]** Admin/KYC review endpoints now strictly require the `KYC_REVIEWER` or `ADMIN` role. Regular users will receive `403 Forbidden`.
- **[BREAKING]** Wallet balances are now strictly enforced via PostgreSQL constraints (cannot be negative, cannot exceed limit). Invalid states will return a `422` or `409` rather than silently failing or corrupting data.
