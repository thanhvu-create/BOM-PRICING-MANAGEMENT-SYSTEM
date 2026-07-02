'use client'

import React, { useEffect, useState, useCallback, CSSProperties } from 'react'
import { useUser } from '@/components/shared/UserContext'
import { useLang } from '@/components/shared/I18nContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditRow {
  id: string
  created_at: string
  actor: string
  role: string | null
  action: string
  entity: string
  entity_id: string | null
  summary: string | null
  diff: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null
}

interface AuditStats {
  total: number
  last30: number
  byDay: { date: string; count: number }[]
  byEntity: { entity: string; count: number }[]
  byAction: { action: string; count: number }[]
  topActors: { actor: string; count: number }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  CREATE:   '#4A7C59',
  UPDATE:   '#4A6B8C',
  DELETE:   '#9B4040',
  DISCOUNT: '#8C7340',
}

const ENTITY_PALETTE = ['#1A1814', '#6B645C', '#A09890', '#C8C3BB', '#4A7C59', '#4A6B8C']

const ENTITY_LABELS: Record<string, string> = {
  bom:    'BOM',
  gold:   'Gold',
  user:   'User',
  stone:  'Stone',
  mk:     'MK',
  config: 'Config',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(iso: string) {
  return iso.slice(5, 10) // MM-DD
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '0.75rem 1.5rem',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--border-strong)' : '2px solid transparent',
    fontFamily: 'var(--font-body)',
  }
}

function actionBadgeStyle(action: string): CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: ACTION_COLORS[action] || '#6B645C',
    color: '#FAFAF7',
    borderRadius: 0,
    fontFamily: 'var(--font-mono)',
  }
}

const s: Record<string, CSSProperties> = {
  page: {
    background: 'var(--bg-base)',
    minHeight: '100vh',
    fontFamily: 'var(--font-body)',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 400,
    color: 'var(--text-primary)',
    marginBottom: '1.5rem',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border-base)',
    marginBottom: '1.5rem',
    gap: 0,
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-base)',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  kpiCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-base)',
    padding: '1.25rem',
  },
  kpiLabel: {
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem',
  },
  kpiValue: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'var(--text-2xl)',
    fontWeight: 400,
    color: 'var(--text-primary)',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  chartTitle: {
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--text-secondary)',
    marginBottom: '1rem',
    fontWeight: 500,
  },
  filterRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1rem',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  filterLabel: {
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-secondary)',
  },
  input: {
    border: '1px solid var(--border-base)',
    background: 'var(--bg-surface)',
    padding: '0.4rem 0.6rem',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)',
    borderRadius: 0,
    outline: 'none',
    width: '140px',
  },
  select: {
    border: '1px solid var(--border-base)',
    background: 'var(--bg-surface)',
    padding: '0.4rem 0.6rem',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)',
    borderRadius: 0,
    outline: 'none',
    width: '120px',
  },
  btnSmall: {
    border: '1px solid var(--border-strong)',
    background: 'var(--btn-dark-bg)',
    color: 'var(--text-inverse)',
    padding: '0.4rem 0.9rem',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 0,
    fontFamily: 'var(--font-body)',
    alignSelf: 'flex-end',
  },
  btnOutline: {
    border: '1px solid var(--border-strong)',
    background: 'transparent',
    color: 'var(--text-primary)',
    padding: '0.4rem 0.9rem',
    fontSize: 'var(--text-xs)',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 0,
    fontFamily: 'var(--font-body)',
    alignSelf: 'flex-end',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 'var(--text-sm)',
  },
  th: {
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid var(--border-base)',
    background: 'var(--bg-base)',
    fontSize: 'var(--text-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
    verticalAlign: 'top' as const,
  },
  entityBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 'var(--text-xs)',
    border: '1px solid var(--border-base)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    borderRadius: 0,
  },
  idBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-xs)',
    color: 'var(--text-muted)',
  },
  diffBox: {
    background: 'var(--bg-base)',
    border: '1px solid var(--border-light)',
    padding: '0.5rem 0.75rem',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'pre-wrap' as const,
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
    maxHeight: '160px',
    overflowY: 'auto' as const,
  },
  pagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--text-secondary)',
  },
  emptyRow: {
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    padding: '3rem',
    fontSize: 'var(--text-sm)',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const { t } = useLang()
  const user = useUser()
  const [tab, setTab] = useState<'log' | 'stats'>('log')

  // ── Log tab state ──────────────────────────────────────────────────────────
  const [rows, setRows] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState({ actor: '', entity: '', action: '', from: '', to: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('pageSize', String(pageSize))
    if (filters.actor)  params.set('actor', filters.actor)
    if (filters.entity) params.set('entity', filters.entity)
    if (filters.action) params.set('action', filters.action)
    if (filters.from)   params.set('from', filters.from)
    if (filters.to)     params.set('to', filters.to)
    try {
      const res = await fetch(`/api/audit?${params}`)
      const json = await res.json()
      setRows(json.data || [])
      setTotal(json.total || 0)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (tab === 'log') fetchLogs(1)
  }, [tab, fetchLogs])

  // ── Stats tab state ────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'stats') return
    setStatsLoading(true)
    fetch('/api/audit/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .finally(() => setStatsLoading(false))
  }, [tab])

  if (!['Admin', 'Manager'].includes(user.role || '')) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-danger)', fontFamily: 'var(--font-body)' }}>
        {t('noAccess')}
      </div>
    )
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div style={s.page}>
      <h1 style={s.heading}>{t('auditPageTitle')}</h1>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={tabStyle(tab === 'log')} onClick={() => setTab('log')}>
          <i className="fa-solid fa-list-ul" style={{ marginRight: 6 }} />
          {t('tabLog')}
        </button>
        <button style={tabStyle(tab === 'stats')} onClick={() => setTab('stats')}>
          <i className="fa-solid fa-chart-bar" style={{ marginRight: 6 }} />
          {t('tabStats')}
        </button>
      </div>

      {/* ── LOG TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <div style={s.card}>
          {/* Filter row */}
          <div data-tour="audit-filters" style={s.filterRow}>
            <div style={s.filterGroup}>
              <span style={s.filterLabel}>Actor</span>
              <input
                style={s.input}
                placeholder="Actor..."
                value={filters.actor}
                onChange={e => setFilters(f => ({ ...f, actor: e.target.value }))}
              />
            </div>
            <div style={s.filterGroup}>
              <span style={s.filterLabel}>Entity</span>
              <select
                style={s.select}
                value={filters.entity}
                onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))}
              >
                <option value="">{t('allOptions')}</option>
                {Object.entries(ENTITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div style={s.filterGroup}>
              <span style={s.filterLabel}>Action</span>
              <select
                style={s.select}
                value={filters.action}
                onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
              >
                <option value="">{t('allOptions')}</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="DISCOUNT">DISCOUNT</option>
              </select>
            </div>
            <div style={s.filterGroup}>
              <span style={s.filterLabel}>{t('filterFrom')}</span>
              <input
                style={s.input}
                type="date"
                value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div style={s.filterGroup}>
              <span style={s.filterLabel}>{t('filterTo')}</span>
              <input
                style={s.input}
                type="date"
                value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              />
            </div>
            <button style={s.btnSmall} onClick={() => fetchLogs(1)}>
              <i className="fa-solid fa-magnifying-glass" style={{ marginRight: 4 }} />
              {t('btnFilter')}
            </button>
            <button style={s.btnOutline} onClick={() => {
              setFilters({ actor: '', entity: '', action: '', from: '', to: '' })
              setTimeout(() => fetchLogs(1), 0)
            }}>
              Reset
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>{t('colTime')}</th>
                  <th style={s.th}>Actor</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Action</th>
                  <th style={s.th}>Entity</th>
                  <th style={s.th}>ID</th>
                  <th style={s.th}>{t('colSummary')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={s.emptyRow}>
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />
                      {t('loading')}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={s.emptyRow}>{t('noData')}</td>
                  </tr>
                ) : rows.map(row => {
                  const expanded = expandedId === row.id
                  const hasDiff = row.diff && (row.diff.before || row.diff.after)
                  return (
                    <tr key={row.id} style={{ background: expanded ? 'var(--bg-hover)' : undefined }}>
                      <td style={{ ...s.td, whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                        {formatDate(row.created_at)}
                      </td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{row.actor}</td>
                      <td style={{ ...s.td, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {row.role || '—'}
                      </td>
                      <td style={s.td}>
                        <span style={actionBadgeStyle(row.action)}>{row.action}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.entityBadge}>{ENTITY_LABELS[row.entity] || row.entity}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.idBadge}>{row.entity_id || '—'}</span>
                      </td>
                      <td style={s.td}>
                        <div>{row.summary}</div>
                        {hasDiff && (
                          <button
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: 'var(--text-xs)', color: 'var(--color-info)',
                              padding: '2px 0', fontFamily: 'var(--font-body)',
                            }}
                          >
                            {expanded ? '▲ Ẩn diff' : '▼ Xem diff'}
                          </button>
                        )}
                        {expanded && hasDiff && (
                          <div style={s.diffBox}>
                            {row.diff?.before && (
                              <div>
                                <span style={{ color: 'var(--color-danger)' }}>BEFORE:</span>{'\n'}
                                {JSON.stringify(row.diff.before, null, 2)}
                              </div>
                            )}
                            {row.diff?.after && (
                              <div style={{ marginTop: row.diff?.before ? '0.5rem' : 0 }}>
                                <span style={{ color: 'var(--color-success)' }}>AFTER:</span>{'\n'}
                                {JSON.stringify(row.diff.after, null, 2)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages >= 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <span>{((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} / {total} records</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => fetchLogs(page - 1)}
                  style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: page <= 1 ? 'default' : 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', opacity: page <= 1 ? 0.4 : 1 }}>
                  ‹
                </button>
                <span style={{ fontFamily: 'var(--font-mono)', minWidth: 50, textAlign: 'center' }}>{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => fetchLogs(page + 1)}
                  style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: page >= totalPages ? 'default' : 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', opacity: page >= totalPages ? 0.4 : 1 }}>
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STATS TAB ────────────────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <>
          {statsLoading || !stats ? (
            <div style={{ ...s.card, textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              {statsLoading
                ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />{t('loading')}</>
                : t('noData')}
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div style={s.kpiGrid}>
                {[
                  { label: 'Tổng hoạt động', value: stats.total.toLocaleString() },
                  { label: '30 ngày qua', value: stats.last30.toLocaleString() },
                  { label: 'Loại thực thể', value: stats.byEntity.length },
                  { label: 'Người thực hiện', value: stats.topActors.length },
                ].map(k => (
                  <div key={k.label} style={s.kpiCard}>
                    <div style={s.kpiLabel}>{k.label}</div>
                    <div style={s.kpiValue}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Chart row 1: Activity per day + Entity breakdown */}
              <div style={s.chartsGrid}>
                <div style={s.card}>
                  <div style={s.chartTitle}>Hoạt động theo ngày (30 ngày qua)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byDay.map(d => ({ ...d, date: formatShortDate(d.date) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 0, fontSize: 12 }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      />
                      <Bar dataKey="count" fill="#1A1814" name="Số hoạt động" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={s.card}>
                  <div style={s.chartTitle}>Phân loại theo thực thể</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={stats.byEntity.map(e => ({ ...e, name: ENTITY_LABELS[e.entity] || e.entity }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {stats.byEntity.map((_, i) => (
                          <Cell key={i} fill={ENTITY_PALETTE[i % ENTITY_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 0, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-body)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart row 2: By action + Top actors */}
              <div style={s.chartsGrid}>
                <div style={s.card}>
                  <div style={s.chartTitle}>Phân loại theo loại hành động</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byAction} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                      <YAxis type="category" dataKey="action" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={70} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 0, fontSize: 12 }}
                      />
                      <Bar dataKey="count" name="Số lần" radius={0}>
                        {stats.byAction.map((a, i) => (
                          <Cell key={i} fill={ACTION_COLORS[a.action] || '#6B645C'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={s.card}>
                  <div style={s.chartTitle}>Top 10 người thực hiện</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.topActors.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                      <YAxis type="category" dataKey="actor" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={90} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 0, fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="#4A6B8C" name="Số hoạt động" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
