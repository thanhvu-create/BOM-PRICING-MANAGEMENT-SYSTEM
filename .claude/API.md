# API — Routes Reference

## Auth
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Lookup email từ username (step 1 login) | Public |

## BOM
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/bom` | Danh sách BOM (filter theo role/store) | All |
| POST | `/api/bom` | Tạo BOM mới | All |
| GET | `/api/bom/[bomId]` | BOM chi tiết + gold + stone | All |
| PUT | `/api/bom/[bomId]` | Edit BOM | Manager/Admin/Order |
| POST | `/api/bom/calculate` | Tính giá (không lưu) | All |
| GET | `/api/bom/dropdowns` | Dropdowns cho form tính giá | All |
| GET | `/api/bom/gold-price` | Giá vàng hiện tại | All |
| GET | `/api/bom/stone-types` | Stone group codes | All |
| POST | `/api/bom/[bomId]/discount` | Áp chiết khấu | Admin/Manager |
| POST | `/api/bom/discount` | Áp chiết khấu (alt route) | Admin/Manager |
| GET | `/api/bom/quotation/[id]` | Data xuất báo giá | All |

## Gold
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/gold` | Danh sách gold_material | Admin/Manager |
| POST | `/api/gold` | Thêm/update gold price row | Admin/Manager |
| GET | `/api/gold/fetch-amark` | Fetch giá từ Amark API | Admin/Manager |
| GET | `/api/gold/karat` | Giá theo karat cho ngày cụ thể | All |
| GET/POST | `/api/gold/trigger` | Trigger auto-fetch config | Admin |
| GET | `/api/gold/trigger/status` | Trạng thái trigger | Admin |
| POST | `/api/gold/trigger/run` | Chạy trigger thủ công | Admin |

## Master Data
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/master/lookup` | Lookup stone grade (RPC) | All |
| GET | `/api/master/dropdowns` | Dropdowns cho master | All |
| GET/POST/PUT/DELETE | `/api/master/stone` | CRUD stone_material | Admin |
| GET/POST/PUT/DELETE | `/api/master/dm/[sheet]` | CRUD dm_* tables | Admin |
| POST | `/api/master/sync` | Sync dm_size → stone_material | Admin |

## MK Pricing
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/mk/[sheet]` | CRUD mọi MK table | Admin/Manager |

## Config
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/config?key=VND_RATE` | Lấy config value | All |
| POST | `/api/config` | Cập nhật config | Admin/Manager |
| GET | `/api/config/discount-caps` | Discount caps theo role | All |

## Dashboard
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/dashboard` | KPI stats + charts | All |

## Users
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/users` | Danh sách users | Admin |
| POST | `/api/users` | Tạo user | Admin |
| PUT | `/api/users` | Edit user | Admin |
| DELETE | `/api/users` | Delete user | Admin |

## Audit
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/audit` | Audit log list (paginated) | Admin/Manager |
| GET | `/api/audit/stats` | Audit statistics | Admin/Manager |
| DELETE | `/api/audit/cleanup` | Xóa log cũ | Admin |

## Cron
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/cron/gold-price` | Auto-fetch gold (Vercel cron) | Cron secret |

## Images
| Method | Route | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/images/proxy?fileId=` | Proxy Drive image → base64 | All |

## Response Format chuẩn

```typescript
// Success:
{ data: ... }           // hoặc { success: true, ... }

// Error:
{ error: 'message' }    // status 400/401/403/500
```

## Error Codes

| Code | Nghĩa |
|---|---|
| 401 | Chưa đăng nhập (`getUser()` = null) |
| 403 | Không có role/quyền |
| 400 | Request body sai |
| 500 | Lỗi server (log + throw) |
