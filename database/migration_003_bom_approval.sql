-- Migration 003: Add BOM approval workflow columns
-- Run this in Supabase SQL Editor

ALTER TABLE bom
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by     text,
  ADD COLUMN IF NOT EXISTS approved_at     timestamptz,
  ADD COLUMN IF NOT EXISTS approval_note   text;

ALTER TABLE bom
  ADD CONSTRAINT bom_approval_status_check
  CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));

-- Backfill existing rows: treat all existing BOMs as approved (already valid data)
UPDATE bom SET approval_status = 'approved' WHERE approval_status = 'draft';

-- Index for pending-count query performance
CREATE INDEX IF NOT EXISTS idx_bom_approval_status ON bom (approval_status) WHERE deleted_at IS NULL;
