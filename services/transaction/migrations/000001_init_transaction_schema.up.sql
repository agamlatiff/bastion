CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    sender_wallet_id UUID,
    receiver_wallet_id UUID,
    amount BIGINT NOT NULL,
    fee_amount BIGINT NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL,
    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    description VARCHAR(500),
    failure_code VARCHAR(100),
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT transactions_amount_chk CHECK (amount > 0),
    CONSTRAINT transactions_fee_chk CHECK (fee_amount >= 0),
    CONSTRAINT transactions_type_chk CHECK (type IN ('TOPUP', 'TRANSFER', 'WITHDRAWAL', 'REFUND', 'REVERSAL')),
    CONSTRAINT transactions_status_chk CHECK (status IN ('CREATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_uq ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS transactions_sender_created_idx ON transactions(sender_wallet_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS transactions_receiver_created_idx ON transactions(receiver_wallet_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);

CREATE TABLE IF NOT EXISTS transaction_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trans_history_trans_id ON transaction_status_history(transaction_id);

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trans_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';
