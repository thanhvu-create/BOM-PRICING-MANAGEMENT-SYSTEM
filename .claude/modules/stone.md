# Module: Hột Đá (Stone)

**APIs**: `app/api/master/lookup`, `app/api/master/stone`, `app/api/master/dm`

## Data Flow

```
dm_size (master nguồn)
  → sync_dm_size_to_stone_material() [PostgreSQL function]
  → stone_material (lookup table)
  → lookup_stone_grade() [PostgreSQL function]
  → BOM stone rows
```

## Lookup Logic (QUAN TRỌNG)

```sql
-- mm type: lookup theo mm_size (physical size)
WHERE group_code = p_group_code
  AND type_input = 'mm'
  AND p_mm_size BETWEEN min_size AND max_size

-- ct type: lookup theo ctw1pc (carat weight per piece)
WHERE group_code = p_group_code
  AND type_input = 'ct'
  AND p_ctw1pc BETWEEN min_size AND max_size
```

**Không bao giờ** dùng ctw1pc để lookup mm type và ngược lại.

## API: `/api/master/lookup`

```
GET ?groupCode=RD&mmSize=1.2&ctw1pc=0.008

Response:
{
  gradeId: 'RD-1.2',
  inputType: 'mm',
  sellingPrice: 0.45,
  pricingUnit: 'ct'
}
```

## stone_material Fields

| Column | Ghi chú |
|---|---|
| group_code | Nhóm đá (VD: 'RD', 'EME', 'SAP') |
| grade_id | Unique ID cho size cụ thể |
| type_input | 'mm' hoặc 'ct' |
| min_size/max_size | Range lookup |
| selling_price | = base_price × (1 + mkup) |
| unit | Pricing unit ('ct' hoặc 'pc') |
| full_name_vi/en | Tên đầy đủ |

## dm_size Fields (thêm so với stone_material)

| Column | Ghi chú |
|---|---|
| category | Loại đá |
| type | Sub-type |
| shape_code | Hình dạng |
| color | Màu |
| quality | Chất lượng |
| master_code | = group_code |
| diamond_price | Giá kim cương riêng |

## Sync

```
POST /api/master/sync
→ TRUNCATE stone_material
→ INSERT stone_material FROM dm_size
   (selling_price = base_price × (1 + mk))
```

Phải sync sau khi edit dm_size để cập nhật lookup.
