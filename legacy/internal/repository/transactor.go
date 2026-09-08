package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// pgxTransactor implements the Transactor interface using PostgreSQL pgxpool.
type pgxTransactor struct {
	db *pgxpool.Pool
}

// NewTransactor creates a new pgxTransactor instance wrapping the given pgx connection pool.
func NewTransactor(db *pgxpool.Pool) Transactor {
	return &pgxTransactor{db: db}
}

// WithTx starts a new PostgreSQL transaction and runs fn.
// It automatically rolls back if fn returns an error, or commits if fn succeeds.
func (t *pgxTransactor) WithTx(ctx context.Context, fn func(tx DBTX) error) error {
	// Step 1: Begin database transaction
	tx, err := t.db.Begin(ctx)
	if err != nil {
		return err
	}

	// Step 2: Execute service business logic callback
	err = fn(tx)
	if err != nil {
		// Step 3: Automatically rollback transaction on error
		_ = tx.Rollback(ctx)
		return err
	}

	// Step 4: Commit transaction permanently
	return tx.Commit(ctx)
}

// DB returns the underlying non-transactional database connection pool.
func (t *pgxTransactor) DB() DBTX {
	return t.db
}
