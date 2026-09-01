package repository

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
)

type pgxTransactor struct {
	db *pgxpool.Pool
}

func NewTransactor(db *pgxpool.Pool) Transactor {
	return &pgxTransactor{db: db}
}

func (t *pgxTransactor) WithTx(ctx context.Context, fn func(tx DBTX) error) error {
	tx, err := t.db.Begin(ctx)
	if err != nil {
		return err
	}

	err = fn(tx)
	if err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	return tx.Commit(ctx)
}

