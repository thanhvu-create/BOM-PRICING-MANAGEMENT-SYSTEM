'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/shared/ToastContext'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (authError) {
        const msg = 'Invalid email or password.'
        setError(msg)
        toast(msg, 'danger')
        setLoading(false)
        return
      }

      localStorage.setItem(
        'bom_session_expiry',
        rememberMe ? 'permanent' : String(Date.now() + 8 * 3600 * 1000)
      )
      const displayName = email.split('@')[0]
      toast(`Welcome, ${displayName}!`, 'success')
      router.push('/dashboard')
      router.refresh()
    } catch {
      const msg = 'Connection error. Please try again.'
      setError(msg)
      toast(msg, 'danger')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-base)',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '440px',
      }}>
        {/* Eyebrow */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '0.5rem',
        }}>
          BOM Pricing System
        </p>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 400,
          color: 'var(--text-primary)',
          marginBottom: '2.5rem',
          lineHeight: 1.1,
        }}>
          Sign in
        </h1>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              autoComplete="email"
              className="input-underline"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="input-underline"
            />
          </div>

          {/* Remember me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem', marginTop: '-0.75rem' }}>
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="remember-me" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              Keep me signed in
            </label>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              borderLeft: '2px solid var(--color-danger)',
              padding: '0.75rem 1rem',
              color: 'var(--color-danger)',
              fontSize: 'var(--text-sm)',
              background: 'var(--bg-muted)',
              marginBottom: '1.5rem',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          letterSpacing: '0.05em',
        }}>
          GSNB · BOM Pricing © 2026
        </p>
      </div>
    </div>
  )
}
