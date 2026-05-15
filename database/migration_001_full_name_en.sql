-- ============================================================
-- Migration 001: Add full_name_en
-- Lý do: syncDMSizeToStoneMaterial_() trong GAS giờ ghi 12 cột
--        bao gồm Full_Name_EN (col[11]).
--        getStoneTypeList() đọc row[11] = enName.
--        getBOMDetail() join enName từ row[11] của stone_material.
-- ============================================================

-- 1. stone_material — thêm cột full_name_en
ALTER TABLE stone_material
  ADD COLUMN IF NOT EXISTS full_name_en text;

-- 2. dm_size — thêm cột full_name_en (tương đương col[17] trong GAS DM_Size sheet)
ALTER TABLE dm_size
  ADD COLUMN IF NOT EXISTS full_name_en text;

-- 3. Cập nhật hàm sync để include full_name_en
CREATE OR REPLACE FUNCTION sync_dm_size_to_stone_material()
RETURNS void AS $$
BEGIN
  DELETE FROM stone_material;
  INSERT INTO stone_material (
    group_code, grade_id, display_name, unit, type_input,
    min_size, max_size, selling_price, base_price, mkup,
    full_name_vn, full_name_en, synced_at
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
    COALESCE(vietnamese_name, display_name),
    COALESCE(full_name_en, ''),
    now()
  FROM dm_size
  WHERE master_code IS NOT NULL AND master_code != '';
END;
$$ LANGUAGE plpgsql;
