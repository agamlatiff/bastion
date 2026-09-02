-- Migration 010: Add Two-Factor Authentication (2FA TOTP) columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
