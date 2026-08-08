# ADR-001: Go + Gin as Backend Stack

**Date**: 2026-08-01
**Status**: Accepted

## Context

Bastion needs a backend language and HTTP framework for building microservices that handle concurrent financial transactions.

## Decision

Use **Go (Golang)** as the primary language and **Gin** as the HTTP framework.

## Reasoning

**Go**:
- Goroutines provide lightweight concurrency for handling thousands of simultaneous requests — critical for a system processing concurrent wallet transfers
- Compiled to a single binary, making Docker images small and startup fast
- Strong static typing catches financial calculation errors at compile time rather than runtime
- Standard language in Southeast Asian fintech (Gojek, Xendit, Grab, Traveloka)
- Built-in `context` package for request cancellation and deadline propagation across service boundaries

**Gin**:
- Lightweight framework that doesn't hide HTTP fundamentals — good for learning
- Built-in middleware chaining for JWT auth, logging, and rate limiting
- `ShouldBindJSON` with struct validation tags (`binding:"required,email"`) reduces boilerplate
- High performance with low memory footprint

**Alternatives considered**:
- **Node.js/Express**: Single-threaded event loop is less intuitive for concurrent database operations. Weaker typing without TypeScript.
- **Java/Spring**: Heavy framework with steep learning curve. Slower startup for Docker containers.
- **Fiber (Go)**: Faster benchmarks than Gin but less mature ecosystem and documentation.

## Consequences

- Must learn Go idioms (error handling, interfaces, goroutines)
- Gin is minimalist — need to build or integrate middleware manually (JWT, rate limiting)
- No ORM by default — SQL queries are written manually (which is a learning benefit)
