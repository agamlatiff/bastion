# ADR-007: Outbox Pattern Deferred to Future

**Date**: 2026-08-09
**Status**: Accepted

## Context

When a transfer succeeds (PostgreSQL transaction commits), an event should be published to Kafka so the Notification Service can push a real-time alert. The risk is a "dual-write" problem: the database commit succeeds but the Kafka publish fails, leaving the system in an inconsistent state.

The Transactional Outbox pattern solves this by writing the event to an `outbox_events` table inside the same SQL transaction, then having a background worker poll and publish to Kafka.

## Decision

**Defer** the Transactional Outbox pattern. Do not implement it until Kafka is actually integrated and the dual-write problem is real.

## Reasoning

- The outbox pattern solves a problem that only exists when combining PostgreSQL transactions with Kafka publishing
- At Level 1-2, there is no Kafka. The dual-write problem does not exist.
- Adding an `outbox_events` table and a background worker before they're needed adds schema and code complexity without solving an actual problem
- When Kafka is introduced at Level 3, the outbox pattern should be evaluated against simpler alternatives (e.g., publish-after-commit with retry)

**When to reconsider**:
- When Kafka is integrated and the team needs guaranteed event delivery
- When a transfer succeeds but the notification is lost due to Kafka unavailability
- When the learning objective specifically targets reliable event publishing

## Consequences

- `outbox_events` table is not in the current or planned schema
- If Kafka is introduced, this ADR should be superseded by a new ADR evaluating the outbox pattern against alternatives
- Events may be lost if a simpler publish-after-commit approach is used initially — this is an acceptable trade-off for learning
