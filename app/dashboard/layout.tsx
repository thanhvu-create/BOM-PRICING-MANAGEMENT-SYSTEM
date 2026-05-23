import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/shared/DashboardShell'
import SessionGuard from '@/components/shared/SessionGuard'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Dùng service client để bypass RLS khi fetch profile
  const db = createServiceClient()
  const { data: profile } = await db
    .from('users')
    .select('username, role, store')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell user={profile ?? { username: user.email ?? '', role: 'Sales', store: '' }}>
      <SessionGuard />
      {children}
    </DashboardShell>
  )
}
