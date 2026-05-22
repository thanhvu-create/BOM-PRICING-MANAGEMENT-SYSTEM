-- ============================================================
-- BOM Pricing Web App — Supabase PostgreSQL Schema
-- Migration from Google Sheets
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS (từ SYS_USERS)
-- ============================================================
CREATE TABLE users (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  username    text UNIQUE NOT NULL,
  role        text NOT NULL CHECK (role IN ('Admin','Manager','Sales Supervisor','Sales','Order')),
  store       text NOT NULL DEFAULT '' CHECK (store IN ('VN','US','ADM','')),
  created_at  timestamptz DEFAULT now()
);
-- Note: password handled by Supabase Auth (auth.users)
-- Link: auth.users.email = users.username (hoặc dùng metadata)

-- ============================================================
-- 2. BOM_DB (bảng chính BOM)
-- ============================================================
CREATE TABLE bom (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  bom_id          text UNIQUE NOT NULL,         -- YYMMDD-N-MODEL
  timestamp       timestamptz DEFAULT now(),
  date            date NOT NULL,
  product_type    text,
  so_mo           text,
  model           text,
  total_stone_qty int DEFAULT 0,
  total_stone_ctw numeric(10,4) DEFAULT 0,
  labor_hours     numeric(8,2) DEFAULT 0,
  price_list_type text,
  sp_type         text,                         -- 'Basic' | 'Fancy'
  cost_gold       numeric(12,2) DEFAULT 0,
  cost_stones     numeric(12,2) DEFAULT 0,
  cost_labor      numeric(12,2) DEFAULT 0,
  cost_subtotal   numeric(12,2) DEFAULT 0,
  cost_cif        numeric(12,2) DEFAULT 0,
  cost_total      numeric(12,2) DEFAULT 0,
  sell_price      numeric(12,2) DEFAULT 0,
  note            text,
  img1            text,
  img2            text,
  img3            text,
  folder_url      text,
  created_by      text NOT NULL,
  updated_at      timestamptz DEFAULT now(),
  updated_by      text,
  customer_name   text,
  discount_pct    numeric(6,4) DEFAULT 0,       -- VD: 0.05 = 5%
  discount_price  numeric(12,2) DEFAULT 0,
  sales_person    text,
  store           text
);

CREATE INDEX idx_bom_date        ON bom (date DESC);
CREATE INDEX idx_bom_created_by  ON bom (created_by);
CREATE INDEX idx_bom_store       ON bom (store);
CREATE INDEX idx_bom_bom_id      ON bom (bom_id);

-- ============================================================
-- 3. BOM_GOLD
-- ============================================================
CREATE TABLE bom_gold (
  id        uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  bom_id    text NOT NULL REFERENCES bom (bom_id) ON DELETE CASCADE,
  idx       int NOT NULL,
  gold_type text NOT NULL,    -- '10K','14K','18K','20K','22K','24K','PT','AG'
  color     text,             -- 'Yellow','White','Rose','Platinum'
  weight    numeric(10,4) NOT NULL DEFAULT 0
);

CREATE INDEX idx_bom_gold_bom_id ON bom_gold (bom_id);

-- ============================================================
-- 4. BOM_STONE
-- ============================================================
CREATE TABLE bom_stone (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  bom_id      text NOT NULL REFERENCES bom (bom_id) ON DELETE CASCADE,
  idx         int NOT NULL,
  group_code  text,
  grade_id    text,
  size        text,
  ctw1pc      numeric(10,5) DEFAULT 0,
  qty         int DEFAULT 0,
  tl_hot      numeric(10,5) DEFAULT 0,
  input_type  text CHECK (input_type IN ('mm','ct')),
  gia_ban     numeric(12,2) DEFAULT 0
);

CREATE INDEX idx_bom_stone_bom_id ON bom_stone (bom_id);

-- ============================================================
-- 5. GOLD_MATERIAL (giá vàng theo ngày)
-- Karat columns động → lưu trong JSONB karat_prices
-- VD: { "10K": 21.5, "14K": 30.1, "18K": 38.8, "PT": 32.5, "AG": 1.02 }
-- ============================================================
CREATE TABLE gold_material (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  price_date      date UNIQUE NOT NULL,
  amark_gold_oz   numeric(10,4),
  amark_pt_oz     numeric(10,4),
  amark_ag_oz     numeric(10,4),
  loss_factor     numeric(6,4) DEFAULT 1.06,
  karat_prices    jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_gold_material_date ON gold_material (price_date DESC);

-- ============================================================
-- 6. STONE_MATERIAL (sync từ dm_size — 11 cột)
-- ============================================================
CREATE TABLE stone_material (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_code      text NOT NULL,
  grade_id        text UNIQUE NOT NULL,
  display_name    text,
  unit            text,
  type_input      text CHECK (type_input IN ('mm','ct')),
  min_size        numeric(10,4),
  max_size        numeric(10,4),
  selling_price   numeric(12,4),
  base_price      numeric(12,4),
  mkup            numeric(8,4),
  full_name_vi    text,                          -- col[10] Full_Name_Vietnamese trong GAS
  full_name_en    text,                          -- col[11] Full_Name_EN trong GAS
  synced_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_stone_material_group_code ON stone_material (group_code);
CREATE INDEX idx_stone_material_grade_id   ON stone_material (grade_id);

-- ============================================================
-- 7. DM_SIZE (1.DM_Size — nguồn master cho stone_material)
-- ============================================================
CREATE TABLE dm_size (
  id                  uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  category            text,
  type                text,
  shape_code          text,
  color               text,
  quality             text,
  master_code         text NOT NULL,              -- = group_code
  grade_id            text UNIQUE NOT NULL,
  pricing_unit        text DEFAULT 'ct',
  measurement_type    text DEFAULT 'mm',
  min_size            numeric(10,4),
  max_size            numeric(10,4),
  display_name        text,
  base_price          numeric(12,4),
  mk                  numeric(8,4) DEFAULT 0,
  diamond_price       numeric(12,4),              -- có thể để trống
  full_name_vi        text,
  full_name_en        text,                       -- col[17] trong GAS DM_Size sheet
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_dm_size_master_code ON dm_size (master_code);
CREATE INDEX idx_dm_size_grade_id    ON dm_size (grade_id);

-- ============================================================
-- 8. DANH MỤC ĐÁ (DM_*)
-- ============================================================
CREATE TABLE dm_category (
  id    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name  text NOT NULL,
  code  text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);

CREATE TABLE dm_types (
  id    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name  text NOT NULL,
  code  text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);

CREATE TABLE dm_shape (
  id    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name  text NOT NULL,
  code  text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);

CREATE TABLE dm_color (
  id    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name  text NOT NULL,
  code  text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);

CREATE TABLE dm_quality (
  id    uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name  text NOT NULL,
  code  text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);

CREATE TABLE definition (
  id       uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  en_name  text NOT NULL,
  vn_name  text,
  code     text
);

-- ============================================================
-- 9. MK PRICING TABLES
-- ============================================================

-- Price List Types (dropdown loại bảng giá + logo)
CREATE TABLE mk_price_list_type (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  price_list_type text NOT NULL,
  region          text,
  store           text,
  logo_url        text,
  sort_order      int DEFAULT 0
);

-- Product Types
CREATE TABLE mk_product_type (
  id                      uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_type            text NOT NULL,
  details_en              text,
  details_vi              text,
  sort_order              int DEFAULT 0
);

-- SP Types (Kiểu SP trơn: Basic, Fancy, TSTT...)
CREATE TABLE mk_type_definition (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type_definition text NOT NULL,
  description     text,
  sort_order      int DEFAULT 0
);

-- Gold Colors
CREATE TABLE mk_color (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  color      text NOT NULL,
  sort_order int DEFAULT 0
);

-- Process Fee (Nhận hột $/viên, Lắp ráp $/giờ)
CREATE TABLE mk_process_fee (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  unit_name  text NOT NULL,
  unit_price numeric(10,4) NOT NULL DEFAULT 0,
  note       text,
  sort_order int DEFAULT 0
);

-- CIF Rate theo Price List Type
CREATE TABLE mk_cif_rate (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  price_list_type text NOT NULL,
  cif_rate        numeric(8,4) NOT NULL DEFAULT 0.10,  -- 0.10 = 10%
  sort_order      int DEFAULT 0
);

-- Price Gram (Markup vàng trơn — CASE A)
CREATE TABLE mk_price_gram (
  id              uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sp_type         text NOT NULL,
  weight_from     numeric(10,4) NOT NULL,
  weight_to       numeric(10,4) NOT NULL,
  markup_factor   numeric(8,4) NOT NULL DEFAULT 1.5,
  additional_price numeric(12,4) DEFAULT 0,
  sort_order      int DEFAULT 0
);

-- Store Markup (CASE B — dynamic price list columns)
-- markups = { "1)HPUS -P": 1.8, "B1)HPVN -P": 2.1, ... }
CREATE TABLE mk_store_markup (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  value_from  numeric(12,2) NOT NULL,
  value_to    numeric(12,2) NOT NULL,
  markups     jsonb NOT NULL DEFAULT '{}',
  sort_order  int DEFAULT 0
);

CREATE INDEX idx_mk_store_markup_range ON mk_store_markup (value_from, value_to);

-- Salesperson
CREATE TABLE salesperson (
  id                uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  salesperson_name  text NOT NULL,
  email             text,
  store             text,
  sort_order        int DEFAULT 0
);

-- Stores
CREATE TABLE store (
  id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_name text NOT NULL,
  region     text,
  sort_order int DEFAULT 0
);

-- ============================================================
-- 10. SYS_CONFIG
-- ============================================================
CREATE TABLE sys_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- Seed defaults
INSERT INTO sys_config (key, value) VALUES
  ('PROCESS_FEE_LAPRAP', '10'),
  ('VND_RATE', '25000');

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Bật RLS cho tất cả bảng nhạy cảm
ALTER TABLE bom           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_gold      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_stone     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE stone_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_size       ENABLE ROW LEVEL SECURITY;

-- Helper function: lấy role từ JWT metadata
CREATE OR REPLACE FUNCTION auth_role() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'app_role',
    'anon'
  );
$$ LANGUAGE sql STABLE;

-- Helper function: lấy store từ JWT metadata
CREATE OR REPLACE FUNCTION auth_store() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'app_store',
    ''
  );
$$ LANGUAGE sql STABLE;

-- BOM: user thấy BOM của mình + cùng store (Admin/Manager thấy tất cả)
CREATE POLICY bom_select ON bom FOR SELECT USING (
  auth_role() IN ('Admin', 'Manager')
  OR created_by = current_setting('request.jwt.claims', true)::json->>'username'
  OR (auth_store() != '' AND store = auth_store())
);

CREATE POLICY bom_insert ON bom FOR INSERT WITH CHECK (
  auth_role() IN ('Admin', 'Manager', 'Sales Supervisor', 'Sales', 'Order')
);

CREATE POLICY bom_update ON bom FOR UPDATE USING (
  auth_role() IN ('Admin', 'Manager')
  OR created_by = current_setting('request.jwt.claims', true)::json->>'username'
);

CREATE POLICY bom_delete ON bom FOR DELETE USING (
  auth_role() = 'Admin'
);

-- bom_gold, bom_stone: đi theo bom
CREATE POLICY bom_gold_all ON bom_gold FOR ALL USING (
  EXISTS (SELECT 1 FROM bom WHERE bom.bom_id = bom_gold.bom_id)
);

CREATE POLICY bom_stone_all ON bom_stone FOR ALL USING (
  EXISTS (SELECT 1 FROM bom WHERE bom.bom_id = bom_stone.bom_id)
);

-- Users: chỉ Admin đọc/ghi
CREATE POLICY users_select ON users FOR SELECT USING (auth_role() = 'Admin');
CREATE POLICY users_all    ON users FOR ALL    USING (auth_role() = 'Admin');

-- sys_config: ai cũng đọc, chỉ Admin/Manager ghi
CREATE POLICY config_select ON sys_config FOR SELECT USING (true);
CREATE POLICY config_update ON sys_config FOR UPDATE USING (auth_role() IN ('Admin', 'Manager'));

-- gold_material, stone_material, dm_size: ai cũng đọc, Admin ghi
CREATE POLICY gold_select ON gold_material   FOR SELECT USING (true);
CREATE POLICY gold_all    ON gold_material   FOR ALL    USING (auth_role() IN ('Admin', 'Manager'));
CREATE POLICY stone_select ON stone_material FOR SELECT USING (true);
CREATE POLICY stone_all    ON stone_material FOR ALL    USING (auth_role() = 'Admin');
CREATE POLICY dm_select ON dm_size           FOR SELECT USING (true);
CREATE POLICY dm_all    ON dm_size           FOR ALL    USING (auth_role() = 'Admin');

-- ============================================================
-- 12. FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bom_updated_at
  BEFORE UPDATE ON bom
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_gold_updated_at
  BEFORE UPDATE ON gold_material
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_dm_size_updated_at
  BEFORE UPDATE ON dm_size
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Lookup stone grade (tương đương lookupStoneGrade trong GAS)
-- Luôn dùng p_mm_size (CT/MM SIZE) để tra cứu, bất kể type_input là mm hay ct
CREATE OR REPLACE FUNCTION lookup_stone_grade(
  p_group_code  text,
  p_mm_size     numeric
)
RETURNS TABLE (
  grade_id      text,
  input_type    text,
  selling_price numeric,
  pricing_unit  text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.grade_id,
    sm.type_input,
    sm.selling_price,
    sm.unit
  FROM stone_material sm
  WHERE sm.group_code = p_group_code
    AND p_mm_size BETWEEN sm.min_size AND sm.max_size
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Sync dm_size → stone_material (tương đương syncDMSizeToStoneMaterial_)
CREATE OR REPLACE FUNCTION sync_dm_size_to_stone_material()
RETURNS void AS $$
BEGIN
  DELETE FROM stone_material;
  INSERT INTO stone_material (
    group_code, grade_id, display_name, unit, type_input,
    min_size, max_size, selling_price, base_price, mkup,
    full_name_vi, full_name_en, synced_at
  )
  SELECT
    master_code,
    grade_id,
    display_name,
    pricing_unit,
    measurement_type,
    min_size,
    max_size,
    base_price * (1 + COALESCE(mk, 0)),
    base_price,
    mk,
    COALESCE(full_name_vi, display_name),
    COALESCE(full_name_en, ''),
    now()
  FROM dm_size
  WHERE master_code IS NOT NULL AND master_code != '';
END;
$$ LANGUAGE plpgsql;

-- Generate BOM ID: YYMMDD-N-MODEL (timezone Asia/Ho_Chi_Minh)
CREATE OR REPLACE FUNCTION generate_bom_id(
  p_date  date,
  p_model text
)
RETURNS text AS $$
DECLARE
  v_date_str text;
  v_n        int;
  v_model    text;
BEGIN
  v_date_str := to_char(p_date AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMMDD');
  SELECT COUNT(*) + 1 INTO v_n
  FROM bom
  WHERE bom_id LIKE v_date_str || '-%';

  v_model := UPPER(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(p_model), ''), 'NOMODEL'), '\s+', '', 'g'));
  RETURN v_date_str || '-' || v_n || '-' || v_model;
END;
$$ LANGUAGE plpgsql;
