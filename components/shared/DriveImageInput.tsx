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

// Module-level token cache (survives re-renders, cleared on page reload)
let _token: string | null = null
let _tokenExpiry = 0

function getToken(): Promise<string | null> {
  if (_token && Date.now() < _tokenExpiry) return Promise.resolve(_token)

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const g = (window as any).google

  if (!clientId || clientId.includes('your-google') || !g?.accounts?.oauth2) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (res: any) => {
        if (res?.access_token) {
          _token = res.access_token
          _tokenExpiry = Date.now() + ((res.expires_in ?? 3600) - 300) * 1000
          resolve(res.access_token)
        } else {
          resolve(null)
        }
      },
      error_callback: () => resolve(null),
    })
    // prompt: '' → silent if already consented, popup only on first use
    client.requestAccessToken({ prompt: '' })
  })
}

async function loadImage(fileId: string): Promise<{ src: string; fullSrc: string } | null> {
  const token = await getToken()
  if (!token) return null

  try {
    // Fetch thumbnail (w400)
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    const blob = await res.blob()
    const src = URL.createObjectURL(blob)
    return { src, fullSrc: src }
  } catch {
    return null
  }
}

type Status = 'idle' | 'loading' | 'ok' | 'no-client-id' | 'error'

export default function DriveImageInput({ label, value, onChange, inputStyle, labelStyle }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const lastApplied = useRef('')
  const prevSrc = useRef<string | null>(null)

  useEffect(() => () => { if (prevSrc.current) URL.revokeObjectURL(prevSrc.current) }, [])

  function setImg(src: string | null) {
    if (prevSrc.current) URL.revokeObjectURL(prevSrc.current)
    prevSrc.current = src
    setImgSrc(src)
  }

  async function preview(fid: string) {
    setStatus('loading')
    setImg(null)

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || clientId.includes('your-google')) {
      setStatus('no-client-id')
      return
    }

    const result = await loadImage(fid)
    if (result) {
      setImg(result.src)
      setStatus('ok')
    } else {
      setStatus('error')
    }
  }

  // Auto-preview when value set externally (edit-mode restore)
  useEffect(() => {
    const fid = extractFileId(value)
    if (fid && fid !== lastApplied.current) {
      lastApplied.current = fid
      preview(fid)
    }
    if (!value) {
      setImg(null)
      setStatus('idle')
      lastApplied.current = ''
    }
  }, [value])

  function triggerPreview() {
    const fid = extractFileId(value)
    if (!fid) { if (value) setStatus('error'); return }
    lastApplied.current = fid
    preview(fid)
  }

  const isLoading = status === 'loading'

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
            background: isLoading ? 'var(--bg-muted)' : 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: isLoading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 0,
          }}
        >
          {isLoading
            ? <i className="fa-solid fa-circle-notch" style={{ fontSize: 10, animation: 'imgSpin 0.9s linear infinite' }} />
            : <i className="fa-solid fa-image" style={{ fontSize: 10 }} />
          }
        </button>
      </div>

      {/* Preview image */}
      {status === 'ok' && imgSrc && (
        <img
          src={imgSrc}
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

      {/* Loading */}
      {isLoading && (
        <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-circle-notch" style={{ animation: 'imgSpin 0.9s linear infinite', fontSize: 10 }} />
          Loading preview...
        </p>
      )}

      {/* No client ID configured */}
      {status === 'no-client-id' && (
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10 }} />
          NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured
        </p>
      )}

      {/* Error */}
      {status === 'error' && value && (
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-circle-xmark" style={{ fontSize: 10 }} />
          Cannot load — check Drive permissions
        </p>
      )}

      {/* Lightbox */}
      {lightbox && imgSrc && (
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
            src={imgSrc}
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
