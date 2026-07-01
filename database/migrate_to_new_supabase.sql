-- ============================================================
-- BOM Pricing System — Full Schema Migration
-- Lấy từ DB thực tế (2026-05-25) qua information_schema
-- Chạy trong: Supabase Dashboard mới → SQL Editor → New Query
-- ============================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES (không FK — tạo trước)
-- ============================================================

CREATE TABLE IF NOT EXISTS sys_config (
  key         text        NOT NULL,
  value       text        NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  updated_by  text,
  description text,
  PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS salesperson (
  id               uuid    NOT NULL DEFAULT uuid_generate_v4(),
  salesperson_name text    NOT NULL,
  email            text,
  store            text,
  sort_order       integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS stores (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  store_name text    NOT NULL,
  region     text,
  sort_order integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS dm_category (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  name       text    NOT NULL,
  code       text    NOT NULL,
  sort_order integer DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS dm_types (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  name       text    NOT NULL,
  code       text    NOT NULL,
  sort_order integer DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS dm_shape (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  name       text    NOT NULL,
  code       text    NOT NULL,
  sort_order integer DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS dm_color (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  name       text    NOT NULL,
  code       text    NOT NULL,
  sort_order integer DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS dm_quality (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  name       text    NOT NULL,
  code       text    NOT NULL,
  sort_order integer DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS definition (
  id      uuid NOT NULL DEFAULT uuid_generate_v4(),
  en_name text NOT NULL,
  vn_name text,
  code    text,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS dm_size (
  id               uuid        NOT NULL DEFAULT uuid_generate_v4(),
  category         text,
  type             text,
  shape_code       text,
  color            text,
  quality          text,
  master_code      text        NOT NULL,
  grade_id         text        NOT NULL,
  pricing_unit     text        DEFAULT 'ct',
  measurement_type text        DEFAULT 'mm',
  min_size         numeric,
  max_size         numeric,
  display_name     text,
  base_price       numeric,
  mk               numeric     DEFAULT 0,
  diamond_price    numeric,
  full_name_vi     text,
  full_name_en     text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (grade_id)
);

CREATE TABLE IF NOT EXISTS stone_material (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  group_code    text        NOT NULL,
  grade_id      text        NOT NULL,
  display_name  text,
  unit          text,
  type_input    text,
  min_size      numeric,
  max_size      numeric,
  selling_price numeric,
  base_price    numeric,
  mkup          numeric,
  full_name_vi  text,
  full_name_en  text,
  synced_at     timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (grade_id)
);

CREATE TABLE IF NOT EXISTS gold_material (
  id            uuid        NOT NULL DEFAULT uuid_generate_v4(),
  price_date    date        NOT NULL,
  amark_gold_oz numeric,
  amark_pt_oz   numeric,
  amark_ag_oz   numeric,
  loss_factor   numeric     DEFAULT 1.06,
  karat_prices  jsonb       DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (price_date)
);

CREATE TABLE IF NOT EXISTS mk_price_list_type (
  id              uuid    NOT NULL DEFAULT uuid_generate_v4(),
  price_list_type text    NOT NULL,
  region          text,
  store           text,
  logo_url        text,
  sort_order      integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mk_product_type (
  id           uuid    NOT NULL DEFAULT uuid_generate_v4(),
  product_type text    NOT NULL,
  details_en   text,
  details_vi   text,
  sort_order   integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mk_type_definition (
  id              uuid    NOT NULL DEFAULT uuid_generate_v4(),
  type_definition text    NOT NULL,
  description     text,
  sort_order      integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mk_process_fee (
  id              uuid    NOT NULL DEFAULT uuid_generate_v4(),
  unit_name       text    NOT NULL,
  unit_price      numeric NOT NULL DEFAULT 0,
  note            text,
  unit_of_measure text    DEFAULT '',
  sort_order      integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mk_cif_rate (
  id              uuid    NOT NULL DEFAULT uuid_generate_v4(),
  price_list_type text    NOT NULL,
  cif_rate        numeric NOT NULL DEFAULT 0.10,
  sort_order      integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mk_price_gram (
  id               uuid    NOT NULL DEFAULT uuid_generate_v4(),
  sp_type          text    NOT NULL,
  weight_from      numeric NOT NULL,
  weight_to        numeric NOT NULL,
  markup_factor    numeric NOT NULL DEFAULT 1.5,
  additional_price numeric DEFAULT 0,
  sort_order       integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS mk_store_markup (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  value_from numeric NOT NULL,
  value_to   numeric NOT NULL,
  markups    jsonb   NOT NULL DEFAULT '{}',
  sort_order integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
  id                   uuid        NOT NULL DEFAULT uuid_generate_v4(),
  username             text        NOT NULL,
  role                 text        NOT NULL,
  store                text        NOT NULL DEFAULT '',
  created_at           timestamptz DEFAULT now(),
  google_refresh_token text,
  PRIMARY KEY (id),
  UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor      text        NOT NULL,
  role       text,
  action     text        NOT NULL,
  entity     text        NOT NULL,
  entity_id  text,
  summary    text,
  diff       jsonb,
  PRIMARY KEY (id)
);

-- ============================================================
-- 2. TABLES với FK (tạo sau)
-- ============================================================

CREATE TABLE IF NOT EXISTS bom (
  id             uuid        NOT NULL DEFAULT uuid_generate_v4(),
  bom_id         text        NOT NULL,
  created_at     timestamptz DEFAULT now(),
  date           date        NOT NULL,
  product_type   text,
  so_mo          text,
  model          text,
  total_stone_qty integer    DEFAULT 0,
  total_stone_ctw numeric    DEFAULT 0,
  labor_hours    numeric     DEFAULT 0,
  price_list_type text,
  sp_type        text,
  cost_gold      numeric     DEFAULT 0,
  cost_stones    numeric     DEFAULT 0,
  cost_labor     numeric     DEFAULT 0,
  cost_subtotal  numeric     DEFAULT 0,
  cost_cif       numeric     DEFAULT 0,
  cost_total     numeric     DEFAULT 0,
  sell_price     numeric     DEFAULT 0,
  note           text,
  img1           text,
  img2           text,
  img3           text,
  folder_url     text,
  created_by     text        NOT NULL,
  updated_at     timestamptz DEFAULT now(),
  updated_by     text,
  customer_name  text,
  discount_pct   numeric     DEFAULT 0,
  discount_price numeric     DEFAULT 0,
  sales_person   text,
  store          text,
  deleted_at     timestamptz,           -- soft delete (Sprint B)
  PRIMARY KEY (id),
  UNIQUE (bom_id)
);

CREATE TABLE IF NOT EXISTS bom_gold (
  id        uuid    NOT NULL DEFAULT uuid_generate_v4(),
  bom_id    text    NOT NULL,
  idx       integer NOT NULL,
  gold_type text    NOT NULL,
  color     text,
  weight    numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (bom_id) REFERENCES bom (bom_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bom_stone (
  id         uuid    NOT NULL DEFAULT uuid_generate_v4(),
  bom_id     text    NOT NULL,
  idx        integer NOT NULL,
  group_code text,
  grade_id   text,
  size       text,           -- text, không phải numeric
  ctw1pc     numeric DEFAULT 0,
  qty        integer DEFAULT 0,
  tl_hot     numeric DEFAULT 0,
  input_type text,
  gia_ban    numeric DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (bom_id) REFERENCES bom (bom_id) ON DELETE CASCADE
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bom_date         ON bom (date DESC);
CREATE INDEX IF NOT EXISTS idx_bom_created_by   ON bom (created_by);
CREATE INDEX IF NOT EXISTS idx_bom_store        ON bom (store);
CREATE INDEX IF NOT EXISTS idx_bom_bom_id       ON bom (bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_deleted_at   ON bom (deleted_at);

CREATE INDEX IF NOT EXISTS idx_bom_gold_bom_id  ON bom_gold (bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_stone_bom_id ON bom_stone (bom_id);

CREATE INDEX IF NOT EXISTS idx_gold_material_date        ON gold_material (price_date DESC);
CREATE INDEX IF NOT EXISTS idx_stone_material_group_code ON stone_material (group_code);
CREATE INDEX IF NOT EXISTS idx_stone_material_grade_id   ON stone_material (grade_id);
CREATE INDEX IF NOT EXISTS idx_dm_size_master_code       ON dm_size (master_code);
CREATE INDEX IF NOT EXISTS idx_dm_size_grade_id          ON dm_size (grade_id);
CREATE INDEX IF NOT EXISTS idx_mk_store_markup_range     ON mk_store_markup (value_from, value_to);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx      ON audit_log (actor);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx     ON audit_log (entity, action);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE bom            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_gold       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_stone      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_material  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stone_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_size        ENABLE ROW LEVEL SECURITY;

-- Helper: lấy role từ JWT
CREATE OR REPLACE FUNCTION auth_role() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'app_role',
    'anon'
  );
$$ LANGUAGE sql STABLE;

-- Helper: lấy store từ JWT
CREATE OR REPLACE FUNCTION auth_store() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'app_store',
    ''
  );
$$ LANGUAGE sql STABLE;

-- BOM policies
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

-- BOM Gold/Stone đi theo BOM
CREATE POLICY bom_gold_all ON bom_gold FOR ALL USING (
  EXISTS (SELECT 1 FROM bom WHERE bom.bom_id = bom_gold.bom_id)
);
CREATE POLICY bom_stone_all ON bom_stone FOR ALL USING (
  EXISTS (SELECT 1 FROM bom WHERE bom.bom_id = bom_stone.bom_id)
);

-- Users: chỉ Admin
CREATE POLICY users_select ON users FOR SELECT USING (auth_role() = 'Admin');
CREATE POLICY users_all    ON users FOR ALL    USING (auth_role() = 'Admin');

-- sys_config: ai cũng đọc, Admin/Manager ghi
CREATE POLICY config_select ON sys_config FOR SELECT USING (true);
CREATE POLICY config_update ON sys_config FOR UPDATE USING (auth_role() IN ('Admin', 'Manager'));
CREATE POLICY config_insert ON sys_config FOR INSERT WITH CHECK (auth_role() IN ('Admin', 'Manager'));

-- gold_material
CREATE POLICY gold_select ON gold_material FOR SELECT USING (true);
CREATE POLICY gold_all    ON gold_material FOR ALL    USING (auth_role() IN ('Admin', 'Manager'));

-- stone_material
CREATE POLICY stone_select ON stone_material FOR SELECT USING (true);
CREATE POLICY stone_all    ON stone_material FOR ALL    USING (auth_role() = 'Admin');

-- dm_size
CREATE POLICY dm_select ON dm_size FOR SELECT USING (true);
CREATE POLICY dm_all    ON dm_size FOR ALL    USING (auth_role() = 'Admin');

-- ============================================================
-- 5. FUNCTIONS & TRIGGERS
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

-- Generate BOM ID: YYMMDD-N-MODEL
CREATE OR REPLACE FUNCTION generate_bom_id(p_date date, p_model text)
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

-- Lookup stone grade
CREATE OR REPLACE FUNCTION lookup_stone_grade(
  p_group_code text,
  p_mm_size    numeric,
  p_ctw1pc     numeric
)
RETURNS TABLE (
  grade_id      text,
  input_type    text,
  selling_price numeric,
  pricing_unit  text
) AS $$
BEGIN
  RETURN QUERY
  SELECT sm.grade_id, sm.type_input, sm.selling_price, sm.unit
  FROM stone_material sm
  WHERE sm.group_code = p_group_code
    AND (
      (LOWER(sm.type_input) = 'mm' AND p_mm_size BETWEEN sm.min_size AND sm.max_size)
      OR
      (LOWER(sm.type_input) = 'ct' AND p_ctw1pc  BETWEEN sm.min_size AND sm.max_size)
    )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Sync dm_size → stone_material
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
    master_code, grade_id, display_name, pricing_unit, measurement_type,
    min_size, max_size,
    base_price * (1 + COALESCE(mk, 0)),
    base_price, mk,
    COALESCE(full_name_vi, display_name),
    COALESCE(full_name_en, ''),
    now()
  FROM dm_size
  WHERE master_code IS NOT NULL AND master_code != '';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. SYS_CONFIG defaults
-- ============================================================

INSERT INTO sys_config (key, value, description) VALUES
  ('VND_RATE',             '25000', 'Tỷ giá USD → VND'),
  ('PROCESS_FEE_LAPRAP',   '10',    'USD/giờ lắp ráp'),
  ('MANAGER_MAX_DISCOUNT', '20',    '% discount tối đa cho Manager'),
  ('GOLD_TRIGGER_ENABLED', 'true',  'Bật/tắt auto trigger giá vàng'),
  ('GOLD_TRIGGER_LF',      '1.06',  'Loss factor cho auto trigger')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- XONG — Kiểm tra
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT generate_bom_id(CURRENT_DATE, 'TEST');
-- ============================================================
