CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    currency CHAR(3) NOT NULL, -- ISO 4217 (e.g. IDR, USD)
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    max_balance_limit BIGINT NOT NULL DEFAULT 1000000000 CHECK (max_balance_limit >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'CREATING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_customer_currency_active 
ON wallets(customer_id, currency) 
WHERE status != 'CLOSED';

CREATE INDEX IF NOT EXISTS idx_wallets_customer_id ON wallets(customer_id);

CREATE TABLE IF NOT EXISTS wallet_balance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL CHECK (balance >= 0),
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_snapshots_wallet_id ON wallet_balance_snapshots(wallet_id);

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON outbox_events(status);