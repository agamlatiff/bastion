# ADR-004: Redis for JWT Blacklist

**Date**: 2026-08-06
**Status**: Accepted

## Context

JWT tokens are stateless — the server doesn't track active sessions. When a user logs out, the token remains valid until it expires (24 hours). We need a way to immediately invalidate tokens on logout.

## Decision

Use **Redis** to store blacklisted JWT tokens with a TTL matching the token's remaining lifespan.

Key format: `blacklist:{jwt_token_string}`

## Reasoning

- **Sub-millisecond lookup**: Every authenticated request must check if the token is blacklisted. Redis provides O(1) lookups in under 1ms, adding negligible latency to every request
- **Automatic cleanup via TTL**: When a token with 6 hours remaining is blacklisted, Redis automatically deletes the key after 6 hours. No cleanup cron job needed. Memory usage stays bounded.
- **Shared state across instances**: When multiple Go server instances run behind a load balancer, they all need to see the same blacklist. Redis provides this shared state naturally.

**Alternatives considered**:
- **Database table (`blacklisted_tokens`)**: Works but adds a database query to every authenticated request. Requires manual cleanup of expired entries.
- **In-memory map**: Fast but not shared across server instances. Restart loses all blacklist state.
- **Short-lived tokens (no blacklist)**: Reduces attack window but doesn't allow immediate revocation on logout.

## Consequences

- Redis becomes a runtime dependency for authentication
- If Redis is down, blacklist checks fail — must decide on fail-open vs fail-closed (see architecture.md §8)
- Token strings are used as Redis keys — ensure tokens don't exceed Redis key length limits
