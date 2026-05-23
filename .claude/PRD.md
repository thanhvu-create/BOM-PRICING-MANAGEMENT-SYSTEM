# PRD — Product Requirements Document

## Mục tiêu sản phẩm

Hệ thống quản lý bán hàng trang sức cho công ty GSNB. Migrate từ Google Apps Script (GAS) + Google Sheets sang Next.js + Supabase PostgreSQL. Logic nghiệp vụ phải **100% giống GAS gốc**.

## Người dùng & Roles

| Role | Mô tả | Store |
|---|---|---|
| **Admin** | Toàn quyền hệ thống | Tất cả |
| **Manager** | Quản lý, xem cost, audit log | Tất cả |
| **Sales Supervisor** | Xem review (không thấy cost/sell price) | Theo store |
| **Sales** | Xem review, không thấy cost/sell | Theo store |
| **Order** | Tính giá, review, master data | Theo store |

## Stores

| Store | Price List Types |
|---|---|
| VN | `B1)HPVN -P`, `B2)AGVN-P` |
| US | `1)HPUS -P`, `2)HPUS FB -P`, `5)HPB -P`, `5.1) HPB-P (AHA)` |
| ADM | `3)ADM1 -P`, `4)ADM2 -P`, `ADM-MH` |

## Modules

### 1. Tính Giá (BOM Pricing) — `/dashboard/tinh-gia`
Tính giá BOM: nhập vàng + đá + giờ công → tính cost → tính sell price.

**2 trường hợp pricing:**
- **CASE A** (chỉ vàng): `sellPrice = goldCost × markup_factor + additional_price × weight` (từ `mk_price_gram`)
- **CASE B** (có đá): `costTotal = (goldCost + stoneCost + laborCost) × (1 + cifRate)` → `sellPrice = costTotal × storeMarkup` (từ `mk_store_markup`)

**Labor cost** (chỉ khi CASE B):
`laborCost = stoneQty × feePerStone + laborHours × feePerHour`

### 2. Review (Danh sách BOM) — `/dashboard/review`
Xem danh sách BOM đã tính. Filter, search, xem chi tiết, xuất báo giá PDF, chiết khấu.

### 3. Dashboard — `/dashboard`
KPI: tổng BOM, hôm nay, tháng này. Chart theo store/product type/salesperson (chỉ Admin/Manager).

### 4. Giá Vàng — `/dashboard/gold`
Quản lý giá vàng theo ngày. Fetch tự động từ Amark API (cron job hàng ngày). Admin/Manager.

### 5. MK (Bảng Giá) — `/dashboard/mk`
Quản lý bảng giá: CIF rate, price per gram, store markup, process fee, price list types. Admin/Manager.

### 6. Master Data — `/dashboard/master`
Quản lý danh mục đá (dm_size → sync stone_material). Xem/edit stone grades. Admin/Manager/Order.

### 7. Users — `/dashboard/users`
Quản lý tài khoản: tạo/edit/delete user, gán role + store. Admin only.

### 8. Audit Log — `/dashboard/audit`
Log mọi action (CREATE/UPDATE/DELETE/DISCOUNT) với diff before/after. Admin/Manager.

## BOM ID Format

`YYMMDD-N-MODEL` — ví dụ: `250523-1-RING18K`
- Generated server-side bởi PostgreSQL function `generate_bom_id(date, model)`
- N = số thứ tự trong ngày (1-based)
- MODEL = uppercase, no spaces

## Pricing Logic (từ GAS gốc)

```
Gold cost/gr = (amark_price_oz / 31.103) × (karat/24) × loss_factor
Stone cost   = gia_ban (từ lookup stone_material)
Labor cost   = qty × fee_per_stone + hours × fee_per_hour  [chỉ CASE B]
CIF rate     = từ mk_cif_rate theo price_list_type          [chỉ CASE B]
Cost total   = (gold + stone + labor) × (1 + cif_rate)     [CASE B]
Sell price   = cost_total × store_markup                    [CASE B]
Sell price   = gold_cost × markup_factor                    [CASE A]
```

## Business Rules quan trọng

- **Chiết khấu**: chỉ Admin/Manager. Có discount cap theo role (từ `api/config/discount-caps`)
- **Xem cost**: chỉ Admin/Manager thấy cost_gold, cost_stones, cost_labor, cost_total
- **Xem sell price**: Admin/Manager/Order thấy. Sales/Supervisor không thấy sell price
- **Edit BOM**: Sales/Supervisor không thể edit. Order/Manager/Admin có thể
- **Delete BOM**: chỉ Admin
- **Gold price auto-fetch**: cron job hàng ngày lấy từ Amark, lưu vào `gold_material`
- **Stone lookup**: mm type → lookup theo mm_size range; ct type → lookup theo ctw1pc range
