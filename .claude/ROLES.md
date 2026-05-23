# ROLES — Permissions Matrix

## Navigation Access

| Page | Admin | Manager | Sales Supervisor | Sales | Order |
|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tính Giá | ✅ | ✅ | ❌ | ❌ | ✅ |
| Review | ✅ | ✅ | ✅ | ✅ | ✅ |
| Giá Vàng | ✅ | ✅ | ❌ | ❌ | ❌ |
| MK Tables | ✅ | ✅ | ❌ | ❌ | ❌ |
| Master Data | ✅ | ✅ | ❌ | ❌ | ✅ |
| Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit Log | ✅ | ✅ | ❌ | ❌ | ❌ |

## BOM Actions

| Action | Admin | Manager | Sales Supervisor | Sales | Order |
|---|---|---|---|---|---|
| Tạo BOM | ✅ | ✅ | ❌ | ❌ | ✅ |
| Xem danh sách | ✅ all | ✅ all | ✅ store | ✅ store | ✅ store |
| Xem cost (gold/stone/labor/total) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Xem sell price | ✅ | ✅ | ❌ | ❌ | ✅ |
| Edit BOM | ✅ | ✅ | ❌ | ❌ | ✅ |
| Chiết khấu | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete BOM | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem báo giá | ✅ | ✅ | ✅ | ✅ | ✅ |

## Data Visibility — Review Page

```
Admin/Manager:
  - Thấy tất cả BOM (mọi store)
  - Thấy cột: cost_total, sell_price, discount_pct, discount_price
  - Thấy button: Chiết Khấu, Edit, Copy Template

Sales Supervisor/Sales:
  - Chỉ thấy BOM của store mình (filter theo price_list_type)
  - KHÔNG thấy: cost_total, sell_price, discount
  - KHÔNG thấy: button Chiết Khấu, button Edit

Order:
  - Thấy BOM của store mình
  - Thấy: sell_price, discount_pct, discount_price
  - Thấy button: Edit, Copy Template
  - KHÔNG thấy: cost_total
```

## Dashboard KPIs

```
Admin/Manager:
  - Tất cả KPI: totalBOMs, todayBOMs, monthBOMs
  - totalValue, avgSellPrice, discountedCount
  - Charts: byStore, byProductType, bySalesPerson
  - Recent BOMs table

Sales/Supervisor/Order:
  - Chỉ: totalBOMs, todayBOMs, monthBOMs
  - Không thấy value/chart
```

## Store Filtering

Non-Admin/Manager với store được gán:
```typescript
const STORE_PRICE_MAP = {
  VN:  ['B1)HPVN -P', 'B2)AGVN-P'],
  US:  ['1)HPUS -P', '2)HPUS FB -P', '5)HPB -P', '5.1) HPB-P (AHA)'],
  ADM: ['3)ADM1 -P', '4)ADM2 -P', 'ADM-MH'],
}
// query.in('price_list_type', STORE_PRICE_MAP[store])
```

## Discount Caps (từ `/api/config/discount-caps`)

Mỗi role có cap % tối đa có thể chiết khấu. Lưu trong `sys_config` hoặc hardcode.
Chỉ Admin/Manager mới thấy/dùng discount.

## Implementation Pattern

```typescript
// Trong API route:
const { role, store } = profile
const isAdminOrManager = ['Admin', 'Manager'].includes(role)
const canDiscount = isAdminOrManager

// Trong UI (client):
const { user } = useUser()  // { username, role, store }
const canEdit = !['Sales', 'Sales Supervisor'].includes(user.role)
const showCost = ['Admin', 'Manager'].includes(user.role)
const showSell = ['Admin', 'Manager', 'Order'].includes(user.role)
```
