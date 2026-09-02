-- Migration 009: Expand id_card_number length for AES-GCM and add id_card_hash for Blind Indexing
ALTER TABLE kyc_verifications ALTER COLUMN id_card_number TYPE VARCHAR(255);
ALTER TABLE kyc_verifications DROP CONSTRAINT IF EXISTS kyc_verifications_id_card_number_key;
ALTER TABLE kyc_verifications ADD COLUMN IF NOT EXISTS id_card_hash VARCHAR(64) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_kyc_id_card_hash ON kyc_verifications(id_card_hash);
