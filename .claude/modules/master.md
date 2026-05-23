# Module: Master Data

**Page**: `app/dashboard/master/page.tsx` (653 lines)
**APIs**: `app/api/master/`

## Chức năng

Quản lý danh mục đá: xem/edit `dm_size` → sync → `stone_material`.

## Tabs trong UI

1. **Stone Master** — CRUD `dm_size` (nguồn gốc)
2. **DM Category** — `dm_category`
3. **DM Types** — `dm_types`
4. **DM Shape** — `dm_shape`
5. **DM Color** — `dm_color`
6. **DM Quality** — `dm_quality`

## dm_size Fields (trong form edit)

| Field | Required | Ghi chú |
|---|---|---|
| master_code | ✅ | = group_code |
| grade_id | ✅ | Unique |
| display_name | ❌ | |
| pricing_unit | ❌ | 'ct' \| 'pc' |
| measurement_type | ❌ | 'mm' \| 'ct' |
| min_size | ✅ | |
| max_size | ✅ | min ≤ max |
| base_price | ✅ | |
| mk | ❌ | Markup %, VD: 0.3 = 30% |
| full_name_vi | ❌ | |
| full_name_en | ❌ | |

## Sync Flow

```
POST /api/master/sync
→ PostgreSQL: sync_dm_size_to_stone_material()
→ TRUNCATE stone_material
→ INSERT FROM dm_size (selling_price = base_price × (1 + mk))
→ Admin confirm trước khi sync (button riêng)
```

**Phải sync** sau khi edit dm_size để BOM pricing dùng giá mới.

## Validation (từ GAS gốc)

- `min_size` phải ≤ `max_size`
- `grade_id` phải UNIQUE (check trước INSERT)
- `base_price` phải ≥ 0
- `mk` phải ≥ 0

## API Routes

```
GET    /api/master/stone          → list stone_material (cho lookup)
GET    /api/master/dropdowns      → { groupCodes[], gradeIds[], ... }
GET    /api/master/lookup?groupCode=&mmSize=&ctw1pc=
POST   /api/master/sync           → trigger sync dm_size→stone_material

GET    /api/master/dm/size        → list dm_size
POST   /api/master/dm/size        → create dm_size row
PUT    /api/master/dm/size?id=    → update dm_size row
DELETE /api/master/dm/size?id=    → delete dm_size row

GET/POST/PUT/DELETE /api/master/dm/category
GET/POST/PUT/DELETE /api/master/dm/types
GET/POST/PUT/DELETE /api/master/dm/shape
GET/POST/PUT/DELETE /api/master/dm/color
GET/POST/PUT/DELETE /api/master/dm/quality
```
