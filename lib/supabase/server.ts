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

// Lookup user profile by Supabase Auth user.id, with fallback to email-derived username.
// Needed because some accounts may have a mismatch between public.users.id and auth.users.id.
export async function getUserProfile(userId: string, userEmail: string | undefined) {
  const db = createServiceClient()
  let { data } = await db.from('users').select('username, role, store').eq('id', userId).single()
  if (!data && userEmail) {
    const username = userEmail.replace(/@bom\.internal$/i, '')
    const { data: fallback } = await db
      .from('users').select('username, role, store').eq('username', username).single()
    data = fallback
  }
  return data as { username: string; role: string; store: string } | null
}
