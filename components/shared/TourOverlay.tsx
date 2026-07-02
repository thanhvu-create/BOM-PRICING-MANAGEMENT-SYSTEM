'use client'

import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { useLang } from './I18nContext'
import type { TourStep } from '@/lib/tour-content'

interface Props {
  step: TourStep
  index: number
  total: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

interface Rect { top: number; left: number; width: number; height: number }

const CARD_W = 340
const GAP = 12
const PAD = 6 // spotlight padding around target

export default function TourOverlay({ step, index, total, onNext, onPrev, onClose }: Props) {
  const { lang, t } = useLang()
  const [rect, setRect] = useState<Rect | null>(null)
  const isCenter = step.placement === 'center' || !step.target

  const measure = useCallback(() => {
    if (isCenter) { setRect(null); return true }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null
    if (!el) { setRect(null); return false }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    return true
  }, [step.target, isCenter])

  // Measure on step change; scroll target into view first, retry a few frames.
  useLayoutEffect(() => {
    if (isCenter) { setRect(null); return }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })

    let tries = 0
    let raf = 0
    const tick = () => {
      const ok = measure()
      tries++
      if (!ok && tries < 20) { raf = requestAnimationFrame(tick); return }
      if (!ok) onNext() // target never appeared → skip this step
    }
    // small delay to let smooth-scroll settle before first measure
    const to = setTimeout(() => { raf = requestAnimationFrame(tick) }, 60)
    return () => { clearTimeout(to); cancelAnimationFrame(raf) }
  }, [step.target, isCenter, measure, onNext])

  // Reposition on scroll / resize.
  useEffect(() => {
    if (isCenter) return
    const onMove = () => measure()
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [isCenter, measure])

  // Esc closes; ←/→ navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'ArrowLeft' && index > 0) onPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNext, onPrev, index])

  const isLast = index >= total - 1
  const isFirst = index === 0

  /* ── card position ── */
  const cardStyle: React.CSSProperties = { position: 'fixed', width: CARD_W, maxWidth: 'calc(100vw - 24px)', zIndex: 2010 }
  if (isCenter || !rect) {
    cardStyle.top = '50%'; cardStyle.left = '50%'; cardStyle.transform = 'translate(-50%, -50%)'
  } else {
    const vw = window.innerWidth, vh = window.innerHeight
    const clampX = (x: number) => Math.min(Math.max(12, x), vw - CARD_W - 12)
    const clampY = (y: number) => Math.min(Math.max(12, y), vh - 220)
    const place = step.placement || (rect.top > vh / 2 ? 'top' : 'bottom')
    if (place === 'top') {
      cardStyle.left = clampX(rect.left); cardStyle.bottom = vh - rect.top + GAP
    } else if (place === 'left') {
      cardStyle.top = clampY(rect.top); cardStyle.right = vw - rect.left + GAP
    } else if (place === 'right') {
      cardStyle.top = clampY(rect.top); cardStyle.left = clampX(rect.left + rect.width + GAP)
    } else { // bottom
      cardStyle.left = clampX(rect.left); cardStyle.top = clampY(rect.top + rect.height + GAP)
    }
  }

  const btnBase: React.CSSProperties = {
    padding: '7px 16px', borderRadius: 0, cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
    fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
  }

  return (
    <>
      {/* Backdrop + spotlight. For non-center steps the ring is drawn with a huge
          box-shadow so the target stays lit while everything else is dimmed. */}
      {isCenter || !rect ? (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000 }} />
      ) : (
        <div
          style={{
            position: 'fixed', zIndex: 2000, pointerEvents: 'none',
            top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            borderRadius: 2,
            border: '2px solid var(--accent, #8C7340)',
            boxShadow: '0 0 0 9999px rgba(26,24,20,0.55)',
            transition: 'top 0.2s, left 0.2s, width 0.2s, height 0.2s',
          }}
        />
      )}

      {/* Tooltip card */}
      <div style={{
        ...cardStyle,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* header */}
        <div style={{ padding: '1rem 1.1rem 0.6rem' }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'var(--text-muted)', fontFamily: 'var(--font-body)', marginBottom: 6,
          }}>
            {t('tourStepOf')} {index + 1} / {total}
          </div>
          <h3 style={{
            margin: 0, fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)',
            fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2,
          }}>
            {step.title[lang]}
          </h3>
        </div>

        {/* body */}
        <p style={{
          margin: 0, padding: '0 1.1rem 0.9rem',
          fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          {step.body[lang]}
        </p>

        {/* footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '0.7rem 1.1rem', borderTop: '1px solid var(--border-light)',
          background: 'var(--bg-base)',
        }}>
          <button
            onClick={onClose}
            style={{ ...btnBase, background: 'none', border: 'none', color: 'var(--text-muted)', padding: '7px 4px' }}
          >
            {t('tourSkip')}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button
                onClick={onPrev}
                style={{ ...btnBase, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' }}
              >
                {t('tourPrev')}
              </button>
            )}
            <button
              onClick={onNext}
              style={{ ...btnBase, background: 'var(--btn-dark-bg, var(--text-primary))', color: 'var(--text-inverse)', border: '1px solid var(--btn-dark-bg, var(--text-primary))' }}
            >
              {isLast ? t('tourFinish') : t('tourNext')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
