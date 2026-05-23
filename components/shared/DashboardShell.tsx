'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserProvider } from './UserContext'
import { I18nProvider, useLang } from './I18nContext'
import { useToast } from './ToastContext'
import DriveAuthButton from './DriveAuthButton'
import type { Role } from '@/types'

interface Props {
  user: { username: string; role: string; store: string }
  children: React.ReactNode
}

const NAV_ITEMS = [
  { key: 'dashboard', i18nKey: 'home',    icon: 'fa-house',             href: '/dashboard',           roles: ['Admin','Manager','Sales Supervisor','Sales','Order'] },
  { key: 'tinh-gia',  i18nKey: 'tinhgia', icon: 'fa-calculator',        href: '/dashboard/tinh-gia',  roles: ['Admin','Manager','Order'] },
  { key: 'review',    i18nKey: 'review',  icon: 'fa-clock-rotate-left', href: '/dashboard/review',    roles: ['Admin','Manager','Sales Supervisor','Sales','Order'] },
  { key: 'gold',      i18nKey: 'gold',    icon: 'fa-coins',             href: '/dashboard/gold',      roles: ['Admin','Manager'] },
  { key: 'mk',        i18nKey: 'mk',      icon: 'fa-tags',              href: '/dashboard/mk',        roles: ['Admin','Manager'] },
  { key: 'master',    i18nKey: 'master',  icon: 'fa-gem',               href: '/dashboard/master',    roles: ['Admin','Manager','Order'] },
  { key: 'users',     i18nKey: 'users',   icon: 'fa-users',             href: '/dashboard/users',     roles: ['Admin'] },
  { key: 'audit',     i18nKey: 'audit',   icon: 'fa-shield-halved',     href: '/dashboard/audit',     roles: ['Admin', 'Manager'] },
]

const PAGE_TITLE_KEYS: Record<string, string> = {
  '/dashboard':            'pageTitleHome',
  '/dashboard/tinh-gia':   'pageTitleTinhgia',
  '/dashboard/review':     'pageTitleReview',
  '/dashboard/gold':       'pageTitleGold',
  '/dashboard/mk':         'pageTitleMk',
  '/dashboard/master':     'pageTitleMaster',
  '/dashboard/users':      'pageTitleUsers',
  '/dashboard/audit':      'pageTitleAudit',
}

export default function DashboardShell({ user, children }: Props) {
  return (
    <I18nProvider>
      <DashboardContent user={user}>{children}</DashboardContent>
    </I18nProvider>
  )
}

function DashboardContent({ user, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang, t } = useLang()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [vndRate, setVndRate] = useState(0)
  const [mgrDiscCap, setMgrDiscCap] = useState(20)
  const mgrDiscTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const vndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { toast } = useToast()
  const role = user.role as Role
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(role))
  const canEditRate = role === 'Admin' || role === 'Manager'
  const isAdmin = role === 'Admin'

  useEffect(() => {
    fetch('/api/config?key=VND_RATE')
      .then(r => r.json())
      .then(d => { if (d.rate != null) setVndRate(Number(d.rate)) })
      .catch(() => {})

    if (isAdmin) {
      fetch('/api/config?key=MANAGER_MAX_DISCOUNT')
        .then(r => r.json())
        .then(d => { if (d.rate != null) setMgrDiscCap(Number(d.rate)) })
        .catch(() => {})
    }
  }, [isAdmin])

  async function handleLogout() {
    const supabase = createClient()
    localStorage.removeItem('bom_session_expiry')
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleRateChange(val: string) {
    const n = parseInt(val.replace(/\D/g, '')) || 0
    setVndRate(n)
    if (vndTimer.current) clearTimeout(vndTimer.current)
    vndTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'VND_RATE', value: n }),
        })
        if (res.ok) {
          toast(`USD RATE đã cập nhật: ${n > 0 ? n.toLocaleString('vi-VN') + ' VND' : '—'}`, 'success')
        }
      } catch {}
    }, 800)
  }

  function handleMgrDiscInput(val: string) {
    const n = parseInt(val) || 0
    setMgrDiscCap(n)
    if (mgrDiscTimer.current) clearTimeout(mgrDiscTimer.current)
    mgrDiscTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'MANAGER_MAX_DISCOUNT', value: n }),
        })
        if (res.ok) {
          toast(`Max Discount Cap đã cập nhật: ${n}%`, 'success')
        }
      } catch {}
    }, 800)
  }

  const initials = user.username.slice(0, 2).toUpperCase()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const pageTitleKey = PAGE_TITLE_KEYS[pathname] ?? 'home'
  const pageTitle = t(pageTitleKey)

  const sessionUser = {
    username: user.username,
    role: user.role as Role,
    store: user.store as any,
  }

  /* ── inline styles ── */
  const topbarInputStyle: React.CSSProperties = {
    border: 'none', borderBottom: '1px solid var(--border-base)',
    background: 'transparent', textAlign: 'right' as const,
    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
    color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <UserProvider value={sessionUser}>
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

        {/* ── TOPBAR ─────────────────────────────────────────── */}
        <header style={{
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-base)',
          padding: '0.75rem 1.5rem 0',
          position: 'sticky', top: 0, zIndex: 100,
        }}>

          {/* ROW 1 — eyebrow + page title left | user right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.5rem' }}>
            {/* Left: eyebrow + serif title */}
            <div>
              <p style={{
                fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 2,
              }}>
                BOM PRICING MANAGEMENT SYSTEM
              </p>
              <h1 style={{
                fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)',
                fontWeight: 400, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1,
              }}>
                {pageTitle}
              </h1>
            </div>

            {/* Right: username + role | avatar | sign out */}
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* User info */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                  {user.username}
                </p>
                <span style={{
                  display: 'inline-block', marginTop: 2,
                  border: '1px solid var(--border-strong)', padding: '1px 6px',
                  fontSize: 'var(--text-xs)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-primary)',
                  fontWeight: 600, lineHeight: 1.4,
                }}>
                  {role.toUpperCase()}
                </span>
              </div>

              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--avatar-bg)', color: 'var(--avatar-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600,
                flexShrink: 0,
              }}>
                {initials}
              </div>

              {/* Sign Out */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px',
                  border: '1px solid var(--border-base)', borderRadius: 0,
                  background: 'transparent', color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                  fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 11 }} />
                {t('signOut')}
              </button>
            </div>

            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="show-mobile"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-primary)', padding: 4 }}
            >
              <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`} />
            </button>
          </div>

          {/* ROW 2 — nav left | controls right */}
          <div className="hide-mobile topbar-row2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>

            {/* Nav items */}
            <nav style={{ display: 'flex', gap: 0 }}>
              {visibleNav.map(n => (
                <Link
                  key={n.key}
                  href={n.href}
                  title={t(n.i18nKey)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.6rem 0.875rem',
                    fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                    fontWeight: isActive(n.href) ? 600 : 500,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: isActive(n.href) ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textDecoration: 'none',
                    borderBottom: isActive(n.href) ? '2px solid var(--border-strong)' : '2px solid transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <i className={`fa-solid ${n.icon}`} style={{ fontSize: 11 }} />
                  <span className="nav-item-label">{t(n.i18nKey)}</span>
                </Link>
              ))}
            </nav>

            {/* Right controls: STORE BADGE | USD RATE | MANAGER DISCOUNT CAP | LANG */}
            <div className="topbar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', paddingBottom: '0.25rem', flexShrink: 0 }}>

              {/* Store badge — shown if user.store has value */}
              {user.store && (
                <span style={{
                  border: '1px solid var(--border-base)',
                  padding: '2px 8px',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}>
                  {user.store}
                </span>
              )}

              {/* USD Rate */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  USD RATE
                </span>
                <input
                  type="text"
                  value={vndRate > 0 ? vndRate : ''}
                  readOnly={!canEditRate}
                  onChange={e => canEditRate && handleRateChange(e.target.value)}
                  placeholder="0"
                  style={{ ...topbarInputStyle, width: 68, cursor: canEditRate ? 'text' : 'default' }}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>VND</span>
              </div>

              {/* Manager Discount Cap — Admin only */}
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {t('mgrDiscCapLabel')}
                  </span>
                  <input
                    type="number" min={0} max={100} step={1}
                    value={mgrDiscCap}
                    onChange={e => handleMgrDiscInput(e.target.value)}
                    style={{ ...topbarInputStyle, width: 40 }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>%</span>
                </div>
              )}

              {/* Drive auth button */}
              <DriveAuthButton />

              {/* Lang toggle — segmented VI | EN */}
              <div style={{
                display: 'flex', border: '1px solid var(--border-base)',
                overflow: 'hidden', borderRadius: 0, flexShrink: 0,
              }}>
                {(['vi', 'en'] as const).map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      padding: '4px 9px',
                      border: 'none',
                      background: lang === l ? 'var(--text-primary)' : 'transparent',
                      color: lang === l ? 'var(--text-inverse)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                      fontWeight: lang === l ? 700 : 500, letterSpacing: '0.08em',
                      cursor: lang === l ? 'default' : 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                      lineHeight: 1,
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* ── MOBILE NAV PANEL ────────────────────────── */}
        {mobileOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--bg-surface)', zIndex: 200,
            display: 'flex', flexDirection: 'column', padding: '1.5rem',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)' }}>Menu</span>
              <button onClick={() => setMobileOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-primary)' }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {visibleNav.map(n => (
              <Link key={n.key} href={n.href} onClick={() => setMobileOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.875rem 0', borderBottom: '1px solid var(--border-light)',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 500,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: isActive(n.href) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                }}>
                <i className={`fa-solid ${n.icon}`} style={{ width: 20, textAlign: 'center', fontSize: 13 }} />
                {t(n.i18nKey)}
              </Link>
            ))}

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  USD RATE
                </span>
                <input
                  type="text"
                  value={vndRate > 0 ? vndRate : ''}
                  readOnly={!canEditRate}
                  onChange={e => canEditRate && handleRateChange(e.target.value)}
                  style={{
                    flex: 1, border: 'none', borderBottom: '1px solid var(--border-base)',
                    background: 'transparent', textAlign: 'right',
                    fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
                    color: 'var(--text-primary)', outline: 'none',
                  }}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>VND</span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {/* Segmented VI | EN — same as desktop */}
                <div style={{ display: 'flex', border: '1px solid var(--border-base)', overflow: 'hidden', borderRadius: 0, flex: 1 }}>
                  {(['vi', 'en'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      style={{
                        flex: 1, padding: '8px 0', border: 'none',
                        background: lang === l ? 'var(--text-primary)' : 'transparent',
                        color: lang === l ? 'var(--text-inverse)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                        fontWeight: lang === l ? 700 : 500, letterSpacing: '0.08em',
                        cursor: lang === l ? 'default' : 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleLogout}
                  style={{ flex: 1, padding: '8px 0', border: '1px solid var(--color-danger)', background: 'transparent', cursor: 'pointer', color: 'var(--color-danger)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 6 }} />
                  {t('signOut')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTENT ────────────────────────────────────── */}
        <main className="main-content">
          {children}
        </main>

        <style>{`
          .main-content { padding: 1.5rem; }
          @media (max-width: 767px) {
            .hide-mobile { display: none !important; }
            .show-mobile { display: flex !important; }
            .main-content { padding: 0.75rem; }
          }
          @media (min-width: 768px) {
            .show-mobile { display: none !important; }
          }
`}</style>
      </div>
    </UserProvider>
  )
}
