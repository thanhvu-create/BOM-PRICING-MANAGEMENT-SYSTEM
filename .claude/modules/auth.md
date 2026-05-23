# Module: Auth & Users

## Login Flow (Username/Password)

```
1. User nhập username + password
2. POST /api/auth/login { username }
   → SELECT id FROM users WHERE username = ?
   → auth.admin.getUserById(id) → lấy email thực
   → trả { email }
3. Client: supabase.auth.signInWithPassword({ email, password })
   → Supabase verify password (hash trong auth.users)
   → Tạo session (access_token + refresh_token trong localStorage/cookies)
4. localStorage.setItem('bom_session_expiry',
     rememberMe ? 'permanent' : String(Date.now() + 8h))
5. router.push('/dashboard')
```

**Tại sao 2 bước?** Hệ thống dùng username (không phải email) để login, nhưng Supabase Auth cần email. API route làm bridge tra cứu email.

## Session Guard

`components/shared/SessionGuard.tsx` — client component, render trong `DashboardLayout`:

```typescript
useEffect(() => {
  const val = localStorage.getItem('bom_session_expiry')
  if (!val) return  // user cũ, không kick
  if (val !== 'permanent' && Number(val) < Date.now()) {
    localStorage.removeItem('bom_session_expiry')
    supabase.signOut() → router.replace('/login')
  }
})
```

| Login type | bom_session_expiry | Hành vi |
|---|---|---|
| Không check "Remember me" | `Date.now() + 8h` | Kick sau 8h |
| Check "Remember me" | `'permanent'` | Ở lại đến khi logout |
| User cũ (không có key) | missing | Không kick |

## Dashboard Layout Auth

`app/dashboard/layout.tsx` — **server component**:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
// Render DashboardShell + SessionGuard
```

## Logout

`DashboardShell.handleLogout()`:
```typescript
localStorage.removeItem('bom_session_expiry')
await supabase.auth.signOut()
router.push('/login')
```

## User Management (Admin only)

**Page**: `app/dashboard/users/page.tsx`
**API**: `app/api/users`

### Tạo User

```
1. Admin điền: username, password, role, store
2. POST /api/users
   → supabase.auth.admin.createUser({ email: username+'@bom.internal', password })
   → INSERT INTO users (id, username, role, store)
   → logAction('CREATE', 'user', ...)
```

**Email format**: `{username}@bom.internal` — dummy email để Supabase Auth hoạt động.

### Edit User

```
PUT /api/users { id, role, store }  — không thay đổi username/password qua đây
```

### Delete User

```
DELETE /api/users?id=
→ DELETE FROM users WHERE id = ?
→ supabase.auth.admin.deleteUser(id)
→ logAction('DELETE', 'user', ...)
```

### Reset Password

```
PUT /api/users { id, newPassword }
→ supabase.auth.admin.updateUserById(id, { password: newPassword })
```

## getUserProfile Helper

`lib/supabase/server.ts`:
```typescript
async function getUserProfile(userId, userEmail) {
  // Lookup 1: by id
  let { data } = await db.from('users').select('username,role,store').eq('id', userId).single()
  // Fallback: by username derived from email (email = username@bom.internal)
  if (!data && userEmail) {
    const username = userEmail.replace(/@bom\.internal$/i, '')
    data = await db.from('users').select(...).eq('username', username).single()
  }
  return data
}
```

Fallback cần thiết vì một số account có id mismatch giữa auth.users và public.users.

## UserContext

`components/shared/UserContext.tsx` — client-side:
```typescript
const { user } = useUser()
// user = { username: string, role: string, store: string }
```
Được inject từ `DashboardShell` props → `UserProvider`.
