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

// Browser loads these URLs using existing Google session cookies — works for group-restricted files
function thumbUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
}
function fullUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`
}

export default function DriveImageInput({ label, value, onChange, inputStyle, labelStyle }: Props) {
  const [fileId, setFileId] = useState<string | null>(null)
  const [imgKey, setImgKey] = useState(0)          // bump to force img reload
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [lightbox, setLightbox] = useState(false)
  const lastApplied = useRef('')

  // Auto-preview when value is set externally (edit-mode restore)
  useEffect(() => {
    const fid = extractFileId(value)
    if (fid && fid !== lastApplied.current) {
      lastApplied.current = fid
      setFileId(fid)
      setStatus('loading')
      setImgKey(k => k + 1)
    }
    if (!value) {
      setFileId(null)
      setStatus('idle')
      lastApplied.current = ''
    }
  }, [value])

  function triggerPreview() {
    const fid = extractFileId(value)
    if (!fid) { if (value) setStatus('error'); return }
    lastApplied.current = fid
    setFileId(fid)
    setStatus('loading')
    setImgKey(k => k + 1)   // force img re-fetch
  }

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
            background: status === 'loading' ? 'var(--bg-muted)' : 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            cursor: status === 'loading' ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 0,
          }}
        >
          {status === 'loading'
            ? <i className="fa-solid fa-circle-notch" style={{ fontSize: 10, animation: 'imgSpin 0.9s linear infinite' }} />
            : <i className="fa-solid fa-image" style={{ fontSize: 10 }} />
          }
        </button>
      </div>

      {/* Hidden img that loads via browser Google session */}
      {fileId && (
        <img
          key={`${fileId}-${imgKey}`}
          src={thumbUrl(fileId)}
          alt="preview"
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
          onClick={() => status === 'ok' && setLightbox(true)}
          style={{
            display: status === 'ok' ? 'block' : 'none',
            height: 72, width: 'auto', maxWidth: '100%',
            objectFit: 'cover', cursor: 'zoom-in',
            border: '1px solid var(--border-base)',
            marginTop: 6,
          }}
        />
      )}

      {/* Loading indicator (shown while img is fetching) */}
      {status === 'loading' && (
        <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-circle-notch" style={{ animation: 'imgSpin 0.9s linear infinite', fontSize: 10 }} />
          Loading preview...
        </p>
      )}

      {/* Error */}
      {status === 'error' && value && (
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-circle-xmark" />
          Cannot load — ensure file is shared with your Google account
        </p>
      )}

      {/* Lightbox */}
      {lightbox && fileId && (
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
            src={fullUrl(fileId)}
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
