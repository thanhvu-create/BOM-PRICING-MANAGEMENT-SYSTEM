# Module: MK Pricing Tables

**Page**: `app/dashboard/mk/page.tsx` (520 lines)
**API**: `app/api/mk/[sheet]`

## Các bảng quản lý

### 1. mk_price_list_type — Loại bảng giá
```
price_list_type: "1)HPUS -P", "B1)HPVN -P", ...
region: US | VN | ADM
store: VN | US | ADM
logo_url: Google Drive URL (hiện trong báo giá)
```

### 2. mk_product_type — Loại sản phẩm
```
product_type: "Ring", "Bracelet", "Necklace", ...
details_en, details_vi
```

### 3. mk_type_definition — SP Type
```
type_definition: "Basic", "Fancy", "TSTT", ...
```

### 4. mk_color — Màu vàng
```
color: "Yellow", "White", "Rose", "Platinum"
```

### 5. mk_process_fee — Phí gia công
```
unit_name: "Nhận hột" → feePerStone
unit_name: "Lắp ráp"  → feePerHour
unit_price: số tiền
```
**Quan trọng**: `calculate.ts` match theo substring ("nhận hột", "lắp ráp"). Nếu đổi tên phải update logic match.

### 6. mk_cif_rate — CIF Rate
```
price_list_type: "1)HPUS -P"
cif_rate: 0.10 (= 10%)
```
Mỗi price_list_type có CIF rate riêng. Dùng trong CASE B pricing.

### 7. mk_price_gram — Markup vàng trơn (CASE A)
```
sp_type: "Basic" | "Fancy"
weight_from / weight_to: range gram
markup_factor: 1.5 (= 150%)
additional_price: 0 hoặc số tiền thêm/gr
```
`sellPrice = goldCost × markup_factor + additional_price × totalWeight`

### 8. mk_store_markup — Markup có đá (CASE B)
```
value_from / value_to: range cost_total ($)
markups: JSONB {
  "1)HPUS -P": 1.8,
  "B1)HPVN -P": 2.1,
  "3)ADM1 -P": 1.9,
  ...
}
```
Lookup: tìm row có cost_total trong range → lấy markup theo price_list_type.

**Fallback normalize**: nếu không match chính xác `"1)HPUS -P"`, thử strip prefix `"1)"` → match `"HPUS -P"`.

## API Pattern

```
GET    /api/mk/[sheet]           → list all rows
POST   /api/mk/[sheet]           → create row
PUT    /api/mk/[sheet]?id=       → update row
DELETE /api/mk/[sheet]?id=       → delete row

[sheet] = price-list-type | product-type | type-definition | 
          color | process-fee | cif-rate | price-gram | store-markup |
          salesperson | store
```

## Tabs trong UI

Page `mk/page.tsx` có nhiều tabs, mỗi tab = 1 bảng. Inline edit.
