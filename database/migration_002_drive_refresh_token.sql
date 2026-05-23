-- Migration 002: Add google_refresh_token to users table
-- Run in Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- Column stores AES-256-GCM encrypted refresh token
-- Format: iv_hex:ciphertext_hex:authtag_hex
-- Only writable/readable by server via SUPABASE_SERVICE_ROLE_KEY
