import { redirect } from 'next/navigation'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import DashboardShell from '@/components/shared/DashboardShell'
import SessionGuard from '@/components/shared/SessionGuard'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id, user.email)
  if (!profile) redirect('/login')

  return (
    <DashboardShell user={profile}>
      <SessionGuard />
      {children}
    </DashboardShell>
  )
}
