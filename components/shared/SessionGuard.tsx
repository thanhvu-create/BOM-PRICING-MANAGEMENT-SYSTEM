'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CHECK_INTERVAL = 60_000

export default function SessionGuard() {
  const router = useRouter()

  const kick = useCallback(() => {
    localStorage.removeItem('bom_session_expiry')
    createClient().auth.signOut().then(() => router.replace('/login'))
  }, [router])

  const checkExpiry = useCallback(() => {
    const val = localStorage.getItem('bom_session_expiry')
    if (!val) { kick(); return }
    if (val !== 'permanent' && Number(val) < Date.now()) kick()
  }, [kick])

  useEffect(() => {
    checkExpiry()
    const id = setInterval(checkExpiry, CHECK_INTERVAL)
    return () => clearInterval(id)
  }, [checkExpiry])

  return null
}
