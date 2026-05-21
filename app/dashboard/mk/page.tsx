'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/shared/ToastContext'

/* ── LOGO CELL (async Drive proxy) ──────────────────────────── */
function extractDriveFileId(url: string): string | null {
  if (!url) return null
  const m =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/thumbnail\?id=([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

function LogoCell({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const fileId = extractDriveFileId(url)

  useEffect(() => {
    if (!fileId) return
    let cancelled = false
    setStatus('loading')
    fetch(`/api/images/proxy?fileId=${fileId}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.base64 && d.contentType) {
          setSrc(`data:${d.contentType};base64,${d.base64}`)
          setStatus('ok')
        } else {
          setStatus('error')
        }
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [fileId])

  if (!url) return <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>—</span>
  if (!fileId) return (
    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }} title={url}>
      <i className="fa-solid fa-link" style={{ marginRight: 3 }} />URL
    </span>
  )
  if (status === 'loading' || status === 'idle') return (
    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
      <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 4 }} />Loading…
    </span>
  )
  if (status === 'error' || !src) return (
    <a href={url} target="_blank" rel="noreferrer"
       style={{ fontSize: 'var(--text-xs)', color: 'var(--color-info)' }}
       title={url}>
      <i className="fa-solid fa-image" style={{ marginRight: 3 }} />View
    </a>
  )
  return <img src={src} alt="logo" style={{ maxHeight: 32, maxWidth: 100, objectFit: 'contain', verticalAlign: 'middle' }} />
}

/* ── SHEET CONFIG ────────────────────────────────────────────── */
type SheetKey = 'price_list_type' | 'product_type' | 'type_definition' | 'color' | 'process_fee' | 'cif_rate' | 'price_gram' | 'store_markup' | 'salesperson' | 'store'

interface SheetDef {
  key: SheetKey
  label: string
  columns: Array<{ key: string; label: string; type?: 'number' | 'text' }>
}

const SHEETS: SheetDef[] = [
  { key: 'price_list_type', label: 'Price List Type (Region)', columns: [
    { key: 'price_list_type', label: 'Price List Type' },
    { key: 'region', label: 'Region' },
    { key: 'store', label: 'Store' },
    { key: 'logo_url', label: 'Logo URL' },
  ]},
  { key: 'product_type', label: 'Product Type', columns: [
    { key: 'product_type', label: 'Product Type' },
    { key: 'details_en', label: 'Details EN' },
    { key: 'details_vi', label: 'Details VI' },
  ]},
  { key: 'type_definition', label: 'Type Definition', columns: [
    { key: 'type_definition', label: 'Type Definition' },
    { key: 'description', label: 'Description' },
  ]},
  { key: 'process_fee', label: 'Process Fee', columns: [
    { key: 'unit_name', label: 'Unit Name' },
    { key: 'unit_price', label: 'Unit Price', type: 'number' },
  ]},
  { key: 'cif_rate', label: 'Price List Type (CIF)', columns: [
    { key: 'price_list_type', label: 'Price List Type' },
    { key: 'cif_rate', label: 'CIF Rate', type: 'number' },
  ]},
  { key: 'price_gram', label: 'Price Per Gram (MK)', columns: [
    { key: 'sp_type', label: 'SP Type' },
    { key: 'weight_from', label: 'Weight From', type: 'number' },
    { key: 'weight_to', label: 'Weight To', type: 'number' },
    { key: 'markup_factor', label: 'Markup Factor', type: 'number' },
    { key: 'additional_price', label: 'Additional Price', type: 'number' },
  ]},
  { key: 'store_markup', label: 'Store Markup (By Value)', columns: [
    { key: 'value_from', label: 'Value From', type: 'number' },
    { key: 'value_to', label: 'Value To', type: 'number' },
  ]},
  { key: 'salesperson', label: 'Salesperson', columns: [
    { key: 'salesperson_name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ]},
  { key: 'store', label: 'Store', columns: [
    { key: 'store_name', label: 'Store Name' },
    { key: 'region', label: 'Region' },
  ]},
]

/* ── STYLE CONSTANTS ─────────────────────────────────────────── */
const th: React.CSSProperties = { fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 500, padding: '8px 10px', borderBottom: '1px solid var(--border-base)', background: 'var(--bg-base)', whiteSpace: 'nowrap', textAlign: 'left' }
const tdc: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', verticalAlign: 'middle' }
const inputU: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '1px solid var(--border-base)', background: 'transparent', padding: '5px 0', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 3 }

export default function MKPage() {
  const [activeKey, setActiveKey] = useState<SheetKey>('price_list_type')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<any>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteRow, setDeleteRow] = useState<any>(null)
  const [typeDefs, setTypeDefs] = useState<string[]>([])
  const [storeNames, setStoreNames] = useState<string[]>([])
  const [regionNames, setRegionNames] = useState<string[]>([])
  const [storeRegionMap, setStoreRegionMap] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const cache = useRef<Partial<Record<SheetKey, any[]>>>({})

  const activeSheet = SHEETS.find(s => s.key === activeKey)!

  async function load(key: SheetKey, force = false) {
    if (!force && cache.current[key]) {
      setData(cache.current[key]!)
      return
    }
    setLoading(true)
    setData([])
    try {
      const r = await fetch(`/api/mk/${key}`)
      const d = await r.json()
      cache.current[key] = d.data || []
      setData(cache.current[key]!)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(activeKey) }, [activeKey])

  useEffect(() => {
    fetch('/api/mk/type_definition')
      .then(r => r.json())
      .then(d => setTypeDefs((d.data || []).map((r: any) => r.type_definition).filter(Boolean)))
      .catch(() => {})
    fetch('/api/mk/store')
      .then(r => r.json())
      .then(d => {
        const rows = d.data || []
        setStoreNames(rows.map((r: any) => r.store_name).filter(Boolean))
        setRegionNames([...new Set<string>(rows.map((r: any) => r.region).filter(Boolean))])
        const map: Record<string, string> = {}
        rows.forEach((r: any) => { if (r.store_name) map[r.store_name] = r.region || '' })
        setStoreRegionMap(map)
      })
      .catch(() => {})
  }, [])

  // Fields that must not be edited (critical for pricing logic)
  const isLockedField = (colKey: string) =>
    activeKey === 'process_fee' && colKey === 'unit_name'

  function openAdd() {
    const empty: Record<string, string> = {}
    displayCols.forEach(c => { empty[c.key] = '' })
    setForm(empty); setFormError(''); setModal('add')
  }

  function openEdit(row: any) {
    setEditRow(row)
    const f: Record<string, string> = {}
    const rowMarkups = row.markups
      ? (typeof row.markups === 'string' ? JSON.parse(row.markups) : row.markups)
      : {}
    displayCols.forEach(c => {
      if (c.key.startsWith(MARKUP_PFX)) {
        const mk = c.key.slice(MARKUP_PFX.length)
        f[c.key] = String(rowMarkups[mk] ?? '')
      } else {
        f[c.key] = String(row[c.key] ?? '')
      }
    })
    setForm(f); setFormError(''); setModal('edit')
  }

  function closeModal() { setModal(null); setEditRow(null) }

  async function handleSave() {
    setSaving(true); setFormError('')
    try {
      const body: any = {}

      if (activeKey === 'store_markup') {
        const markupsObj: Record<string, number> = {}
        displayCols.forEach(c => {
          if (c.key.startsWith(MARKUP_PFX)) {
            const mk = c.key.slice(MARKUP_PFX.length)
            markupsObj[mk] = parseFloat(form[c.key]) || 0
          } else {
            body[c.key] = c.type === 'number' ? (parseFloat(form[c.key]) || 0) : (form[c.key] || '')
          }
        })
        body.markups = markupsObj
      } else {
        activeSheet.columns.forEach(c => {
          body[c.key] = c.type === 'number' ? (parseFloat(form[c.key]) || 0) : (form[c.key] || '')
        })
      }

      if (modal === 'edit' && editRow?.id) body.id = editRow.id

      const r = await fetch(`/api/mk/${activeKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed'); return }
      closeModal(); toast('Row saved', 'success'); load(activeKey, true)
    } finally { setSaving(false) }
  }

  function handleDelete(row: any) {
    if (!row.id) return
    setDeleteRow(row)
  }

  async function doDelete() {
    if (!deleteRow?.id) return
    const row = deleteRow
    setDeleteRow(null)
    try {
      const r = await fetch(`/api/mk/${activeKey}?id=${row.id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { toast(d.error || 'Delete failed', 'danger'); return }
      toast('Row deleted', 'success'); load(activeKey, true)
    } catch { toast('Delete failed', 'danger') }
  }

  // For store_markup: flatten markups JSONB object into individual columns
  const MARKUP_PFX = 'mkp__'
  const markupKeys: string[] = activeKey === 'store_markup' && data.length > 0 && data[0]?.markups
    ? Object.keys(typeof data[0].markups === 'string' ? JSON.parse(data[0].markups) : data[0].markups)
    : []

  type ColDef = { key: string; label: string; type?: 'number' | 'text' }
  const displayCols: ColDef[] = (activeKey === 'store_markup'
    ? [
        { key: 'value_from', label: 'Value From', type: 'number' as const },
        { key: 'value_to', label: 'Value To', type: 'number' as const },
        ...markupKeys.map(k => ({ key: MARKUP_PFX + k, label: k, type: 'number' as const } as ColDef)),
      ]
    : activeSheet.columns) as ColDef[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 4px' }}>MASTER DATA</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 4px' }}>Markup &amp; Pricing</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: 0 }}>Manage markup &amp; pricing tables</p>
        </div>
        {activeKey !== 'process_fee' && (
          <button onClick={openAdd} className="btn-primary" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)' }}>
            <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />Add New
          </button>
        )}
      </div>

      {/* Sheet tabs — horizontal scroll */}
      <div style={{ overflowX: 'auto', borderBottom: '1px solid var(--border-base)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
          {SHEETS.map(s => (
            <button key={s.key} onClick={() => setActiveKey(s.key)}
              style={{ padding: '10px 16px', fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeKey === s.key ? '2px solid var(--border-strong)' : '2px solid transparent', color: activeKey === s.key ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {data.length} rows · {activeSheet.label}
        </span>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(400, displayCols.length * 120) }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 40, textAlign: 'center' }}>#</th>
                {displayCols.map(c => <th key={c.key} style={th}>{c.label}</th>)}
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={displayCols.length + 2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Loading...
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={displayCols.length + 2} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data</td></tr>
              ) : data.map((row, i) => (
                <tr key={i}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ ...tdc, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                  {displayCols.map(c => (
                    <td key={c.key} style={{
                      ...tdc,
                      fontFamily: c.type === 'number' ? 'var(--font-mono)' : 'var(--font-body)',
                      fontSize: 'var(--text-sm)',
                      maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.key === 'logo_url'
                        ? <LogoCell url={row[c.key] || ''} />
                        : c.key.startsWith(MARKUP_PFX)
                          ? (() => {
                              const mk = c.key.slice(MARKUP_PFX.length)
                              const mObj = row.markups
                                ? (typeof row.markups === 'string' ? JSON.parse(row.markups) : row.markups)
                                : {}
                              const v = mObj[mk]
                              return v != null ? Number(v).toFixed(4) : '—'
                            })()
                          : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(row)}
                        style={{ background: 'transparent', border: '1px solid #B8860B', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: '#B8860B' }}>
                        <i className="fa-solid fa-pencil" style={{ fontSize: 9 }} />
                      </button>
                      {activeKey !== 'process_fee' && (
                        <button onClick={() => handleDelete(row)}
                          style={{ background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
                          <i className="fa-solid fa-trash-can" style={{ fontSize: 9 }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      {deleteRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 380, padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: '0 0 0.75rem' }}>Xác nhận xóa</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>Bạn có chắc muốn xóa dòng này? Hành động này không thể hoàn tác.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteRow(null)} className="btn-outline" style={{ padding: '8px 18px' }}>Hủy</button>
              <button onClick={doDelete} style={{ padding: '8px 18px', background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4,
            width: activeKey === 'store_markup' ? 'min(92vw, 720px)' : activeSheet.columns.length > 3 ? 'min(90vw, 560px)' : 'min(90vw, 460px)',
            maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          }}>
            {/* STICKY HEADER */}
            <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg-base)', borderRadius: '4px 4px 0 0' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>
                {modal === 'add' ? `Add — ${activeSheet.label}` : `Edit — ${activeSheet.label}`}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>
              {formError && <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{formError}</div>}

              {activeKey === 'store_markup' ? (
                // Store Markup: range row (2-col) + markup keys (3-col grid)
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem', marginBottom: '1.25rem' }}>
                    {displayCols.filter(c => !c.key.startsWith(MARKUP_PFX)).map((c, idx) => (
                      <div key={c.key}>
                        <label style={lbl}>{c.label}</label>
                        <input type="number" style={inputU} value={form[c.key] || ''} step="0.01" autoFocus={idx === 0}
                          onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                    <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', margin: '0 0 0.85rem' }}>Markup Factor by Price List Type</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem 1.25rem' }}>
                      {displayCols.filter(c => c.key.startsWith(MARKUP_PFX)).map(c => (
                        <div key={c.key}>
                          <label style={{ ...lbl, fontSize: '0.6rem' }}>{c.label}</label>
                          <input type="number" style={inputU} value={form[c.key] || ''} step="0.0001"
                            onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : activeSheet.columns.length > 3 ? (
                // Wide sheets (≥4 fields): 2-column grid
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem 1.5rem' }}>
                  {activeSheet.columns.map((c, idx) => {
                    const isSpType = activeKey === 'price_gram' && c.key === 'sp_type'
                    const isStore  = activeKey === 'price_list_type' && c.key === 'store'
                    const isRegion = activeKey === 'price_list_type' && c.key === 'region'
                    return (
                      <div key={c.key}>
                        <label style={lbl}>{c.label}</label>
                        {isSpType ? (
                          <select style={{ ...inputU, cursor: 'pointer' }} value={form[c.key] || ''} autoFocus={idx === 0}
                            onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}>
                            <option value="">-- Select --</option>
                            {typeDefs.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : isStore ? (
                          <select style={{ ...inputU, cursor: 'pointer' }} value={form[c.key] || ''} autoFocus={idx === 0}
                            onChange={e => {
                              const storeName = e.target.value
                              const autoRegion = storeRegionMap[storeName] ?? ''
                              setForm(p => ({ ...p, [c.key]: storeName, region: autoRegion }))
                            }}>
                            <option value="">-- Select --</option>
                            {storeNames.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : isRegion ? (
                          <select style={{ ...inputU, cursor: 'pointer' }} value={form[c.key] || ''} autoFocus={idx === 0}
                            onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}>
                            <option value="">-- Select --</option>
                            {regionNames.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <input type={c.type === 'number' ? 'number' : 'text'} style={inputU}
                            value={form[c.key] || ''} step={c.type === 'number' ? '0.0001' : undefined} autoFocus={idx === 0}
                            onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Narrow sheets (≤3 fields): single column
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeSheet.columns.map((c, idx) => {
                    const locked = isLockedField(c.key)
                    return (
                      <div key={c.key}>
                        <label style={lbl}>
                          {c.label}
                          {locked && <span style={{ marginLeft: 5, fontSize: 9, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
                            <i className="fa-solid fa-lock" style={{ marginRight: 2 }} />locked
                          </span>}
                        </label>
                        <input
                          type={c.type === 'number' ? 'number' : 'text'}
                          style={{ ...inputU, ...(locked ? { color: 'var(--text-muted)', cursor: 'not-allowed', userSelect: 'none' } : {}) }}
                          value={form[c.key] || ''}
                          step={c.type === 'number' ? '0.0001' : undefined}
                          autoFocus={idx === 0 && !locked}
                          readOnly={locked}
                          onChange={locked ? undefined : e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* STICKY FOOTER */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: 'var(--bg-base)', borderRadius: '0 0 4px 4px' }}>
              <button onClick={closeModal} className="btn-outline" style={{ padding: '8px 20px' }}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 20px' }} disabled={saving}>
                {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
