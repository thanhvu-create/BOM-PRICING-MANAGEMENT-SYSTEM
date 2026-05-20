'use client'

import { useState, useEffect } from 'react'
import React from 'react'

/* ── TYPES ─────────────────────────────────────────────────── */
interface StoneRow {
  grade_id: string; master_code: string; display_name: string
  pricing_unit: string; measurement_type: string
  min_size: number|string; max_size: number|string
  selling_price: number|string; base_price: number|string; mk: number|string
  vietnamese_name?: string; full_name_en?: string
  category?: string; type?: string; shape_code?: string; color?: string; quality?: string
  diamond_price?: number|string
}
interface DDOption { name: string; code: string }
interface DMRow { id?: string; name?: string; code?: string; en_name?: string; vn_name?: string }

const DM_SHEETS = ['DM_Category', 'DM_Types', 'DM_Shape', 'DM_Color', 'DM_Quality', 'Definition'] as const
type DMSheet = typeof DM_SHEETS[number]

/* ── STYLE CONSTANTS ─────────────────────────────────────────── */
const th: React.CSSProperties = { fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 500, padding: '8px 10px', borderBottom: '1px solid var(--border-base)', background: 'var(--bg-base)', whiteSpace: 'nowrap' }
const tdc: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', verticalAlign: 'middle' }
const inputU: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '1px solid var(--border-base)', background: 'transparent', padding: '5px 0', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none' }
const selS: React.CSSProperties = { width: '100%', border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-surface)', padding: '5px 8px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', outline: 'none' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 3 }

/* ── MODAL WRAPPER ───────────────────────────────────────────── */
function Modal({ title, onClose, children, width = 520 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '1.5rem', width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}><i className="fa-solid fa-xmark" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ── STONE MASTER TAB ────────────────────────────────────────── */
function StoneMasterTab({ triggerAdd = 0, triggerSync = 0, onSyncingChange }: { triggerAdd?: number; triggerSync?: number; onSyncingChange?: (v: boolean) => void }) {
  const [rows, setRows] = useState<StoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<StoneRow | null>(null)
  const [oldGradeId, setOldGradeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState<Partial<StoneRow>>({})
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [deleteStoneRow, setDeleteStoneRow] = useState<StoneRow | null>(null)
  const [dd, setDd] = useState<{ categories: DDOption[]; types: DDOption[]; shapes: DDOption[]; colors: DDOption[]; qualities: DDOption[]; definitions: { en_name: string; vn_name: string }[] } | null>(null)

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.master_code?.toLowerCase().includes(q) || r.grade_id?.toLowerCase().includes(q) || r.display_name?.toLowerCase().includes(q) || r.vietnamese_name?.toLowerCase().includes(q)
  })

  async function load() {
    setLoading(true)
    try {
      const [rRows, rDd] = await Promise.all([fetch('/api/master/stone').then(r => r.json()), fetch('/api/master/dropdowns').then(r => r.json())])
      setRows(rRows.data || [])
      setDd(rDd)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (triggerAdd > 0) openAdd() }, [triggerAdd])
  useEffect(() => { if (triggerSync > 0) syncAll() }, [triggerSync])

  function defaultForm(): Partial<StoneRow> {
    return { category: '', type: '', shape_code: '', color: '', quality: '', pricing_unit: 'ct', measurement_type: 'mm', min_size: 0, max_size: 99, base_price: 0, mk: 0, selling_price: 0, display_name: '', vietnamese_name: '', full_name_en: '' }
  }

  function openAdd() { setForm(defaultForm()); setOldGradeId(''); setFormError(''); setModal('add') }
  function openEdit(r: StoneRow) { setEditRow(r); setOldGradeId(r.grade_id); setForm({ ...r }); setFormError(''); setModal('edit') }
  function closeModal() { setModal(null); setEditRow(null); setOldGradeId('') }

  // Auto-generate derived fields from 5 dropdowns + sizes
  function updateForm(patch: Partial<StoneRow>) {
    setForm(prev => {
      const next = { ...prev, ...patch }
      const catOpt = dd?.categories.find(o => o.name === next.category)
      const typOpt = dd?.types.find(o => o.name === next.type)
      const shpOpt = dd?.shapes.find(o => o.name === next.shape_code)
      const qOpt   = dd?.qualities.find(o => o.name === next.quality)
      const catCode = catOpt?.code || ''; const typCode = typOpt?.code || ''
      const shpCode = shpOpt?.code || ''; const qCode = qOpt?.code || ''

      // Master Code: GAS exact formula
      let masterCode = ''
      if (catCode && typCode && shpCode) {
        const body = `${catCode}${typCode}-${shpCode}`
        masterCode = qCode ? `${qCode}-${body}` : body
      }
      next.master_code = masterCode

      // Grade ID: masterCode_minSize.toFixed(3)
      const minS = parseFloat(String(next.min_size)) || 0
      const maxS = parseFloat(String(next.max_size)) || 0
      if (masterCode) next.grade_id = `${masterCode}_${minS.toFixed(3)}`

      // Display Name
      if (masterCode) next.display_name = `${masterCode} ${minS} - ${maxS} (${next.measurement_type || 'mm'})`

      // Full Name EN from option names
      next.full_name_en = [next.category, next.type, next.shape_code, next.color, next.quality].filter(Boolean).join(' ')

      // Vietnamese Name from definitions lookup
      if (dd?.definitions) {
        const vnParts = [next.category, next.type, next.shape_code, next.color, next.quality].filter(Boolean).map(v => dd.definitions.find(d => d.en_name?.toLowerCase() === v?.toLowerCase())?.vn_name || '').filter(Boolean)
        next.vietnamese_name = vnParts.join(' ')
      }

      // Selling Price = base × (1 + mk/100)
      const bp = parseFloat(String(next.base_price)) || 0
      const mk = parseFloat(String(next.mk)) || 0
      next.selling_price = Math.round(bp * (1 + mk / 100) * 10000) / 10000

      return next
    })
  }

  async function handleSave() {
    if (!form.grade_id) { setFormError('Grade ID là bắt buộc'); return }
    setSaving(true); setFormError('')
    try {
      const body = { ...form, old_grade_id: oldGradeId || form.grade_id }
      const r = await fetch('/api/master/stone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed'); return }
      closeModal(); showMsg('Saved & synced'); load()
    } finally { setSaving(false) }
  }

  function handleDelete(row: StoneRow) { setDeleteStoneRow(row) }

  async function doDeleteStone() {
    if (!deleteStoneRow) return
    const row = deleteStoneRow
    setDeleteStoneRow(null)
    try {
      const r = await fetch(`/api/master/stone?gradeId=${encodeURIComponent(row.grade_id)}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { showMsg(d.error || 'Failed'); return }
      showMsg('Deleted & synced'); load()
    } catch { showMsg('Delete failed') }
  }

  async function syncAll() {
    setSyncing(true); onSyncingChange?.(true)
    try {
      await fetch('/api/master/sync', { method: 'POST' })
      showMsg('Sync complete')
    } finally { setSyncing(false); onSyncingChange?.(false) }
  }

  function showMsg(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <input
          style={{ border: '1px solid var(--border-base)', borderRadius: 0, padding: '8px 12px', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box', background: 'var(--bg-surface)' }}
          placeholder="Search master code / grade ID / name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {successMsg && <div style={{ borderLeft: '2px solid var(--color-success)', padding: '8px 12px', marginBottom: '1rem', background: '#F2F7F4', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>{successMsg}</div>}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['#', 'MASTER_CODE', 'GRADE_ID', 'DISPLAY NAME (VN)', 'UNIT', 'TYPE', 'MIN', 'MAX', 'BASE ($)', 'MK', 'SELL ($)', 'ACTIONS'].map(h => <th key={h} style={{ ...th, textAlign: h === '#' ? 'center' : 'left' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Loading...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data</td></tr>
                : filtered.map((r, i) => (
                  <tr key={i}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...tdc, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                    <td style={tdc}>
                      <span style={{ background: 'var(--text-primary)', color: 'var(--text-inverse)', padding: '2px 8px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>{r.master_code}</span>
                    </td>
                    <td style={tdc}>
                      <span style={{ color: '#2E8B8B', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.grade_id}</span>
                    </td>
                    <td style={{ ...tdc, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.vietnamese_name}</td>
                    <td style={tdc}>{r.pricing_unit}</td>
                    <td style={tdc}>{r.measurement_type}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.min_size}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.max_size}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>${r.base_price}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.mk}%</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>${r.selling_price}</td>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => openEdit(r)} style={{ background: 'transparent', border: '1px solid #B8860B', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: '#B8860B' }}><i className="fa-solid fa-pencil" style={{ fontSize: 9 }} /></button>
                        <button onClick={() => handleDelete(r)} style={{ background: 'transparent', border: '1px solid var(--color-danger)', borderRadius: 0, padding: '4px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}><i className="fa-solid fa-trash-can" style={{ fontSize: 9 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
        <span>1–{filtered.length} / {filtered.length} records</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>‹</button>
          <button style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>›</button>
        </div>
      </div>

      {deleteStoneRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 380, padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: '0 0 0.75rem' }}>Xác nhận xóa</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
              Xóa <strong>{deleteStoneRow.grade_id}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteStoneRow(null)} className="btn-outline" style={{ padding: '8px 18px' }}>Hủy</button>
              <button onClick={doDeleteStone} style={{ padding: '8px 18px', background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Stone Row' : `Edit: ${editRow?.grade_id}`} onClose={closeModal} width={620}>
          {formError && <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{formError}</div>}

          {/* 5 Dropdowns — auto-generate Master Code, Grade ID, Names */}
          <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 2, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>Phân loại (auto-gen Master Code)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              {([['Category', 'category', dd?.categories], ['Type', 'type', dd?.types], ['Shape', 'shape_code', dd?.shapes], ['Color', 'color', dd?.colors], ['Quality', 'quality', dd?.qualities]] as [string, keyof StoneRow, DDOption[] | undefined][]).map(([label, key, opts]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <select style={selS} value={String(form[key] || '')} onChange={e => updateForm({ [key]: e.target.value } as Partial<StoneRow>)}>
                    <option value="">—</option>
                    {(opts || []).map(o => <option key={o.code} value={o.name}>{o.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-generated readonly fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={lbl}>Master Code (auto)</label>
              <input style={{ ...inputU, color: '#2E8B8B', fontFamily: 'var(--font-mono)' }} value={form.master_code || ''} readOnly />
            </div>
            <div>
              <label style={lbl}>Grade ID (auto)</label>
              <input style={{ ...inputU, color: '#2E8B8B', fontFamily: 'var(--font-mono)' }} value={form.grade_id || ''} readOnly />
            </div>
            <div>
              <label style={lbl}>Vietnamese Name (auto)</label>
              <input style={{ ...inputU, color: 'var(--text-secondary)' }} value={form.vietnamese_name || ''} readOnly />
            </div>
            <div>
              <label style={lbl}>Full Name EN (auto)</label>
              <input style={{ ...inputU, color: 'var(--text-secondary)' }} value={form.full_name_en || ''} readOnly />
            </div>
          </div>

          {/* Size & type fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={lbl}>Min Size</label>
              <input type="number" step="0.001" style={inputU} value={String(form.min_size ?? '')} onChange={e => updateForm({ min_size: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Max Size</label>
              <input type="number" step="0.001" style={inputU} value={String(form.max_size ?? '')} onChange={e => updateForm({ max_size: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Pricing Unit</label>
              <select style={selS} value={form.pricing_unit || 'ct'} onChange={e => updateForm({ pricing_unit: e.target.value })}>
                {['ct', 'mm'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Measure Type</label>
              <select style={selS} value={form.measurement_type || 'mm'} onChange={e => updateForm({ measurement_type: e.target.value })}>
                {['mm', 'ct'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Price fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={lbl}>Base Price ($)</label>
              <input type="number" step="0.0001" style={inputU} value={String(form.base_price ?? '')} onChange={e => updateForm({ base_price: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Markup %</label>
              <input type="number" step="0.01" style={inputU} value={String(form.mk ?? '')} onChange={e => updateForm({ mk: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Selling Price (auto)</label>
              <input style={{ ...inputU, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }} value={String(form.selling_price ?? '')} readOnly />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <button onClick={closeModal} className="btn-outline" style={{ padding: '8px 18px' }}>Cancel</button>
            <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 18px' }} disabled={saving}>
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Saving...</> : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── DM CATEGORIES TAB ───────────────────────────────────────── */
function DMCategoriesTab() {
  const [activeSheet, setActiveSheet] = useState<DMSheet>('DM_Category')
  const [data, setData] = useState<DMRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<DMRow | null>(null)
  const [form, setForm] = useState<DMRow>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [deleteRow, setDeleteRow] = useState<DMRow | null>(null)

  const isDef = activeSheet === 'Definition'

  async function load(sheet: DMSheet) {
    setLoading(true)
    setData([])
    try {
      const r = await fetch(`/api/master/dm/${sheet}`)
      const d = await r.json()
      setData(d.data || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(activeSheet) }, [activeSheet])

  function openAdd() { setForm({}); setFormError(''); setModal('add') }
  function openEdit(r: DMRow) { setEditRow(r); setForm({ ...r }); setFormError(''); setModal('edit') }
  function closeModal() { setModal(null); setEditRow(null) }

  async function handleSave() {
    const valid = isDef ? form.en_name : (form.name && form.code)
    if (!valid) { setFormError(isDef ? 'EN Name required' : 'Name and Code required'); return }
    setSaving(true); setFormError('')
    try {
      const body = modal === 'edit' && editRow
        ? isDef ? { ...form, old_en_name: editRow.en_name } : { ...form, old_code: editRow.code }
        : form
      const r = await fetch(`/api/master/dm/${activeSheet}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed'); return }
      closeModal(); showMsg('Saved'); load(activeSheet)
    } finally { setSaving(false) }
  }

  function handleDelete(row: DMRow) { setDeleteRow(row) }

  async function doDelete() {
    if (!deleteRow) return
    const row = deleteRow
    setDeleteRow(null)
    const key = isDef ? row.en_name : row.code
    try {
      const param = isDef ? `enName=${encodeURIComponent(key!)}` : `code=${encodeURIComponent(key!)}`
      const r = await fetch(`/api/master/dm/${activeSheet}?${param}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { showMsg(d.error || 'Failed'); return }
      showMsg('Deleted'); load(activeSheet)
    } catch { showMsg('Delete failed') }
  }

  function showMsg(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-base)', marginBottom: '1rem' }}>
        {DM_SHEETS.map(s => (
          <button key={s} onClick={() => setActiveSheet(s)}
            style={{ padding: '8px 14px', fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeSheet === s ? '2px solid var(--border-strong)' : '2px solid transparent', color: activeSheet === s ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {s.replace('DM_', '')}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{data.length} rows</span>
        <button onClick={openAdd} className="btn-primary" style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)' }}>
          <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />Add
        </button>
      </div>

      {successMsg && <div style={{ borderLeft: '2px solid var(--color-success)', padding: '8px 12px', marginBottom: '1rem', background: '#F2F7F4', color: 'var(--color-success)', fontSize: 'var(--text-sm)' }}>{successMsg}</div>}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {isDef
                ? ['EN Name', 'VN Name', 'Code', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)
                : ['Name', 'Code', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Loading...</td></tr>
              : data.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data</td></tr>
              : data.map((r, i) => (
                <tr key={i}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  {isDef ? <>
                    <td style={tdc}>{r.en_name}</td>
                    <td style={{ ...tdc, color: 'var(--text-secondary)' }}>{r.vn_name}</td>
                  </> : <>
                    <td style={tdc}>{r.name}</td>
                  </>}
                  <td style={{ ...tdc, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.code}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(r)} style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '2px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}><i className="fa-solid fa-pencil" style={{ fontSize: 9 }} /></button>
                      <button onClick={() => handleDelete(r)} style={{ background: 'none', border: '1px solid var(--color-danger)', borderRadius: 0, padding: '2px 8px', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}><i className="fa-solid fa-trash-can" style={{ fontSize: 9 }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {deleteRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 380, padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: '0 0 0.75rem' }}>Xác nhận xóa</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
              Xóa <strong>{isDef ? deleteRow.en_name : deleteRow.code}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteRow(null)} className="btn-outline" style={{ padding: '8px 18px' }}>Hủy</button>
              <button onClick={doDelete} style={{ padding: '8px 18px', background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? `Add to ${activeSheet}` : 'Edit Row'} onClose={closeModal} width={400}>
          {formError && <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{formError}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {isDef ? <>
              <div><label style={lbl}>EN Name *</label><input style={inputU} value={form.en_name || ''} onChange={e => setForm(p => ({ ...p, en_name: e.target.value }))} autoFocus /></div>
              <div><label style={lbl}>VN Name</label><input style={inputU} value={form.vn_name || ''} onChange={e => setForm(p => ({ ...p, vn_name: e.target.value }))} /></div>
              <div><label style={lbl}>Code</label><input style={inputU} value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
            </> : <>
              <div><label style={lbl}>Name *</label><input style={inputU} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div><label style={lbl}>Code *</label><input style={inputU} value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
            </>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <button onClick={closeModal} className="btn-outline" style={{ padding: '8px 18px' }}>Cancel</button>
            <button onClick={handleSave} className="btn-primary" style={{ padding: '8px 18px' }} disabled={saving}>
              {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />...</> : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ── MAIN PAGE ───────────────────────────────────────────────── */
export default function MasterPage() {
  const [activeTab, setActiveTab] = useState<'stone' | 'dm'>('stone')
  const [triggerAdd, setTriggerAdd] = useState(0)
  const [triggerSync, setTriggerSync] = useState(0)
  const [syncing, setSyncing] = useState(false)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 4px' }}>MASTER DATA</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 4px' }}>Stone Data</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: 0 }}>Stone catalog — auto-sync to Stone_Material</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setTriggerSync(t => t + 1)} disabled={syncing}>
            <i className={`fa-solid ${syncing ? 'fa-circle-notch fa-spin' : 'fa-rotate'}`} style={{ fontSize: 10 }} />{syncing ? 'Syncing...' : 'Sync All'}
          </button>
          <button className="btn-outline" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setActiveTab('dm')}>
            <i className="fa-solid fa-tags" style={{ fontSize: 10 }} />Categories
          </button>
          <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => { setActiveTab('stone'); setTriggerAdd(t => t + 1) }}>
            <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />+ Add New
          </button>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-base)', marginBottom: '1.5rem' }}>
        {[['stone', 'Stone Master', 'fa-layer-group'], ['dm', 'DM Categories', 'fa-list']].map(([k, l, ic]) => (
          <button key={k} onClick={() => setActiveTab(k as any)}
            style={{ padding: '10px 20px', fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === k ? '2px solid var(--border-strong)' : '2px solid transparent', color: activeTab === k ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={`fa-solid ${ic}`} style={{ fontSize: 10 }} />{l}
          </button>
        ))}
      </div>

      {activeTab === 'stone'
        ? <StoneMasterTab triggerAdd={triggerAdd} triggerSync={triggerSync} onSyncingChange={setSyncing} />
        : <DMCategoriesTab />}
    </div>
  )
}
