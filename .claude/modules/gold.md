# Module: Giá Vàng (Gold Price)

**Page**: `app/dashboard/gold/page.tsx`
**APIs**: `app/api/gold/`

## Chức năng

Quản lý giá vàng theo ngày. Mỗi ngày 1 row trong `gold_material`.

## Data Flow

```
1. Auto-fetch (Cron): /api/cron/gold-price → /api/gold/fetch-amark → Amark API
   → Lưu amark_gold_oz, amark_pt_oz, amark_ag_oz
   → Tính karat_prices: { "10K": ..., "14K": ..., "18K": ..., ... }

2. Manual: Admin click "Fetch Amark" → POST /api/gold/fetch-amark
3. Manual override: Admin edit từng ô giá trong bảng
```

## Karat Price Formula (từ GAS gốc)

```typescript
gold_per_gr = (amark_gold_oz / 31.103) × (karat/24) × loss_factor
// VD: 18K = (amark / 31.103) × (18/24) × 1.06

PT_per_gr = (amark_pt_oz / 31.103) × loss_factor
AG_per_gr = (amark_ag_oz / 31.103) × loss_factor
```

`karat_prices` jsonb lưu kết quả đã tính: `{ "10K": 21.5, "14K": 30.1, "18K": 38.8, "PT": 32.5, "AG": 1.02 }`

## loss_factor

Default 1.06 (lỗi vàng trong gia công). Có thể edit per row.

## Cron Job

`vercel.json` hoặc Vercel cron config → `/api/cron/gold-price` → trigger auto mỗi ngày.

## API Routes

```
GET  /api/gold              → danh sách gold_material (Admin/Manager)
POST /api/gold              → thêm/update row
GET  /api/gold/fetch-amark  → fetch từ Amark + tính karat prices
GET  /api/gold/karat?date=  → giá karat cho ngày cụ thể (dùng trong calculate)
```

## Trigger Management

`/api/gold/trigger` — cấu hình auto-fetch schedule. UI trong gold page có tab quản lý trigger.
