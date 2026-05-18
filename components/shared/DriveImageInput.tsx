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

export default function DriveImageInput({ label, value, onChange, inputStyle, labelStyle }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const lastFetched = useRef<string>('')

  /* Auto-preview when value loaded from edit-mode */
  useEffect(() => {
    if (value && value !== lastFetched.current && extractFileId(value)) {
      fetchPreview(value)
    }
    if (!value) { setSrc(null); setError(false); lastFetched.current = '' }
  }, [value])

  async function fetchPreview(url?: string) {
    const target = url ?? value
    const fileId = extractFileId(target)
    if (!fileId) { setError(true); return }
    if (lastFetched.current === fileId) return
    setLoading(true); setError(false); setSrc(null)
    try {
      const r = await fetch(`/api/images/proxy?fileId=${fileId}`)
      const d = await r.json()
      if (d.base64) {
        setSrc(`data:${d.contentType};base64,${d.base64}`)
        lastFetched.current = fileId
      } else {
        setError(true)
      }
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  return (
    <div>
      {/* Label */}
      <label style={labelStyle}>{label}</label>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => fetchPreview()}
          placeholder="https://drive.google.com/..."
        />
        <button
          type="button"
          onClick={() => fetchPreview()}
          title="Preview image"
          style={{
            flexShrink: 0,
            height: 28, width: 28,
            border: '1px solid var(--border-base)',
            borderLeft: 'none',
            background: loading ? 'var(--bg-muted)' : 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 0,
          }}
        >
          {loading
            ? <i className="fa-solid fa-circle-notch" style={{ fontSize: 10, animation: 'spin 0.9s linear infinite' }} />
            : <i className="fa-solid fa-image" style={{ fontSize: 10 }} />
          }
        </button>
      </div>

      {/* Thumbnail */}
      {src && (
        <div style={{ marginTop: 6 }}>
          <img
            src={src}
            alt="preview"
            onClick={() => setLightbox(true)}
            style={{
              height: 72, width: 'auto', maxWidth: '100%',
              objectFit: 'cover', cursor: 'zoom-in',
              border: '1px solid var(--border-base)',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Error hint */}
      {error && value && (
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
          <i className="fa-solid fa-circle-xmark" style={{ marginRight: 4 }} />
          Cannot load image — check URL or sharing permissions
        </p>
      )}

      {/* Lightbox */}
      {lightbox && src && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(26,24,20,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={src}
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
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
