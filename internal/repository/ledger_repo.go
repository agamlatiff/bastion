package repository

import (
	"context"

	"github.com/agamlatiff/bastion/internal/domain"
)

// LedgerRepository defines the persistence interface for the immutable `ledger_entries` table.
type LedgerRepository interface {
	Insert(ctx context.Context, db DBTX, entry *domain.LedgerEntry) error
}

type ledgerRepo struct{}

// NewLedgerRepository creates a new stateless LedgerRepository instance.
func NewLedgerRepository() LedgerRepository {
	return &ledgerRepo{}
}

// Insert appends a new immutable debit or credit ledger record into `ledger_entries`.
func (r *ledgerRepo) Insert(ctx context.Context, db DBTX, entry *domain.LedgerEntry) error {
	query := `
		INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return db.QueryRow(
		ctx, query,
		entry.TransactionID,
		entry.WalletID,
		entry.EntryType,
		entry.Amount,
		entry.BalanceAfter,
	).Scan(&entry.ID, &entry.CreatedAt)
}
