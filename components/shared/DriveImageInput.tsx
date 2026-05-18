'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  inputStyle?: React.CSSProperties
  labelStyle?: React.CSSProperties
}

function extractFileId(url: string): string | null {
  if (!url?.trim()) return null
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/open\?id=([a-zA-Z0-9_-]{10,})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

// Module-level token cache — survives component re-renders within session
let _driveToken: string | null = null
let _tokenExpiry = 0

function requestDriveToken(): Promise<string | null> {
  // Return cached token if still valid (5-min buffer)
  if (_driveToken && Date.now() < _tokenExpiry) {
    return Promise.resolve(_driveToken)
  }

  return new Promise((resolve) => {
    const g = (window as any).google
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!g?.accounts?.oauth2 || !clientId) {
      resolve(null)
      return
    }

    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (res: any) => {
        if (res.access_token) {
          _driveToken = res.access_token
          _tokenExpiry = Date.now() + ((res.expires_in ?? 3600) - 300) * 1000
          resolve(res.access_token)
        } else {
          resolve(null)
        }
      },
      error_callback: () => resolve(null),
    })
    // prompt: '' lets Google decide — silent if already consented, shows popup if first time
    client.requestAccessToken({ prompt: '' })
  })
}

async function fetchDriveBlob(fileId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

type Status = 'idle' | 'loading' | 'ok' | 'need-auth' | 'loading-auth' | 'error'

export default function DriveImageInput({ label, value, onChange, inputStyle, labelStyle }: Props) {
  const [fileId, setFileId] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const lastApplied = useRef('')
  const prevBlobUrl = useRef<string | null>(null)

  // Revoke blob URL on unmount or when replaced
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
    }
  }, [])

  function setBlobSrc(url: string | null) {
    if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current)
    prevBlobUrl.current = url
    setBlobUrl(url)
  }

  // Auto-preview when value set externally (edit-mode restore)
  useEffect(() => {
    const fid = extractFileId(value)
    if (fid && fid !== lastApplied.current) {
      lastApplied.current = fid
      setFileId(fid)
      setBlobSrc(null)
      setStatus('loading')
    }
    if (!value) {
      setFileId(null)
      setBlobSrc(null)
      setStatus('idle')
      lastApplied.current = ''
    }
  }, [value])

  function triggerPreview() {
    const fid = extractFileId(value)
    if (!fid) { if (value) setStatus('error'); return }
    lastApplied.current = fid
    setFileId(fid)
    setBlobSrc(null)
    setStatus('loading')
  }

  // When status becomes 'loading', try thumbnail first
  // (the hidden <img> tag handles this via onLoad/onError)

  async function connectAndLoad() {
    if (!fileId) return
    setStatus('loading-auth')
    const token = await requestDriveToken()
    if (!token) { setStatus('error'); return }
    const url = await fetchDriveBlob(fileId, token)
    if (url) {
      setBlobSrc(url)
      setStatus('ok')
    } else {
      setStatus('error')
    }
  }

  // Thumbnail URL — browser loads with Google session cookies
  // Works only if Google session cookies are not blocked by browser third-party policy
  const thumbSrc = fileId && status === 'loading'
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
    : null

  const displaySrc = blobUrl  // after OAuth fetch

  return (
    <div>
      <label style={labelStyle}>{label}</label>

      {/* Input + preview button */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={triggerPreview}
          placeholder="https://drive.google.com/..."
        />
        <button
          type="button"
          onClick={triggerPreview}
          title="Preview image"
          style={{
            flexShrink: 0, height: 28, width: 28,
            border: '1px solid var(--border-base)', borderLeft: 'none',
            background: (status === 'loading' || status === 'loading-auth') ? 'var(--bg-muted)' : 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: (status === 'loading' || status === 'loading-auth') ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 0,
          }}
        >
          {(status === 'loading' || status === 'loading-auth')
            ? <i className="fa-solid fa-circle-notch" style={{ fontSize: 10, animation: 'imgSpin 0.9s linear infinite' }} />
            : <i className="fa-solid fa-image" style={{ fontSize: 10 }} />
          }
        </button>
      </div>

      {/* Hidden thumbnail img — fast path (works if browser allows 3rd party cookies) */}
      {thumbSrc && (
        <img
          key={thumbSrc}
          src={thumbSrc}
          alt=""
          style={{ display: 'none' }}
          onLoad={async () => {
            // Thumbnail loaded → fetch actual blob via Drive API for reliable display
            const token = _driveToken && Date.now() < _tokenExpiry ? _driveToken : null
            if (token && fileId) {
              const url = await fetchDriveBlob(fileId, token)
              if (url) { setBlobSrc(url); setStatus('ok'); return }
            }
            // No token cached — just show thumbnail directly
            setBlobSrc(`https://drive.google.com/thumbnail?id=${fileId}&sz=w400`)
            setStatus('ok')
          }}
          onError={() => {
            // Thumbnail blocked → need Google auth
            setStatus('need-auth')
          }}
        />
      )}

      {/* Display image (blob URL or thumbnail URL) */}
      {status === 'ok' && displaySrc && (
        <img
          src={displaySrc}
          alt="preview"
          onClick={() => setLightbox(true)}
          style={{
            display: 'block',
            height: 72, width: 'auto', maxWidth: '100%',
            objectFit: 'cover', cursor: 'zoom-in',
            border: '1px solid var(--border-base)',
            marginTop: 6,
          }}
        />
      )}

      {/* Loading indicator */}
      {status === 'loading' && (
        <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-circle-notch" style={{ animation: 'imgSpin 0.9s linear infinite', fontSize: 10 }} />
          Loading preview...
        </p>
      )}

      {/* Need Google auth */}
      {status === 'need-auth' && fileId && (
        <div style={{ margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fa-solid fa-lock" style={{ fontSize: 10 }} />
            Requires Google sign-in
          </p>
          <button
            type="button"
            onClick={connectAndLoad}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', fontSize: 'var(--text-xs)',
              border: '1px solid var(--color-warning)', borderRadius: 0,
              background: 'transparent', color: 'var(--color-warning)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            <i className="fa-brands fa-google" style={{ fontSize: 10 }} />
            Connect
          </button>
        </div>
      )}

      {/* Auth loading */}
      {status === 'loading-auth' && (
        <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-circle-notch" style={{ animation: 'imgSpin 0.9s linear infinite', fontSize: 10 }} />
          Connecting Google Drive...
        </p>
      )}

      {/* Error */}
      {status === 'error' && value && (
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-circle-xmark" />
          Cannot load — check file ID or permissions
        </p>
      )}

      {/* Lightbox */}
      {lightbox && displaySrc && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(26,24,20,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={displaySrc}
            alt="full preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none',
              color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <style>{`
        @keyframes imgSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
