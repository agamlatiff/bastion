ALTER TABLE wallets
ADD CONSTRAINT check_wallet_balance_non_negative CHECK (balance >= 0),
ADD CONSTRAINT check_wallet_balance_within_limit CHECK (balance <= max_balance_limit);