# Module: Audit Log

**Page**: `app/dashboard/audit/page.tsx`
**Lib**: `lib/audit.ts`
**APIs**: `app/api/audit/`

## logAction() — cách dùng

```typescript
import { logAction } from '@/lib/audit'

await logAction({
  actor:    profile.username,   // người thực hiện
  role:     profile.role,
  action:   'CREATE',           // CREATE | UPDATE | DELETE | DISCOUNT
  entity:   'bom',              // bom | gold | user | stone | mk | config
  entityId: bomId,              // optional
  summary:  `Tạo BOM ${bomId}`,
  diff: {                       // optional
    before: { sell_price: 100 },
    after:  { sell_price: 90, discount_pct: 0.1 }
  }
})
```

**Fire-and-forget**: không await blocking, không throw. Lỗi chỉ `console.error`.

## Khi nào phải log

| Action | Entity | Khi nào |
|---|---|---|
| CREATE | bom | Sau INSERT BOM thành công |
| UPDATE | bom | Sau PUT BOM thành công |
| DELETE | bom | Sau DELETE BOM |
| DISCOUNT | bom | Sau áp chiết khấu |
| CREATE/UPDATE/DELETE | gold | Sau thay đổi gold_material |
| CREATE/UPDATE/DELETE | user | Sau thay đổi users |
| CREATE/UPDATE/DELETE | stone | Sau thay đổi stone_material/dm_size |
| CREATE/UPDATE/DELETE | mk | Sau thay đổi MK tables |
| UPDATE | config | Sau thay đổi sys_config |

## Audit Page UI

2 tabs:
1. **Log** — bảng list với filter theo: action, entity, actor, date range
2. **Stats** — charts: by day (bar), by entity (pie), by action (bar), top actors

## API Routes

```
GET /api/audit?page=&limit=&action=&entity=&actor=&from=&to=
→ Paginated audit_log list

GET /api/audit/stats
→ { total, last30, byDay[], byEntity[], byAction[], topActors[] }

DELETE /api/audit/cleanup?before=YYYY-MM-DD
→ DELETE WHERE created_at < before (Admin only)
```

## audit_log Schema

```sql
id          uuid PK
created_at  timestamptz
actor       text        -- username
role        text
action      text        -- CREATE|UPDATE|DELETE|DISCOUNT
entity      text        -- bom|gold|user|stone|mk|config
entity_id   text        -- bomId, userId, etc.
summary     text        -- human-readable description
diff        jsonb       -- { before: {}, after: {} }
```
