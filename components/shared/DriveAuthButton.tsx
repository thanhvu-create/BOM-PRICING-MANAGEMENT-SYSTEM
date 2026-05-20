'use client'

import { useState, useEffect } from 'react'
import { isAuthenticated, getTokenWithConsent, clearToken, onTokenChange } from '@/lib/driveToken'

/**
 * Compact Drive auth button for the topbar.
 * Renders null if NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.
 *
 * Connected state:  [G ● Drive]  (green dot)
 * Disconnected:     [G ○ Drive]  (grey dot)
 *
 * Click when disconnected → OAuth popup consent
 * Click when connected    → clear token (disconnect)
 */
export default function DriveAuthButton() {
  const [connected, setConnected] = useState(false)
  const [hasClientId, setHasClientId] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    setHasClientId(!!id && !id.includes('your-google') && !id.includes('placeholder'))
    setConnected(isAuthenticated())
    return onTokenChange(() => setConnected(isAuthenticated()))
  }, [])

  if (!hasClientId) return null

  async function handleClick() {
    if (connected) {
      clearToken()
      return
    }
    setLoading(true)
    try {
      await getTokenWithConsent()
    } finally {
      setLoading(false)
    }
  }

  const dotColor = connected ? 'var(--color-success)' : 'var(--text-muted)'
  const textColor = connected ? 'var(--color-success)' : 'var(--text-muted)'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={connected
        ? 'Google Drive connected — click to disconnect'
        : 'Connect Google Drive to load private images'}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px',
        border: '1px solid var(--border-base)',
        borderRadius: 0,
        background: 'transparent',
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
        fontWeight: 500, letterSpacing: '0.06em',
        color: textColor,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'color 0.15s, border-color 0.15s',
        whiteSpace: 'nowrap',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {/* "G" brand letter */}
      <span style={{
        fontWeight: 700, fontSize: 11,
        fontFamily: 'Arial, sans-serif',
        color: loading ? 'var(--text-muted)' : (connected ? 'var(--color-success)' : 'var(--text-muted)'),
      }}>
        G
      </span>
      {/* Status dot */}
      {loading
        ? <i className="fa-solid fa-circle-notch" style={{ fontSize: 7, animation: 'driveSpn 0.9s linear infinite' }} />
        : (
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
            transition: 'background 0.2s',
          }} />
        )
      }
      <span>Drive</span>
      <style>{`
        @keyframes driveSpn { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </button>
  )
}
