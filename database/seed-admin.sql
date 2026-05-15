-- ============================================================
-- Tạo Admin user đầu tiên
-- Chạy trong Supabase SQL Editor SAU KHI đã chạy schema.sql
--
-- Lưu ý: Supabase Auth dùng email format: username@bom.internal
-- Password: đặt trong dashboard Authentication > Users > Invite user
--           HOẶC dùng script dưới (cần service role)
-- ============================================================

-- Bước 1: Tạo user trong auth.users (chạy từ SQL Editor với service role)
-- Thay 'your-password-here' bằng password thực
SELECT auth.create_user(
  '{"email": "admin@bom.internal", "password": "Admin@2026!", "email_confirm": true}'::jsonb
);

-- Bước 2: Thêm vào bảng users với role Admin
-- (chạy sau khi bước 1 thành công, lấy UUID từ auth.users)
INSERT INTO public.users (id, username, role, store)
SELECT id, 'admin', 'Admin', ''
FROM auth.users
WHERE email = 'admin@bom.internal'
ON CONFLICT (username) DO NOTHING;
