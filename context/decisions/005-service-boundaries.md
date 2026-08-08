# ADR-005: Service Boundaries

**Date**: 2026-08-09
**Status**: Accepted

## Context

Bastion has 6 domain areas: Identity, Wallet, Money Movement, KYC, Notifications, Audit. We need to decide how to group these into deployable services.

## Decision

Three services with progressive introduction:

| Service | Domains | Rationale |
|---------|---------|-----------|
| **Auth Service** | Identity + KYC | KYC is tightly coupled to user identity — upgrading a tier changes user state. Separating them would require constant cross-service calls for a simple state change. |
| **Wallet Service** | Wallet + Money Movement + Ledger | Balance mutations, transfers, and ledger entries must happen in the same database transaction. Splitting them across services would break ACID guarantees. |
| **Notification Service** | Notifications | Notifications are consumed asynchronously from Kafka. This service has a fundamentally different runtime pattern (consumer vs request-response), justifying separation. |

**Audit** stays within the relevant services. Login audit belongs in Auth. Transfer audit belongs in Wallet. There is no independent audit service.

## Reasoning

**Why not one service per domain?**
- 6 microservices for a portfolio project is artificial complexity
- KYC separated from Auth would require cross-service transactions (distributed transactions are hard and don't serve learning objectives at Level 1)
- Money Movement separated from Wallet would break ACID — the whole point of using PostgreSQL transactions

**Why not a single monolith?**
- A monolith doesn't teach service boundaries, gRPC, or inter-service communication
- The goal is to demonstrate understanding of *when* to split, not to maximize service count

**Why these specific boundaries?**
- Auth + Wallet separation creates a meaningful gRPC communication problem (Gateway must call two different services)
- Notification Service's consumer pattern (Kafka → process → WebSocket push) is fundamentally different from request-response services, making it a natural boundary

## Consequences

- Level 1-2: Everything runs as Auth Service (monolith-first)
- Level 3: Split into Auth + Wallet + Notification with gRPC + API Gateway
- Audit logging requires each service to implement its own audit recording
