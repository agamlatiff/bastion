package domain

import "time"

const (
	EntryTypeDebit  = "DEBIT"
	EntryTypeCredit = "CREDIT"
)

type LedgerEntry struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	WalletID      string    `json:"wallet_id"`
	EntryType     string    `json:"entry_type"`
	Amount        int64     `json:"amount"`
	BalanceAfter  int64     `json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}
