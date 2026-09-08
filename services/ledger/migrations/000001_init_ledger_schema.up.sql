CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ledger Accounts (Chart of Accounts)
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_code VARCHAR(100) NOT NULL UNIQUE,
    account_type VARCHAR(30) NOT NULL,
    owner_type VARCHAR(50),
    owner_id UUID,
    currency CHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ledger_accounts_type_chk CHECK (
        account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')
    ),
    CONSTRAINT ledger_accounts_status_chk CHECK (
        status IN ('ACTIVE', 'FROZEN', 'CLOSED')
    )
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_owner ON ledger_accounts(owner_type, owner_id);

-- 2. Read Projection for Balances
CREATE TABLE IF NOT EXISTS account_balances (
    account_id UUID PRIMARY KEY REFERENCES ledger_accounts(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT account_balances_balance_chk CHECK (balance >= 0)
);

-- 3. Ledger Transactions (Group of double-entry rows)
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(255) NOT NULL UNIQUE,
    external_transaction_id UUID,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'POSTED',
    currency CHAR(3) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ledger_tx_type_chk CHECK (
        type IN ('TOPUP', 'TRANSFER', 'FEE', 'REFUND', 'REVERSAL', 'ADJUSTMENT', 'SETTLEMENT')
    ),
    CONSTRAINT ledger_tx_status_chk CHECK (
        status IN ('PENDING', 'POSTED', 'REVERSED')
    )
);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_external ON ledger_transactions(external_transaction_id);

-- 4. Ledger Entries (Double-Entry Journal Lines)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ledger_transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
    entry_type VARCHAR(10) NOT NULL,
    amount BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ledger_entries_amount_chk CHECK (amount > 0),
    CONSTRAINT ledger_entries_type_chk CHECK (entry_type IN ('DEBIT', 'CREDIT'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction ON ledger_entries(ledger_transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created ON ledger_entries(account_id, created_at DESC);
