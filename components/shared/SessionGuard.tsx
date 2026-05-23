'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SessionGuard() {
  const router = useRouter()

  useEffect(() => {
    const val = localStorage.getItem('bom_session_expiry')
    // No record = user logged in before this feature was added; let them stay until next login
    if (!val) return
    if (val !== 'permanent' && Number(val) < Date.now()) {
      localStorage.removeItem('bom_session_expiry')
      createClient().auth.signOut().then(() => router.replace('/login'))
    }
  }, [router])

  return null
}
