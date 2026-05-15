'use client'

import { useState, useEffect } from 'react'
import React from 'react'

/* ── TYPES ─────────────────────────────────────────────────── */
interface StoneRow { id?: string; group_code: string; grade_id: string; display_name: string; unit: string; type_input: string; min_size: number|string; max_size: number|string; selling_price: number|string; base_price: number|string; mkup: number|string; full_name_vn?: string; full_name_en?: string }
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
function StoneMasterTab({ triggerAdd = 0, triggerSync = 0 }: { triggerAdd?: number; triggerSync?: number }) {
  const [rows, setRows] = useState<StoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<StoneRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState<Partial<StoneRow>>({})
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.group_code?.toLowerCase().includes(q) || r.grade_id?.toLowerCase().includes(q) || r.display_name?.toLowerCase().includes(q)
  })

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/master/stone')
      const d = await r.json()
      setRows(d.data || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (triggerAdd > 0) { setForm({ type_input: 'mm', unit: 'ct', mkup: 0, min_size: 0, max_size: 99 }); setFormError(''); setModal('add') } }, [triggerAdd])
  useEffect(() => { if (triggerSync > 0) { syncAll() } }, [triggerSync])

  function openAdd() { setForm({ type_input: 'mm', unit: 'ct', mkup: 0, min_size: 0, max_size: 99 }); setFormError(''); setModal('add') }
  function openEdit(r: StoneRow) { setEditRow(r); setForm({ ...r }); setFormError(''); setModal('edit') }
  function closeModal() { setModal(null); setEditRow(null) }

  async function handleSave() {
    if (!form.group_code || !form.grade_id) { setFormError('Group Code và Grade ID là bắt buộc'); return }
    setSaving(true); setFormError('')
    try {
      const body = modal === 'edit' && editRow ? { ...form, id: editRow.id } : form
      const r = await fetch('/api/master/stone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed'); return }
      closeModal(); showMsg('Saved & synced'); load()
    } finally { setSaving(false) }
  }

  async function handleDelete(row: StoneRow) {
    if (!window.confirm(`Xóa ${row.grade_id}?`)) return
    try {
      const r = await fetch(`/api/master/stone?gradeId=${encodeURIComponent(row.grade_id)}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Failed'); return }
      showMsg('Deleted & synced'); load()
    } catch { alert('Failed') }
  }

  async function syncAll() {
    setSyncing(true)
    try {
      await fetch('/api/master/sync', { method: 'POST' })
      showMsg('Sync complete')
    } finally { setSyncing(false) }
  }

  function showMsg(msg: string) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <input
          style={{ border: '1px solid var(--border-base)', borderRadius: 0, padding: '8px 12px', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box', background: 'var(--bg-surface)' }}
          placeholder="Search group code / grade ID / name..."
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
                      <span style={{ background: 'var(--text-primary)', color: 'var(--text-inverse)', padding: '2px 8px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>{r.group_code}</span>
                    </td>
                    <td style={tdc}>
                      <span style={{ color: '#2E8B8B', fontFamily: 'var(--font-mono)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'var(--text-xs)' }}>{r.grade_id}</span>
                    </td>
                    <td style={{ ...tdc, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name_vn}</td>
                    <td style={tdc}>{r.unit}</td>
                    <td style={tdc}>{r.type_input}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.min_size}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.max_size}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>${r.base_price}</td>
                    <td style={{ ...tdc, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{r.mkup}%</td>
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
          <select style={{ border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-surface)', padding: '3px 6px', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', outline: 'none' }}>
            <option>20 / page</option>
            <option>50 / page</option>
            <option>100 / page</option>
          </select>
          <button style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>‹</button>
          <button style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>›</button>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Stone Row' : `Edit: ${editRow?.grade_id}`} onClose={closeModal} width={560}>
          {formError && <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { lbl: 'Group Code *', key: 'group_code', type: 'text' },
              { lbl: 'Grade ID *', key: 'grade_id', type: 'text' },
              { lbl: 'Display Name', key: 'display_name', type: 'text' },
              { lbl: 'Unit', key: 'unit', type: 'select', opts: ['ct', 'mm'] },
              { lbl: 'Type Input', key: 'type_input', type: 'select', opts: ['mm', 'ct'] },
              { lbl: 'Min Size', key: 'min_size', type: 'number' },
              { lbl: 'Max Size', key: 'max_size', type: 'number' },
              { lbl: 'Base Price ($)', key: 'base_price', type: 'number' },
              { lbl: 'Markup %', key: 'mkup', type: 'number' },
              { lbl: 'Selling Price ($)', key: 'selling_price', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.lbl}</label>
                {f.type === 'select'
                  ? <select style={selS} value={String(form[f.key as keyof StoneRow] || '')} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      {f.opts?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  : <input type={f.type} style={inputU} value={String(form[f.key as keyof StoneRow] || '')} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />}
              </div>
            ))}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Vietnamese Name</label>
              <input style={inputU} value={form.full_name_vn || ''} onChange={e => setForm(p => ({ ...p, full_name_vn: e.target.value }))} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>English Name (Full)</label>
              <input style={inputU} value={form.full_name_en || ''} onChange={e => setForm(p => ({ ...p, full_name_en: e.target.value }))} />
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

  async function handleDelete(row: DMRow) {
    const key = isDef ? row.en_name : row.code
    if (!window.confirm(`Xóa "${key}"?`)) return
    try {
      const param = isDef ? `enName=${encodeURIComponent(key!)}` : `code=${encodeURIComponent(key!)}`
      const r = await fetch(`/api/master/dm/${activeSheet}?${param}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { alert(d.error || 'Failed'); return }
      showMsg('Deleted'); load(activeSheet)
    } catch { alert('Failed') }
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
  const stoneActionsRef = React.useRef<{ openAdd: () => void; syncAll: () => void } | null>(null)

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 4px' }}>MASTER DATA</p>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 4px' }}>Stone Data</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: '0.04em', margin: 0 }}>Stone catalog — auto-sync to Stone_Material</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em' }}>VI</button>
          <button className="btn-outline" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => stoneActionsRef.current?.syncAll()}>
            <i className="fa-solid fa-rotate" style={{ fontSize: 10 }} />Sync All
          </button>
          <button className="btn-outline" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => setActiveTab('dm')}>
            <i className="fa-solid fa-tags" style={{ fontSize: 10 }} />Categories
          </button>
          <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => stoneActionsRef.current?.openAdd()}>
            <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />+ Add New
          </button>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-base)', marginBottom: '1.5rem' }}>
        {[['stone', 'Stone Master', 'fa-layer-group'], ['dm', 'DM Categories', 'fa-list']] .map(([k, l, ic]) => (
          <button key={k} onClick={() => setActiveTab(k as any)}
            style={{ padding: '10px 20px', fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === k ? '2px solid var(--border-strong)' : '2px solid transparent', color: activeTab === k ? 'var(--text-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className={`fa-solid ${ic}`} style={{ fontSize: 10 }} />{l}
          </button>
        ))}
      </div>

      {activeTab === 'stone' ? <StoneMasterTab /> : <DMCategoriesTab />}
    </div>
  )
}
