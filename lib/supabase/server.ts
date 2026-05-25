import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Service role client — dùng trong API routes cần bypass RLS
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Lookup user profile — single query using OR to avoid 2 round-trips.
export async function getUserProfile(userId: string, userEmail: string | undefined) {
  const db = createServiceClient()
  const { data: rows } = await db
    .from('users')
    .select('username, role, store, id')
    .or(userEmail ? `id.eq.${userId},username.eq.${userEmail}` : `id.eq.${userId}`)

  if (!rows || rows.length === 0) return null
  // Prefer exact id match; fall back to username match
  const byId = rows.find(r => r.id === userId)
  const result = byId ?? rows[0]
  return result as { username: string; role: string; store: string } | null
}
