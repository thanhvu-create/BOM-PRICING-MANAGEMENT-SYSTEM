'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { getTourForPage, type TourStep } from '@/lib/tour-content'
import TourOverlay from './TourOverlay'

interface TourCtx {
  /** Start (or replay) the tour for a page. Defaults to the current page. */
  startTour: (pageKey?: string) => void
  /** pageKey derived from the current pathname. */
  currentPageKey: string
}

const Ctx = createContext<TourCtx>({ startTour: () => {}, currentPageKey: '' })

const SEEN_PREFIX = 'bom_tour_seen_'
const DISABLED_KEY = 'bom_tour_disabled'

export function pageKeyFromPath(pathname: string): string {
  if (pathname === '/dashboard') return 'dashboard'
  const m = pathname.match(/^\/dashboard\/([^/]+)/)
  return m ? m[1] : ''
}

function anchorExists(target: string): boolean {
  if (!target) return true // centered modal step — always valid
  return !!document.querySelector(`[data-tour="${target}"]`)
}

export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentPageKey = pageKeyFromPath(pathname)

  const [active, setActive] = useState(false)
  const [steps, setSteps] = useState<TourStep[]>([])
  const [index, setIndex] = useState(0)
  const activePageKey = useRef<string>('')
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const beginTour = useCallback((pageKey: string) => {
    const all = getTourForPage(pageKey)
    // Keep only steps whose anchor is present (role-hidden controls drop out).
    const visible = all.filter(s => anchorExists(s.target))
    if (visible.length === 0) return
    activePageKey.current = pageKey
    setSteps(visible)
    setIndex(0)
    setActive(true)
  }, [])

  const markSeen = useCallback((pageKey: string) => {
    try { localStorage.setItem(SEEN_PREFIX + pageKey, '1') } catch {}
  }, [])

  const stop = useCallback(() => {
    if (activePageKey.current) markSeen(activePageKey.current)
    setActive(false)
    setSteps([])
    setIndex(0)
  }, [markSeen])

  const next = useCallback(() => {
    setIndex(i => {
      if (i >= steps.length - 1) {
        // finished
        if (activePageKey.current) markSeen(activePageKey.current)
        setActive(false)
        setSteps([])
        return 0
      }
      return i + 1
    })
  }, [steps.length, markSeen])

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])

  const startTour = useCallback((pageKey?: string) => {
    beginTour(pageKey || currentPageKey)
  }, [beginTour, currentPageKey])

  // Auto-run once per page on first visit.
  useEffect(() => {
    if (!currentPageKey) return
    let disabled = false
    let seen = false
    try {
      disabled = localStorage.getItem(DISABLED_KEY) === '1'
      seen = localStorage.getItem(SEEN_PREFIX + currentPageKey) === '1'
    } catch {}
    if (disabled || seen) return
    if (getTourForPage(currentPageKey).length === 0) return
    // Delay so the target page has time to mount its anchors.
    autoTimer.current = setTimeout(() => beginTour(currentPageKey), 700)
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current) }
  }, [currentPageKey, beginTour])

  return (
    <Ctx.Provider value={{ startTour, currentPageKey }}>
      {children}
      {active && steps[index] && (
        <TourOverlay
          step={steps[index]}
          index={index}
          total={steps.length}
          onNext={next}
          onPrev={prev}
          onClose={stop}
        />
      )}
    </Ctx.Provider>
  )
}

export function useTour() {
  return useContext(Ctx)
}
