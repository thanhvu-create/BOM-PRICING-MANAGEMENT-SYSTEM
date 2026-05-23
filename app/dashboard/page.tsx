'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/components/shared/UserContext'
import { useLang } from '@/components/shared/I18nContext'

interface Stats {
  totalBOMs: number
  todayBOMs: number
  monthBOMs: number
  totalValue: number
  avgSellPrice: number
  discountedCount: number
  byStore: Array<{ store: string; count: number; value: number }>
  byProductType: Array<{ type: string; count: number }>
  bySalesPerson: Array<{ name: string; count: number; value: number }>
  recentBOMs: Array<{ bom_id: string; date: string; model: string; store: string; sell_price: number }>
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

const card: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-base)',
  borderRadius: 4,
  padding: '1.5rem',
}

const eyebrow: React.CSSProperties = {
  fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10,
  display: 'flex', alignItems: 'center', gap: 6,
}

export default function DashboardPage() {
  const { t } = useLang()
  const { role } = useUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const showValue = ['Admin', 'Manager'].includes(role)

  async function loadStats(refresh = false) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/dashboard')
      if (!r.ok) throw new Error('Failed to load')
      const d = await r.json()
      setStats(d.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', padding: '3rem 0' }}>
      <i className="fa-solid fa-circle-notch fa-spin" />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>Loading dashboard...</span>
    </div>
  )

  if (error) return (
    <div style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', padding: '2rem 0' }}>
      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />{error}
    </div>
  )

  return (
    <div>

      {/* ── Section header ── */}
      <div className="page-header-row" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4 }}>
            {t('dashOverview')}
          </p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
            BOM Pricing Management System
          </h2>
        </div>
        <button
          onClick={() => loadStats(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', border: '1px solid var(--border-base)',
            borderRadius: 0, background: 'transparent',
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
            fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
        >
          <i className={`fa-solid fa-rotate${refreshing ? ' fa-spin' : ''}`} style={{ fontSize: 10 }} />
          REFRESH
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid-4col" style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: 'fa-file-invoice-dollar', label: t('dashTotalBoms'),  value: (stats?.totalBOMs ?? 0).toLocaleString(),      sub: t('dashAllTime'), heading: true },
          { icon: 'fa-calendar-day',        label: t('dashTodayBoms'), value: (stats?.todayBOMs ?? 0).toLocaleString(),      sub: t('dashAllTime'), heading: true },
          { icon: 'fa-calendar-week',       label: t('dashMonthBoms'), value: (stats?.monthBOMs ?? 0).toLocaleString(),      sub: t('dashAllTime'), heading: true },
          { icon: 'fa-money-bill-wave',     label: t('dashTotalValue'),value: showValue ? fmt(stats?.totalValue ?? 0) : '—', sub: t('dashTotalValue'), heading: false },
        ].map((k, i) => (
          <div key={i} style={card}>
            <p style={eyebrow}>
              <i className={`fa-solid ${k.icon}`} style={{ fontSize: 10, color: 'var(--text-muted)' }} />
              {k.label}
            </p>
            <div style={{
              fontFamily: k.heading ? 'var(--font-heading)' : 'var(--font-mono)',
              fontSize: k.heading ? 'var(--text-3xl)' : 'var(--text-2xl)',
              fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 8,
            }}>
              {k.value}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Admin/Manager sections ── */}
      {showValue && stats && (
        <>
          {/* Row 2: Sales by Store + Top Product Types */}
          <div className="grid-2col" style={{ marginBottom: '1rem' }}>

            {/* Sales by Store */}
            <div style={card}>
              <p style={eyebrow}>
                <i className="fa-solid fa-store" style={{ fontSize: 10 }} />
                {t('dashByStore')}
              </p>
              {stats.byStore.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No data</p>
                : stats.byStore.map(s => {
                    const pct = stats.totalBOMs > 0 ? Math.round(s.count / stats.totalBOMs * 100) : 0
                    return (
                      <div key={s.store || '__'} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {s.store || '—'}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            {s.count} BOM &middot; {fmt(s.value)}
                          </span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-muted)' }}>
                          <div style={{ height: 4, width: `${pct}%`, background: 'var(--text-primary)' }} />
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 3 }}>{pct}%</div>
                      </div>
                    )
                  })}
            </div>

            {/* Top 5 Product Types */}
            <div style={card}>
              <p style={eyebrow}>
                <i className="fa-solid fa-tags" style={{ fontSize: 10 }} />
                {t('dashTopProducts')}
              </p>
              {stats.byProductType.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No data</p>
                : stats.byProductType.map((p, i) => (
                    <div key={p.type} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border-light)',
                    }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: 8, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{i + 1}.</span>
                        {p.type}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {p.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
            </div>
          </div>

          {/* Row 3: Top Salespersons + Discount Summary */}
          <div className="grid-2col" style={{ marginBottom: '1rem' }}>

            {/* Top 5 Salespersons */}
            <div style={card}>
              <p style={eyebrow}>
                <i className="fa-solid fa-user-tie" style={{ fontSize: 10 }} />
                {t('dashTopSales')}
              </p>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 280 }}>
                <thead>
                  <tr>
                    {['#', 'SALESPERSON', 'BOMS', 'VALUE'].map((h, i) => (
                      <th key={h} style={{
                        textAlign: i <= 1 ? 'left' : 'right',
                        fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: 'var(--text-secondary)', fontWeight: 500,
                        padding: '0 6px 10px', borderBottom: '1px solid var(--border-base)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.bySalesPerson.length === 0
                    ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No data</td></tr>
                    : stats.bySalesPerson.map((sp, i) => (
                        <tr key={sp.name}>
                          <td style={{ padding: '9px 6px', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', borderBottom: '1px solid var(--border-light)' }}>{i + 1}</td>
                          <td style={{ padding: '9px 6px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-light)' }}>{sp.name || '—'}</td>
                          <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-light)' }}>{sp.count.toLocaleString()}</td>
                          <td style={{ padding: '9px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)' }}>{fmt(sp.value)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Discount Summary */}
            <div style={card}>
              <p style={eyebrow}>
                <i className="fa-solid fa-percent" style={{ fontSize: 10 }} />
                {t('dashDiscSummary')}
              </p>
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                  {t('dashDiscBoms')}
                </p>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {stats.discountedCount.toLocaleString()}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
                  {stats.totalBOMs > 0 ? Math.round(stats.discountedCount / stats.totalBOMs * 100) : 0}% of total BOMs
                </p>
              </div>
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
                <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                  {t('dashAvgSell')}
                </p>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', color: 'var(--text-primary)', lineHeight: 1 }}>
                  {fmt(stats.avgSellPrice)}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 6 }}>All time</p>
              </div>
            </div>
          </div>

          {/* Row 4: Recent Activity */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={eyebrow}>
                <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 10 }} />
                {t('dashRecentAct')}
              </p>
              <a href="/dashboard/review" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textDecoration: 'none', letterSpacing: '0.06em' }}>
                {t('dashViewAll')}
              </a>
            </div>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr>
                  {['BOM ID', 'DATE', 'MODEL', 'STORE', 'SELL PRICE'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 4 ? 'right' : 'left',
                      fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: 'var(--text-secondary)', fontWeight: 500,
                      padding: '6px 8px 10px', borderBottom: '1px solid var(--border-base)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats.recentBOMs || []).length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{t('dashNoRecent')}</td></tr>
                  : stats.recentBOMs.map(b => (
                      <tr key={b.bom_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{
                            background: 'var(--text-primary)', color: 'var(--text-inverse)',
                            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
                            padding: '2px 8px', letterSpacing: '0.04em',
                          }}>
                            {b.bom_id}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{b.date}</td>
                        <td style={{ padding: '10px 8px', fontSize: 'var(--text-sm)' }}>{b.model}</td>
                        <td style={{ padding: '10px 8px' }}>
                          {b.store && (
                            <span style={{
                              border: '1px solid var(--border-base)', padding: '1px 8px',
                              fontSize: 'var(--text-xs)', textTransform: 'uppercase',
                              letterSpacing: '0.06em', color: 'var(--text-secondary)',
                            }}>
                              {b.store}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', textAlign: 'right' }}>
                          {fmt(b.sell_price)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {/* Non-admin: simple welcome */}
      {!showValue && (
        <div style={{ ...card, textAlign: 'center', padding: '4rem' }}>
          <i className="fa-solid fa-gem" style={{ fontSize: 36, color: 'var(--text-muted)', marginBottom: 20, display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: 8 }}>
            {t('dashWelcome')}
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {t('dashUseNav')}
          </p>
        </div>
      )}
    </div>
  )
}
