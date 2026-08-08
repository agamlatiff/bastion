# ADR-002: pgxpool over database/sql

**Date**: 2026-08-05
**Status**: Accepted

## Context

Bastion needs a PostgreSQL driver for Go. The two main options are the standard library `database/sql` with a driver, or the native `pgx` library with its connection pool `pgxpool`.

## Decision

Use **`github.com/jackc/pgx/v5/pgxpool`** as the PostgreSQL driver and connection pool.

## Reasoning

- **Native PostgreSQL protocol**: `pgx` communicates directly with PostgreSQL using its binary wire protocol, avoiding the abstraction layer of `database/sql`
- **Connection pooling built-in**: `pgxpool` manages a pool of persistent connections, reducing connection overhead for high-concurrency workloads like concurrent transfers
- **Prepared statements**: Automatically prepares and caches SQL statements for repeated queries
- **PostgreSQL-specific features**: Direct access to `LISTEN/NOTIFY`, `COPY`, and advisory locks — features that `database/sql` abstracts away
- **No ORM overhead**: Writing raw SQL forces understanding of query performance, indexing, and PostgreSQL-specific behavior (important for financial systems)

**Alternatives considered**:
- **`database/sql` + `lib/pq`**: Standard but adds abstraction. Misses PostgreSQL-specific features. `lib/pq` is in maintenance mode.
- **GORM**: ORM adds convenience but hides SQL behavior. Dangerous for financial systems where understanding exact query behavior and locking is critical.
- **sqlx**: Lightweight extension of `database/sql`. Good middle ground but still lacks native pgx performance.

## Consequences

- Queries are PostgreSQL-specific (not portable to MySQL/SQLite — acceptable since Bastion is committed to PostgreSQL)
- Must manage connection pool configuration (max connections, idle timeout)
- Learning benefit: direct exposure to SQL without ORM magic
