-- Migration 004: Add note column to bom_stone
-- Allows users to add size/shape notes per stone row in BOM pricing

ALTER TABLE bom_stone ADD COLUMN IF NOT EXISTS note TEXT;
