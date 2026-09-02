-- Migration 009: Expand id_card_number column length to accommodate AES-256-GCM encrypted ciphertext and remove UNIQUE constraint
ALTER TABLE kyc_verifications ALTER COLUMN id_card_number TYPE VARCHAR(255);
