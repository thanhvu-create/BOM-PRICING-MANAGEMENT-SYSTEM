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

// Lookup user profile — try by UUID first, fallback to email match
export async function getUserProfile(userId: string, userEmail: string | undefined) {
  const db = createServiceClient()

  const { data: byId } = await db
    .from('users')
    .select('email, role, store, id')
    .eq('id', userId)
    .single()

  if (byId) return byId as { email: string; role: string; store: string }

  if (!userEmail) return null

  const { data: byEmail } = await db
    .from('users')
    .select('email, role, store, id')
    .eq('email', userEmail)
    .single()

  return (byEmail ?? null) as { email: string; role: string; store: string } | null
}
