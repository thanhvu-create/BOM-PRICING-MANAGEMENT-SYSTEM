'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'

export type ToastType = 'success' | 'danger' | 'warning' | 'info' | 'loading'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => string
  dismiss: (id: string) => void
  update: (id: string, message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({
  toast: () => '',
  dismiss: () => {},
  update: () => {},
})

const TYPE_STYLE: Record<ToastType, { border: string; icon: string }> = {
  success: { border: '#4A7C59', icon: 'fa-circle-check' },
  danger:  { border: '#9B4040', icon: 'fa-circle-xmark' },
  warning: { border: '#8C7340', icon: 'fa-triangle-exclamation' },
  info:    { border: '#4A6B8C', icon: 'fa-circle-info' },
  loading: { border: '#C8C3BB', icon: 'fa-circle-notch' },
}

let idCounter = 0
function genId() { return `t-${++idCounter}` }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    if (timers.current[id]) clearTimeout(timers.current[id])
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info'): string => {
    const id = genId()
    setItems(prev => [...prev, { id, message, type }])

    if (type !== 'loading') {
      timers.current[id] = setTimeout(() => dismiss(id), 4000)
    }
    return id
  }, [dismiss])

  const update = useCallback((id: string, message: string, type: ToastType = 'info') => {
    if (timers.current[id]) clearTimeout(timers.current[id])
    setItems(prev => prev.map(t => t.id === id ? { ...t, message, type } : t))
    if (type !== 'loading') {
      timers.current[id] = setTimeout(() => dismiss(id), 4000)
    }
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss, update }}>
      {children}
      <ToastContainer items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

/* ── Container ─────────────────────────────────────────── */
function ToastContainer({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  if (items.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: '1.25rem', left: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {items.map(item => {
        const { border, icon } = TYPE_STYLE[item.type]
        const isLoading = item.type === 'loading'
        return (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: 'var(--text-primary)',
              borderLeft: `3px solid ${border}`,
              color: 'var(--text-inverse)',
              padding: '0.6rem 0.75rem 0.6rem 0.875rem',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              maxWidth: 360, minWidth: 220,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              pointerEvents: 'all',
              animation: 'toastIn 0.18s ease forwards',
            }}
          >
            <i
              className={`fa-solid ${icon}`}
              style={{
                fontSize: 12, flexShrink: 0, color: border,
                ...(isLoading ? { animation: 'spin 0.9s linear infinite' } : {}),
              }}
            />
            <span style={{ flex: 1, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {item.message}
            </span>
            <button
              onClick={() => onDismiss(item.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 13, padding: '0 2px',
                flexShrink: 0, lineHeight: 1,
              }}
              aria-label="Dismiss"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
