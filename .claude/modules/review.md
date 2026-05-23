# Module: Review (Danh Sách BOM)

**Page**: `app/dashboard/review/page.tsx` (1296 lines)
**APIs**: `app/api/bom/`, `app/api/bom/quotation/[id]`

## Tính năng chính

1. **Bảng danh sách BOM** — filter, sort, paginate
2. **Chi tiết BOM** — modal xem đầy đủ (gold table, stone table)
3. **Báo giá** — modal in quotation PDF
4. **Chiết khấu** — modal nhập % discount (Admin/Manager)
5. **Lightbox** — click ảnh → xem full-size
6. **Print popup** — in báo giá ra cửa sổ mới

## Image Handling

**DriveImage component** (module-level trong page.tsx):
```typescript
function DriveImage({ url, size, style, onClick, alt }) {
  // 1. Init src = blobCache (nếu đã fetch) hoặc thumbnail URL
  // 2. onError → fetchDriveBlob(fileId) → update src
  // 3. Dùng triedRef để tránh infinite error loop
  // 4. Trả null nếu tất cả đều fail
}
```

**Caches** (module-level):
- `blobCache: Map<fileId, blobUrl>` — cho display
- `dataUriCache: Map<fileId, dataUri>` — cho print popup

**extractDriveId(url)** — parse file ID từ:
- Raw ID (`[a-zA-Z0-9_-]{20,}`)
- `/file/d/{id}/`
- `?id={id}`
- thumbnail URL

**getLightboxSrc(url)** — đọc blobCache trước, fallback thumbnail 1600px

## Filter State

```typescript
// Filters có trong UI:
search: string          // full-text search
dateFrom/dateTo: string // date range
store: string           // store filter
productType: string     // product type filter
priceListType: string   // price list type filter
```

## BOM List Data (từ GET /api/bom)

Fields hiển thị trong bảng:
- Thumbnail (img1, 36×36px)
- Date, SO/MO, Model, Product Type
- Cost Total (chỉ Admin/Manager)
- Sell Price, Discount%, Discount Price (Admin/Manager/Order)
- Salesperson, Store
- Action buttons

## Chi tiết Modal (GET /api/bom/[bomId])

Hiển thị đầy đủ:
- Header info (date, model, customer, store, salesperson...)
- Ảnh sản phẩm (img1/2/3) → DriveImage
- Gold table (type, color, weight)
- Stone table (group, size, qty, tl_hot, price) — ẩn cho Sales/Supervisor
- Cost breakdown — ẩn cho Sales/Supervisor/Order
- Sell price, discount info — ẩn cho Sales/Supervisor

## Báo Giá Modal (GET /api/bom/quotation/[id])

Hiển thị:
- Logo công ty (từ `mk_price_list_type.logo_url`) → DriveImage
- Header: date, product type, customer, SO/MO, model, salesperson, store
- Ảnh sản phẩm (img1/2/3, 80×80)
- Material: gold types, colors, weight, stone names
- Price: sell_price, discount_pct, discount_price

**Print**: click Print → `window.open()` với HTML string → dùng `data:` URIs (không phải blob)

## Discount Modal

```
Chỉ Admin/Manager thấy button Chiết Khấu (%)
POST /api/bom/[bomId]/discount { discountPct, discountAmt }
→ UPDATE bom SET discount_pct, discount_price
→ logAction('DISCOUNT', 'bom', ...)
```

## Pagination

Client-side pagination (data đã load all):
```typescript
const ITEMS_PER_PAGE = 20
const paged = filtered.slice((page-1)*20, page*20)
```

## Key State

```typescript
boms: BomRow[]           // all loaded
filtered: BomRow[]       // after filter
paged: BomRow[]          // current page

detailBomId: string|null // xem chi tiết
quotBomId: string|null   // xem báo giá
discountBom: BomRow|null // đang chiết khấu
lightboxSrc: string      // lightbox image URL
```
