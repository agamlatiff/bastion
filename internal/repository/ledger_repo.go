package repository

import (
	"github.com/agamlatiff/bastion/internal/domain"
	"context"
)

type LedgerRepository interface {
	Insert(ctx context.Context, db DBTX, entry *domain.LedgerEntry) error
}

type ledgerRepo struct{}

func NewLedgerRepository() LedgerRepository {
	return &ledgerRepo{}
}

func (r *ledgerRepo) Insert(ctx context.Context, db DBTX, entry *domain.LedgerEntry) error {
	query := `
		INSERT INTO ledger_entries (transaction_id, wallet_id, entry_type, amount, balance_after)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := db.Exec(ctx, query, entry.TransactionID, entry.WalletID, entry.EntryType, entry.Amount, entry.BalanceAfter)
	return err
}

