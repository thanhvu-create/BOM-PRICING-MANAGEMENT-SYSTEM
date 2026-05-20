'use client'

import { useState, useEffect, useRef } from 'react'
import { getTokenSilent, clearToken, onTokenChange, isAuthenticated } from '@/lib/driveToken'

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

async function loadImage(fileId: string): Promise<string | null> {
  const token = await getTokenSilent()
  if (!token) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) { clearToken(); return null }
    if (!res.ok) return null
    return URL.createObjectURL(await res.blob())
  } catch { return null }
}

type Status = 'idle' | 'loading' | 'ok' | 'no-auth' | 'error'

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

    const src = await loadImage(fid)
    if (src) {
      setImg(src)
      setStatus('ok')
    } else {
      // If not authenticated, show auth hint so user knows to connect Drive
      setStatus(isAuthenticated() ? 'error' : 'no-auth')
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Auto-retry when Drive token becomes available (user clicks DriveAuthButton)
  useEffect(() => {
    return onTokenChange(() => {
      const fid = extractFileId(value)
      if (fid && status !== 'ok' && status !== 'loading') {
        lastApplied.current = fid
        preview(fid)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, status])

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

      {/* Not authenticated — prompt to connect Drive */}
      {status === 'no-auth' && value && (
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 10, color: 'var(--color-warning)' }} />
          Connect Google Drive (topbar button) to preview images
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
