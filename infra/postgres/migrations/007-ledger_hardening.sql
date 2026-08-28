ALTER TABLE ledger_entries
ADD CONSTRAINT chk_ledger_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT'));

ALTER TABLE transactions
ADD CONSTRAINT chk_transaction_type CHECK (type IN ('TOPUP', 'TRANSFER'));

CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ledger_entries is append-only; mutation is strictly prohibited';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_append_only_ledger
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION prevent_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('SUCCESS', 'FAILED') THEN
        RAISE EXCEPTION 'completed transactions cannot be modified';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_immutable_transactions
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_transaction_mutation();