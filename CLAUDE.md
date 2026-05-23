# CLAUDE.md — BOM Pricing System

> Đây là file hướng dẫn chính. Claude đọc file này TRƯỚC KHI làm bất kỳ task nào.

## Tổng quan

Web app quản lý bán hàng trang sức (Sales Management) — migrate từ Google Apps Script + Google Sheets sang Next.js + Supabase. Mục tiêu: **100% giống logic gốc GAS**.

## Đọc thêm context theo task

| Task liên quan đến | Đọc file |
|---|---|
| Kiến trúc, stack, patterns | `.claude/TECH.md` |
| Yêu cầu sản phẩm, roles, business rules | `.claude/PRD.md` |
| Database tables, schema, functions | `.claude/DB.md` |
| Tất cả API routes | `.claude/API.md` |
| Phân quyền theo role | `.claude/ROLES.md` |
| Module Tính Giá (BOM) | `.claude/modules/bom.md` |
| Module Giá Vàng | `.claude/modules/gold.md` |
| Module Hột Đá | `.claude/modules/stone.md` |
| Module Review (danh sách BOM) | `.claude/modules/review.md` |
| Module MK (bảng giá) | `.claude/modules/mk.md` |
| Module Master Data | `.claude/modules/master.md` |
| Auth, Users, Session | `.claude/modules/auth.md` |
| Audit Log | `.claude/modules/audit.md` |

## Quy tắc bắt buộc

1. **Không tự thêm feature** không được yêu cầu
2. **Không thêm comment** trừ khi WHY thực sự không rõ ràng
3. **Không tạo file mới** nếu có thể edit file hiện tại
4. **Luôn dùng `createServiceClient()`** trong API routes (bypass RLS)
5. **Luôn verify session** trước khi xử lý: `supabase.auth.getUser()` → 401 nếu không có
6. **Timezone**: Asia/Ho_Chi_Minh cho mọi date/time display
7. **Sau implement**: commit + push lên `main` (Vercel tự deploy)
8. **Review trước implement** khi task phức tạp — đề xuất design, chờ user confirm

## Môi trường

- **Dev**: `npm run dev` → http://localhost:3000 (hoặc 3001 nếu 3000 bị chiếm)
- **Prod**: Vercel auto-deploy từ `main` branch
- **DB**: Supabase (xem `.env.local` cho credentials)
- **Timezone hiện tại**: Asia/Ho_Chi_Minh (GMT+7)
