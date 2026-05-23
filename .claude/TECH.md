# TECH — Technical Architecture

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React, TypeScript |
| Styling | CSS Variables (globals.css), no Tailwind in components |
| Backend | Next.js API Routes (server-side) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Deployment | Vercel (auto-deploy từ `main` branch) |
| Charts | Recharts |
| Icons | Font Awesome 6 (CDN) |
| i18n | Custom `I18nContext` (VI/EN toggle) |

## Folder Structure

```
BOM-web/
├── app/
│   ├── api/                    ← API routes (server-side)
│   │   ├── auth/login/         ← Username→email lookup
│   │   ├── bom/                ← CRUD BOM, calculate, discount
│   │   ├── gold/               ← Gold price management
│   │   ├── master/             ← Stone master, dropdowns
│   │   ├── mk/                 ← MK pricing tables
│   │   ├── users/              ← User management
│   │   ├── audit/              ← Audit log + stats
│   │   ├── config/             ← sys_config (VND rate, discount caps)
│   │   ├── dashboard/          ← Dashboard KPI stats
│   │   └── images/proxy/       ← Drive image proxy (fallback)
│   ├── dashboard/              ← Protected pages
│   │   ├── layout.tsx          ← Auth guard + SessionGuard
│   │   ├── page.tsx            ← Dashboard home
│   │   ├── tinh-gia/           ← BOM pricing form
│   │   ├── review/             ← BOM list + detail + quotation
│   │   ├── gold/               ← Gold price management
│   │   ├── mk/                 ← MK pricing tables
│   │   ├── master/             ← Stone master data
│   │   ├── users/              ← User management
│   │   └── audit/              ← Audit log viewer
│   ├── login/page.tsx          ← Login page
│   ├── globals.css             ← CSS variables + base styles
│   └── layout.tsx              ← Root layout (fonts, providers)
├── components/shared/
│   ├── DashboardShell.tsx      ← Sidebar nav + header wrapper
│   ├── SessionGuard.tsx        ← Client-side session expiry check
│   ├── UserContext.tsx         ← Current user (role, store, username)
│   ├── I18nContext.tsx         ← VI/EN language toggle
│   ├── ToastContext.tsx        ← Toast notifications
│   ├── DriveAuthButton.tsx     ← Google Drive OAuth connect button
│   └── DriveImageInput.tsx     ← Drive image URL input with preview
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← createClient() — browser
│   │   └── server.ts           ← createClient(), createServiceClient(), getUserProfile()
│   ├── driveToken.ts           ← Google Drive OAuth token management
│   ├── audit.ts                ← logAction() helper
│   ├── i18n.ts                 ← Translation strings
│   └── pricing/calculate.ts   ← calculateBOMCost() — server-side pricing engine
├── types/
│   ├── index.ts                ← Domain types (BOM, Role, Store, etc.)
│   └── database.ts             ← Supabase generated types
└── database/
    ├── schema.sql              ← Full DB schema
    └── seed-admin.sql          ← Admin seed
```

## Supabase Client Patterns

```typescript
// Server-side API route — luôn dùng cả hai:
const supabase = await createClient()           // verify user session
const db = createServiceClient()               // bypass RLS, dùng cho queries

// Client-side component:
const supabase = createClient()               // browser client

// getUserProfile — resolve username từ user.id hoặc email:
const profile = await getUserProfile(user.id, user.email)
// profile = { username, role, store }
```

## Auth Pattern (mọi API route)

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const profile = await getUserProfile(user.id, user.email)
if (!profile?.role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

const { role, store, username } = profile
```

## Session Management

- Supabase Auth via `@supabase/ssr` (cookies SSR + localStorage browser)
- **SessionGuard** client component kiểm tra `localStorage.bom_session_expiry`
  - `'permanent'` → login "Remember me" — ở lại đến khi logout
  - timestamp number → login thường — kick sau 8h
  - missing → user cũ, không kick
- **Logout**: xóa `bom_session_expiry` + `supabase.signOut()`

## CSS Variables (dùng trong inline styles)

```css
--bg-base, --bg-surface, --bg-hover, --bg-muted
--text-primary, --text-secondary, --text-muted
--border-base, --border-light, --border-strong
--color-primary, --color-success, --color-warning, --color-danger
--font-body, --font-heading, --font-mono
--text-xs, --text-sm, --text-base, --text-lg, --text-xl, --text-2xl, --text-3xl
```

## Google Drive Images

3 methods (theo thứ tự ưu tiên):
1. **Thumbnail URL** — `https://drive.google.com/thumbnail?id={fileId}&sz=w{size}` — instant, chỉ public files
2. **OAuth Blob** — `fetchDriveBlob(fileId)` → blob URL — private files, chỉ dùng trong tab hiện tại
3. **Data URI** — `fetchDriveDataUri(fileId)` → `data:image/...;base64,...` — dùng trong print popup

**DriveImage component** (trong `review/page.tsx`) — hybrid: thử thumbnail → onError → OAuth blob

**Module-level caches:**
- `blobCache: Map<string, string>` — blob URLs, tránh fetch lại
- `dataUriCache: Map<string, string>` — data URIs cho print

## Pricing Engine

`lib/pricing/calculate.ts` — `calculateBOMCost(payload)`:
1. Fetch gold price từ `gold_material` (lấy ngày gần nhất ≤ date BOM)
2. Tính gold cost per gram theo karat + loss_factor
3. Stones: dùng `gia_ban` đã có từ client (đã lookup trước)
4. Labor: fetch `mk_process_fee` — match "nhận hột" và "lắp ráp"
5. CIF: fetch `mk_cif_rate` theo `price_list_type`
6. Sell price: CASE A (mk_price_gram) hoặc CASE B (mk_store_markup)

## Audit Log

Mọi mutation phải gọi `logAction(payload)` từ `lib/audit.ts`:
```typescript
await logAction({
  actor: username, role,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DISCOUNT',
  entity: 'bom' | 'gold' | 'user' | 'stone' | 'mk' | 'config',
  entityId: bomId,
  summary: 'Tạo BOM 250523-1-RING18K',
  diff: { before: {...}, after: {...} }
})
```
Fire-and-forget — không throw, không block main request.

## i18n

```typescript
const { t } = useLang()  // hook trong client components
t('keyName')             // tra cứu trong lib/i18n.ts
```
Toggle VI/EN trong DashboardShell header. Strings định nghĩa trong `lib/i18n.ts`.
