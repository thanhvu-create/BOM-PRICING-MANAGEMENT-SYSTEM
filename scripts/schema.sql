-- ============================================================
-- BOM Pricing Management System — Full Database Schema
-- Supabase PostgreSQL
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin','Manager','Sales Supervisor','Sales','Order')),
  store TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BOM
CREATE TABLE IF NOT EXISTS bom (
  bom_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL,
  product_type TEXT,
  so_mo TEXT,
  model TEXT,
  total_stone_qty INTEGER DEFAULT 0,
  total_stone_ctw NUMERIC DEFAULT 0,
  labor_hours NUMERIC DEFAULT 0,
  price_list_type TEXT,
  sp_type TEXT DEFAULT 'Basic',
  cost_gold NUMERIC DEFAULT 0,
  cost_stones NUMERIC DEFAULT 0,
  cost_labor NUMERIC DEFAULT 0,
  cost_subtotal NUMERIC DEFAULT 0,
  cost_cif NUMERIC DEFAULT 0,
  cost_total NUMERIC DEFAULT 0,
  sell_price NUMERIC DEFAULT 0,
  note TEXT,
  img1 TEXT,
  img2 TEXT,
  img3 TEXT,
  folder_url TEXT,
  created_by TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT,
  customer_name TEXT,
  discount_pct NUMERIC DEFAULT 0,
  discount_price NUMERIC DEFAULT 0,
  sales_person TEXT,
  store TEXT
);

-- BOM Gold
CREATE TABLE IF NOT EXISTS bom_gold (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id TEXT NOT NULL REFERENCES bom(bom_id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  gold_type TEXT,
  color TEXT,
  weight NUMERIC DEFAULT 0
);

-- BOM Stone
CREATE TABLE IF NOT EXISTS bom_stone (
  id TEXT PRIMARY KEY,
  bom_id TEXT NOT NULL REFERENCES bom(bom_id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  group_code TEXT,
  grade_id TEXT,
  size NUMERIC,
  ctw_1pc NUMERIC DEFAULT 0,
  qty INTEGER DEFAULT 0,
  tl_hot NUMERIC DEFAULT 0,
  input_type TEXT DEFAULT 'mm',
  gia_ban NUMERIC DEFAULT 0
);

-- Gold Material
CREATE TABLE IF NOT EXISTS gold_material (
  price_date DATE PRIMARY KEY,
  amark_gold_oz NUMERIC,
  amark_pt_oz NUMERIC,
  amark_ag_oz NUMERIC,
  loss_factor NUMERIC DEFAULT 1.06,
  karat_prices JSONB DEFAULT '{}'
);

-- DM Tables
CREATE TABLE IF NOT EXISTS dm_size (
  grade_id TEXT PRIMARY KEY,
  category TEXT,
  type TEXT,
  shape_code TEXT,
  color TEXT,
  quality TEXT,
  master_code TEXT,
  pricing_unit TEXT,
  measurement_type TEXT,
  min_size NUMERIC,
  max_size NUMERIC,
  display_name TEXT,
  check_missing TEXT,
  base_price NUMERIC DEFAULT 0,
  mkup NUMERIC DEFAULT 0,
  diamond_price NUMERIC,
  full_name_vi TEXT,
  full_name_en TEXT
);

CREATE TABLE IF NOT EXISTS stone_material (
  grade_id TEXT PRIMARY KEY,
  group_code TEXT NOT NULL,
  display_name TEXT,
  unit TEXT,
  type_input TEXT,
  min_size NUMERIC,
  max_size NUMERIC,
  selling_price NUMERIC DEFAULT 0,
  base_price NUMERIC DEFAULT 0,
  mkup NUMERIC DEFAULT 0,
  full_name_vi TEXT,
  full_name_en TEXT
);
CREATE INDEX IF NOT EXISTS idx_stone_material_group_code ON stone_material(group_code);

CREATE TABLE IF NOT EXISTS dm_category  (code TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS dm_types     (code TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS dm_shape     (code TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS dm_color     (code TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS dm_quality   (code TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS dm_definition(code TEXT PRIMARY KEY, en_name TEXT, vn_name TEXT);

-- MK Pricing Tables
CREATE TABLE IF NOT EXISTS mk_price_list_type (
  price_list_type TEXT PRIMARY KEY,
  region TEXT,
  store TEXT,
  logo_url TEXT
);

CREATE TABLE IF NOT EXISTS mk_product_type (
  id SERIAL PRIMARY KEY,
  product_type TEXT,
  details_en TEXT,
  details_vi TEXT
);

CREATE TABLE IF NOT EXISTS mk_type_definition (
  id SERIAL PRIMARY KEY,
  type_definition TEXT
);

CREATE TABLE IF NOT EXISTS mk_color (
  id SERIAL PRIMARY KEY,
  color TEXT
);

CREATE TABLE IF NOT EXISTS mk_process_fee (
  id SERIAL PRIMARY KEY,
  unit_name TEXT,
  unit_price NUMERIC
);

CREATE TABLE IF NOT EXISTS mk_cif_rate (
  price_list_type TEXT PRIMARY KEY,
  cif_rate NUMERIC DEFAULT 0.1
);

CREATE TABLE IF NOT EXISTS mk_price_gram (
  id SERIAL PRIMARY KEY,
  sp_type TEXT,
  weight_from NUMERIC,
  weight_to NUMERIC,
  markup_factor NUMERIC,
  additional_price NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mk_store_markup (
  id SERIAL PRIMARY KEY,
  value_from NUMERIC,
  value_to NUMERIC,
  markups JSONB
);

CREATE TABLE IF NOT EXISTS salesperson (
  id SERIAL PRIMARY KEY,
  sales_person_name TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  store_name TEXT,
  region TEXT
);

-- Sys Config
CREATE TABLE IF NOT EXISTS sys_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  actor TEXT,
  role TEXT,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  summary TEXT,
  diff JSONB
);

-- ============================================================
-- Seed sys_config defaults
-- ============================================================
INSERT INTO sys_config (key, value, description) VALUES
  ('VND_RATE',              '0',  'Tỷ giá USD → VND'),
  ('PROCESS_FEE_LAPRAP',    '10', 'USD/giờ lắp ráp'),
  ('MANAGER_MAX_DISCOUNT',  '20', '% discount tối đa cho Manager')
ON CONFLICT (key) DO NOTHING;
