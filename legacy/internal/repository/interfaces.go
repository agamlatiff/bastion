package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// DBTX is the unified interface covering both standard connection pools (*pgxpool.Pool)
// and active database transactions (pgx.Tx).
type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, arguments ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Transactor defines the interface for managing database transactions (Unit of Work pattern)
// and accessing the default database connection.
type Transactor interface {
	// WithTx executes the provided callback within an atomic transaction.
	// Automatically commits on nil error or rolls back on any returned error.
	WithTx(ctx context.Context, fn func(tx DBTX) error) error

	// DB returns the underlying non-transactional database connection pool.
	DB() DBTX
}
