# Setup Guide — BOM Pricing Next.js + Supabase + Vercel

## Bước 1: Supabase

1. Tạo project tại https://supabase.com
2. Vào **SQL Editor** → chạy toàn bộ file `database/schema.sql`
3. Lấy credentials từ **Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Bước 2: Supabase Auth Setup

Vào **Authentication → Settings**:
- Disable "Email confirmations" (internal app)
- Enable "Custom JWT Claims" hoặc dùng `app_metadata` cho role/store

Sau khi tạo user qua Supabase Auth, cần thêm vào bảng `users` với role/store tương ứng.

## Bước 3: Local Development

```bash
cd /c/Users/pit008/Downloads/BOM-web

# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local
# → Điền SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY

# Run dev server
npm run dev
# → http://localhost:3000
```

## Bước 4: Deploy Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables trên Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# AMARK_FETCH_SECRET
```

## Bước 5: Vercel Cron (Gold Price)

`vercel.json` đã cấu hình cron chạy 8h sáng VN (1h UTC):
```json
{ "path": "/api/cron/gold-price", "schedule": "0 1 * * *" }
```
→ Cần set `AMARK_FETCH_SECRET` trên Vercel và trong `.env.local`.

## Bước 6: Data Migration từ Google Sheets

Thứ tự import dữ liệu vào Supabase:

1. `dm_category`, `dm_types`, `dm_shape`, `dm_color`, `dm_quality`, `definition`
2. `dm_size` (từ sheet `1.DM_Size`)
3. Chạy `SELECT sync_dm_size_to_stone_material();` trong SQL Editor
4. `gold_material` (từ sheet `Gold_Material`)
5. `mk_*` tables (từ các MK sheets)
6. `bom` + `bom_gold` + `bom_stone` (từ `BOM_DB`)
7. `users` (tạo lại qua Supabase Auth + insert vào bảng users)

## Cấu trúc thư mục

```
BOM-web/
├── app/
│   ├── (auth)/login/          ← Login page
│   ├── (dashboard)/           ← Layout + tất cả views
│   │   ├── tinh-gia/          ← 4-step BOM form
│   │   ├── review/            ← BOM history
│   │   ├── users/             ← User management
│   │   ├── gold/              ← Gold prices
│   │   ├── master/            ← Stone master data
│   │   └── mk/                ← MK pricing tables
│   └── api/
│       ├── auth/              ← login, session
│       ├── bom/               ← calculate, save, history, detail, discount, dashboard
│       ├── gold/              ← CRUD + fetch amark
│       ├── master/            ← stone CRUD, lookup, DM lists
│       ├── mk/                ← generic MK CRUD
│       ├── users/             ← user CRUD
│       ├── config/            ← VND rate, sys_config
│       └── cron/gold-price/   ← Vercel Cron daily gold fetch
├── components/
│   ├── ui/                    ← Button, Input, Modal, Toast, Badge...
│   ├── bom/                   ← StepHeader, GoldTable, StoneTable, Summary
│   ├── review/                ← HistoryTable, DetailModal, DiscountModal
│   ├── gold/                  ← GoldTable, KaratColumns, TriggerConfig
│   ├── master/                ← StoneMasterTable, DMCategoryModal
│   ├── mk/                    ← MKTabs, MKTable
│   └── shared/                ← Topbar, Nav, Avatar, ConfirmModal
├── lib/
│   ├── supabase/client.ts     ← Browser client
│   ├── supabase/server.ts     ← Server client + service role
│   └── pricing/calculate.ts  ← calculateBOMCost logic
├── types/index.ts             ← All TypeScript types
├── database/schema.sql        ← Supabase SQL schema
├── middleware.ts              ← Auth guard
├── vercel.json                ← Cron config
└── .env.local.example
```
