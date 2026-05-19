'use client'

import { useState, useEffect } from 'react'

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
    { key: 'sort_order', label: 'Sort', type: 'number' },
  ]},
  { key: 'product_type', label: 'Product Type', columns: [
    { key: 'product_type', label: 'Product Type' },
    { key: 'product_type_details_en', label: 'Details EN' },
    { key: 'product_type_details_vi', label: 'Details VI' },
    { key: 'sort_order', label: 'Sort', type: 'number' },
  ]},
  { key: 'type_definition', label: 'Type Definition', columns: [
    { key: 'type_definition', label: 'Type Definition' },
    { key: 'sort_order', label: 'Sort', type: 'number' },
  ]},
  { key: 'color', label: 'Color', columns: [
    { key: 'color', label: 'Color' },
    { key: 'sort_order', label: 'Sort', type: 'number' },
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
  const [successMsg, setSuccessMsg] = useState('')
  const [deleteRow, setDeleteRow] = useState<any>(null)

  const activeSheet = SHEETS.find(s => s.key === activeKey)!

  async function load(key: SheetKey) {
    setLoading(true)
    setData([])
    try {
      const r = await fetch(`/api/mk/${key}`)
      const d = await r.json()
      setData(d.data || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(activeKey) }, [activeKey])

  function openAdd() {
    const empty: Record<string, string> = {}
    activeSheet.columns.forEach(c => { empty[c.key] = '' })
    setForm(empty); setFormError(''); setModal('add')
  }

  function openEdit(row: any) {
    setEditRow(row)
    const f: Record<string, string> = {}
    // store_markup: include dynamic markup columns alongside base columns
    const colsToFill = activeKey === 'store_markup' ? displayCols : activeSheet.columns
    colsToFill.forEach(c => { f[c.key] = String(row[c.key] ?? '') })
    setForm(f); setFormError(''); setModal('edit')
  }

  function closeModal() { setModal(null); setEditRow(null) }

  async function handleSave() {
    setSaving(true); setFormError('')
    try {
      const body: any = {}
      const colsToSave = activeKey === 'store_markup' ? displayCols : activeSheet.columns
      colsToSave.forEach(c => {
        body[c.key] = c.type === 'number' ? (parseFloat(form[c.key]) || 0) : (form[c.key] || '')
      })
      if (modal === 'edit' && editRow?.id) body.id = editRow.id

      const r = await fetch(`/api/mk/${activeKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed'); return }
      closeModal(); showMsg('Saved'); load(activeKey)
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
      if (!r.ok) { showMsg(d.error || 'Delete failed'); return }
      showMsg('Deleted'); load(activeKey)
    } catch { showMsg('Delete failed') }
  }

  function showMsg(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  // For store_markup: additional dynamic columns
  const extraCols: string[] = activeKey === 'store_markup' && data.length > 0
    ? Object.keys(data[0]).filter(k => !['id', 'value_from', 'value_to', 'sort_order'].includes(k))
    : []

  type ColDef = { key: string; label: string; type?: 'number' | 'text' }
  const displayCols: ColDef[] = (activeKey === 'store_markup'
    ? [{ key: 'value_from', label: 'Value From', type: 'number' as const }, { key: 'value_to', label: 'Value To', type: 'number' as const }, ...extraCols.map(k => ({ key: k, label: k } as ColDef))]
    : activeSheet.columns) as ColDef[]

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 4px' }}>MASTER DATA</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 4px' }}>Markup &amp; Pricing</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: 0 }}>Manage markup &amp; pricing tables</p>
        </div>
        <button onClick={openAdd} className="btn-primary" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)' }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />+ Add New
        </button>
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

      {successMsg && <div style={{ borderLeft: '2px solid var(--color-success)', padding: '8px 12px', marginBottom: '1rem', background: '#F2F7F4', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>{successMsg}</div>}

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
                      {c.key === 'logo_url' && row[c.key]
                        ? <img src={row[c.key]} alt="logo" style={{ maxHeight: 28, maxWidth: 80, objectFit: 'contain', verticalAlign: 'middle' }} />
                        : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(row)}
                        style={{ background: 'transparent', border: '1px solid #B8860B', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: '#B8860B' }}>
                        <i className="fa-solid fa-pencil" style={{ fontSize: 9 }} />
                      </button>
                      <button onClick={() => handleDelete(row)}
                        style={{ background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
                        <i className="fa-solid fa-trash-can" style={{ fontSize: 9 }} />
                      </button>
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
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '1.5rem', width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>
                {modal === 'add' ? `Add to ${activeSheet.label}` : 'Edit Row'}
              </h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {formError && <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{formError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(activeKey === 'store_markup' ? displayCols : activeSheet.columns).map((c, idx) => (
                <div key={c.key}>
                  <label style={lbl}>{c.label}</label>
                  <input
                    type={c.type === 'number' ? 'number' : 'text'}
                    style={inputU}
                    value={form[c.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
                    step={c.type === 'number' ? '0.0001' : undefined}
                    autoFocus={idx === 0}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button onClick={closeModal} className="btn-outline" style={{ padding: '8px 18px' }}>Cancel</button>
              <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 18px' }} disabled={saving}>
                {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
