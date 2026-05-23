# Module: BOM Pricing (Tính Giá)

**Page**: `app/dashboard/tinh-gia/page.tsx` (1538 lines)
**APIs**: `app/api/bom/`

## Form Fields

### Header
| Field | Required | Ghi chú |
|---|---|---|
| Date | ✅ | Default: hôm nay (Asia/HCM) |
| Product Type | ✅ | Dropdown từ mk_product_type |
| SO/MO | ❌ | Text |
| Model | ✅ | Text |
| Price List Type | ✅ | Dropdown từ mk_price_list_type |
| SP Type | ✅ | Basic \| Fancy (từ mk_type_definition) |
| Labor Hours | ❌ | Luôn hiện, chỉ tính khi có đá |
| Note | ❌ | Text |
| img1/img2/img3 | ❌ | DriveImageInput component |
| Folder URL | ❌ | Text |
| Sales Person | ❌ | Dropdown từ salesperson |
| Store | ❌ | Dropdown: VN\|US\|ADM |
| Customer Name | ❌ | Text |

### Gold Rows (dynamic)
| Field | Ghi chú |
|---|---|
| Gold Type | 10K\|14K\|18K\|20K\|22K\|24K\|PT\|AG |
| Color | Yellow\|White\|Rose\|Platinum |
| Weight (gr) | Số thực |
| Price/gr | Auto-fill từ gold_material (readonly) |
| Cost | Auto-calc: weight × price_per_gr |

### Stone Rows (dynamic)
| Field | Ghi chú |
|---|---|
| Group Code | Dropdown từ stone_material.group_code |
| Input Type | mm\|ct (auto-detect từ stone lookup) |
| Size (mm) | Nhập nếu mm type |
| CTW/1pc | Nhập nếu ct type |
| Qty | Số nguyên |
| TL Hột | Auto-calc: qty × ctw1pc |
| Grade ID | Auto-fill sau lookup |
| Gia Bán | Auto-fill sau lookup |
| Selling Price | = qty × gia_bán |

## Stone Lookup Logic

```
User nhập: group_code + size (mm) hoặc ctw1pc (ct)
→ GET /api/master/lookup?groupCode=&mmSize=&ctw1pc=
→ Server: SELECT FROM stone_material WHERE group_code = ? AND (
    (type_input='mm' AND mmSize BETWEEN min_size AND max_size)
    OR (type_input='ct' AND ctw1pc BETWEEN min_size AND max_size)
  )
→ Trả: grade_id, input_type, selling_price, pricing_unit
→ Client: fill grade_id, gia_ban = selling_price
```

**Quan trọng**: mm type → lookup theo `mm_size`. ct type → lookup theo `ctw1pc`. KHÔNG dùng nhầm.

## Calculate Flow

```
User click Calculate:
→ POST /api/bom/calculate { header, golds, stones }
→ lib/pricing/calculate.ts:calculateBOMCost()
→ Trả: { golds[{pricePerGr,cost}], stones[{gradeId,giaBan}], costGold, costStones, costLabor, costSubtotal, costCif, costTotal, sellPrice }
→ UI hiển thị breakdown costs
```

## Save Flow

```
User click Save:
→ POST /api/bom
→ Server: generate_bom_id(date, model)
→ INSERT bom + bom_gold[] + bom_stone[]
→ logAction('CREATE', 'bom', ...)
→ Trả: { bom_id }
→ UI toast + optional redirect to review
```

## Edit Mode

URL: `/dashboard/tinh-gia?edit={bomId}`

```
Component load:
→ GET /api/bom/[bomId]
→ Populate form fields
→ User edit → PUT /api/bom/[bomId]
→ logAction('UPDATE', 'bom', ...)
```

## Template Mode

URL: `/dashboard/tinh-gia?template={bomId}`

```
→ Load BOM data
→ Pre-fill form (nhưng không set bomId)
→ Save tạo BOM mới (không overwrite bản gốc)
```

## Pricing Logic (chi tiết — đọc thêm .claude/PRD.md)

```typescript
// CASE A (không có đá):
costTotal = goldCost
sellPrice = goldCost × markup_factor + additional_price × totalWeight

// CASE B (có đá):
laborCost = qty_total × fee_per_stone + labor_hours × fee_per_hour
costSubtotal = goldCost + stoneCost + laborCost
costCif = costSubtotal × cifRate
costTotal = costSubtotal + costCif
sellPrice = costTotal × storeMarkup[priceListType]
```

## State Types (từ page.tsx)

```typescript
interface GoldRow  { id, goldType, color, weight, pricePerGr, cost }
interface StoneRow { id, groupCode, size, ctw1pc, qty, tlHot, gradeId, giaBan, inputType, sellingPrice, pricingUnit, notFound }
interface PricingData { costGold, costStones, costLabor, costSubtotal, costCif, costTotal, sellPrice }
```
