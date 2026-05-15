'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Bước 1: tra cứu email từ username
      const lookupRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      })

      if (!lookupRes.ok) {
        setError('Invalid username or password.')
        setLoading(false)
        return
      }

      const { email } = await lookupRes.json()

      // Bước 2: đăng nhập với email thực
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('Invalid username or password.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
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
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
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
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
            }}>
              Account
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              required
              autoFocus
              autoComplete="username"
              className="input-underline"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem',
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

          {/* Error */}
          {error && (
            <div style={{
              borderLeft: '2px solid var(--color-danger)',
              padding: '0.75rem 1rem',
              color: 'var(--color-danger)',
              fontSize: 'var(--text-sm)',
              background: '#FAF2F2',
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
