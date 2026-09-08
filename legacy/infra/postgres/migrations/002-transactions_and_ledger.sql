CREATE TABLE IF NOT EXISTS transactions (
    id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    sender_wallet_id UUID REFERENCES wallets(id),
    receiver_wallet_id UUID REFERENCES wallets(id),
    amount BIGINT NOT NULL CHECK (amount > 0),
    fee_amount BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    type VARCHAR(50) NOT NULL, -- 'topup', 'transfer'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
    description TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_sender ON transactions(sender_wallet_id, created_at DESC);
CREATe INDEX IF NOT EXISTS idx_transaction_receiver on transactions(receiver_wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_idem_key ON transactions(idempotency_key);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    entry_type VARCHAR(10) NOT NULL, -- 'debit', 'credit'
    amount BIGINT NOT NULL CHECK (amount > 0),
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet on ledger_entries(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_tx on ledger_entries(transaction_id);