'use client'

import { useState, useEffect } from 'react'

interface GoldRow {
  id: string
  price_date: string
  amark_gold_oz: number
  amark_pt_oz: number
  amark_ag_oz: number
  loss_factor: number
  karat_prices: Record<string, number>
}

const th: React.CSSProperties = {
  fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--text-secondary)', fontWeight: 500,
  padding: '10px 12px', borderBottom: '1px solid var(--border-base)',
  background: 'var(--bg-base)', textAlign: 'left', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid var(--border-light)',
  fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)',
}
const inputStyle: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid var(--border-base)',
  background: 'transparent', padding: '6px 0',
  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 4,
}

const DEFAULT_KARATS = ['10K', '14K', '18K', '20K', '22K', '24K', 'PT', 'AG']

export default function GoldPage() {
  const [rows, setRows] = useState<GoldRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<GoldRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Karat Cols management
  const [showKaratPanel, setShowKaratPanel] = useState(false)
  const [newKarat, setNewKarat] = useState('')
  const [karatWorking, setKaratWorking] = useState(false)

  // Form fields
  const [fDate, setFDate] = useState('')
  const [fGoldOz, setFGoldOz] = useState('')
  const [fPtOz, setFPtOz] = useState('')
  const [fAgOz, setFAgOz] = useState('')
  const [fLF, setFLF] = useState('1.06')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/gold')
      const d = await r.json()
      setRows(d.data || [])
    } catch { setError('Failed to load') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    setFDate(today); setFGoldOz(''); setFPtOz(''); setFAgOz(''); setFLF('1.06')
    setFormError(''); setModal('add')
  }

  function openEdit(r: GoldRow) {
    setEditRow(r)
    setFDate(r.price_date)
    setFGoldOz(String(r.amark_gold_oz))
    setFPtOz(String(r.amark_pt_oz))
    setFAgOz(String(r.amark_ag_oz))
    setFLF(String(r.loss_factor))
    setFormError(''); setModal('edit')
  }

  function closeModal() { setModal(null); setEditRow(null) }

  async function handleSave() {
    if (!fDate) { setFormError('Date is required'); return }
    setFormError(''); setSaving(true)
    try {
      const r = await fetch('/api/gold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: fDate, goldOz: fGoldOz, ptOz: fPtOz, agOz: fAgOz, lossFactor: fLF }),
      })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed'); return }
      closeModal()
      showSuccess('Saved successfully')
      load()
    } finally { setSaving(false) }
  }

  async function handleDelete(row: GoldRow) {
    if (!window.confirm(`Xóa dòng giá ${row.price_date}?`)) return
    try {
      const r = await fetch(`/api/gold?date=${row.price_date}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Delete failed'); return }
      showSuccess('Deleted'); load()
    } catch { alert('Failed to delete') }
  }

  function showSuccess(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  // Derive active karat columns from latest row
  const activeKarats = rows.length > 0
    ? Object.keys(rows[0].karat_prices || {}).sort()
    : DEFAULT_KARATS

  async function handleAddKarat() {
    const label = newKarat.trim().toUpperCase()
    if (!label) return
    setKaratWorking(true)
    try {
      const r = await fetch('/api/gold/karat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Failed'); return }
      setNewKarat('')
      showSuccess(`Added ${label}`)
      load()
    } finally { setKaratWorking(false) }
  }

  async function handleRemoveKarat(label: string) {
    if (!confirm(`Remove ${label} column from all rows?`)) return
    setKaratWorking(true)
    try {
      const r = await fetch(`/api/gold/karat?label=${label}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Failed'); return }
      showSuccess(`Removed ${label}`)
      load()
    } finally { setKaratWorking(false) }
  }

  async function handleFetchAmark() {
    setFetching(true); setError('')
    try {
      const r = await fetch('/api/gold/fetch-amark', { method: 'POST' })
      const d = await r.json()
      if (!r.ok || !d.success) { setError(d.message || d.error || 'Fetch failed'); return }
      showSuccess(`Fetched: Gold $${d.goldOz}/oz → 18K $${d.karatPrices?.['18K']}/gr`)
      load()
    } catch (e: any) { setError(e.message) } finally { setFetching(false) }
  }

  // Computed 18K price from form inputs (preview)
  function previewPrice(karat: number) {
    const oz = parseFloat(fGoldOz) || 0
    const lf = parseFloat(fLF) || 1.06
    if (!oz) return '—'
    return '$' + ((oz / 31.103) * (karat / 24) * lf).toFixed(4)
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 4px' }}>MASTER DATA</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 4px' }}>Gold Prices</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: 0 }}>Daily metal prices — auto-fetched from Amark.com</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={handleFetchAmark} disabled={fetching} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 'var(--text-xs)', opacity: fetching ? 0.6 : 1 }}>
            <i className={`fa-solid ${fetching ? 'fa-circle-notch fa-spin' : 'fa-cloud-arrow-down'}`} style={{ fontSize: 11 }} />
            {fetching ? 'Fetching...' : 'Fetch Today (Amark)'}
          </button>
          <button onClick={openAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 'var(--text-xs)' }}>
            <i className="fa-solid fa-plus" style={{ fontSize: 11 }} />+ Add Manual
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowKaratPanel(v => !v)} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 'var(--text-xs)' }}>
              <i className="fa-solid fa-table-columns" style={{ fontSize: 11 }} />Karat Cols <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
            </button>
            {showKaratPanel && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '1rem', width: 260, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 8 }}>Active Karats</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {activeKarats.map(k => (
                    <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--border-base)', padding: '2px 8px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                      {k}
                      {!DEFAULT_KARATS.includes(k) && (
                        <button onClick={() => handleRemoveKarat(k)} disabled={karatWorking}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 0, fontSize: 10, lineHeight: 1 }}>
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 6 }}>Add Custom Karat</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newKarat} onChange={e => setNewKarat(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleAddKarat()}
                    placeholder="e.g. 16K" maxLength={4}
                    style={{ flex: 1, border: '1px solid var(--border-base)', borderRadius: 0, padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', outline: 'none' }} />
                  <button onClick={handleAddKarat} disabled={karatWorking || !newKarat}
                    style={{ background: 'var(--btn-dark-bg)', color: 'var(--text-inverse)', border: 'none', borderRadius: 0, padding: '5px 12px', cursor: 'pointer', fontSize: 'var(--text-xs)', opacity: (!newKarat || karatWorking) ? 0.5 : 1 }}>
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 'var(--text-xs)' }}>
            <i className="fa-solid fa-clock" style={{ fontSize: 11 }} />Auto Trigger <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ borderLeft: '2px solid var(--color-success)', padding: '10px 14px', marginBottom: '1rem', background: '#F2F7F4', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>
          <i className="fa-solid fa-check" style={{ marginRight: 8 }} />{successMsg}
        </div>
      )}

      {error && (
        <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '10px 14px', marginBottom: '1rem', background: '#FAF2F2', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                {['Date', 'Gold (oz)', 'PT (oz)', 'AG (oz)', 'Loss Factor',
                  ...activeKarats.map(k => `${k} $/gr`),
                  'Actions'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5 + activeKarats.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Loading...
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5 + activeKarats.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data</td></tr>
              ) : rows.map(r => (
                <tr key={r.price_date}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ ...td, fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--text-primary)' }}>{r.price_date}</td>
                  <td style={{ ...td, color: '#B8860B' }}>{Number(r.amark_gold_oz).toFixed(2)}</td>
                  <td style={td}>{Number(r.amark_pt_oz).toFixed(2)}</td>
                  <td style={td}>{Number(r.amark_ag_oz).toFixed(3)}</td>
                  <td style={{ ...td, color: '#2E8B8B' }}>{r.loss_factor}</td>
                  {activeKarats.map(k => (
                    <td key={k} style={{ ...td, color: '#2E8B8B' }}>
                      {r.karat_prices?.[k] != null ? `$${Number(r.karat_prices[k]).toFixed(4)}` : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(r)}
                        style={{ background: 'transparent', border: '1px solid #B8860B', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: '#B8860B' }}>
                        <i className="fa-solid fa-pencil" style={{ marginRight: 4, fontSize: 10 }} />Edit
                      </button>
                      <button onClick={() => handleDelete(r)}
                        style={{ background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
                        <i className="fa-solid fa-trash-can" style={{ marginRight: 4, fontSize: 10 }} />Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
        <span>1–{rows.length} / {rows.length} records</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select style={{ border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-surface)', padding: '3px 6px', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', outline: 'none' }}>
            <option>20 / page</option>
            <option>50 / page</option>
            <option>100 / page</option>
          </select>
          <button style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>‹</button>
          <button style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>›</button>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '1.5rem', width: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>
                {modal === 'add' ? 'Add Gold Price Row' : `Edit: ${editRow?.price_date}`}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {formError && <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{formError}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Date *</label>
                <input type="date" style={inputStyle} value={fDate} onChange={e => setFDate(e.target.value)} readOnly={modal === 'edit'} />
              </div>
              <div>
                <label style={labelStyle}>Gold ASK (USD/oz)</label>
                <input type="number" style={inputStyle} value={fGoldOz} onChange={e => setFGoldOz(e.target.value)} placeholder="2000.00" step="0.01" />
              </div>
              <div>
                <label style={labelStyle}>Platinum ASK (USD/oz)</label>
                <input type="number" style={inputStyle} value={fPtOz} onChange={e => setFPtOz(e.target.value)} placeholder="900.00" step="0.01" />
              </div>
              <div>
                <label style={labelStyle}>Silver ASK (USD/oz)</label>
                <input type="number" style={inputStyle} value={fAgOz} onChange={e => setFAgOz(e.target.value)} placeholder="24.00" step="0.01" />
              </div>
              <div>
                <label style={labelStyle}>Loss Factor</label>
                <input type="number" style={inputStyle} value={fLF} onChange={e => setFLF(e.target.value)} placeholder="1.06" step="0.01" min="1" />
              </div>
            </div>

            {/* Preview computed prices */}
            {(parseFloat(fGoldOz) || 0) > 0 && (
              <div style={{ marginTop: '1rem', background: 'var(--bg-muted)', padding: '10px 14px', borderRadius: 2 }}>
                <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 6 }}>Computed Prices (preview)</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[18, 24].map(k => (
                    <span key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                      {k}K: {previewPrice(k)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
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
