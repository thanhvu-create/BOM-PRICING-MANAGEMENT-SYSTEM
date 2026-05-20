'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/shared/ToastContext'

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
  const { toast, update } = useToast()
  const [rows, setRows] = useState<GoldRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editRow, setEditRow] = useState<GoldRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  // Karat Cols management
  const [showKaratPanel, setShowKaratPanel] = useState(false)
  const [newKarat, setNewKarat] = useState('')
  const [karatWorking, setKaratWorking] = useState(false)

  // Auto Trigger panel
  const [showTriggerPanel, setShowTriggerPanel] = useState(false)
  const [triggerRunning, setTriggerRunning] = useState(false)
  const [recalcWorking, setRecalcWorking] = useState(false)
  const [triggerLF, setTriggerLF] = useState('1.06')
  const [triggerHour, setTriggerHour] = useState('8')
  const [savingConfig, setSavingConfig] = useState(false)
  const [triggerEnabled, setTriggerEnabled] = useState(true)
  const [triggerStatusLoading, setTriggerStatusLoading] = useState(false)
  const [togglingTrigger, setTogglingTrigger] = useState(false)

  // Confirm dialogs
  const [deleteGoldRow, setDeleteGoldRow] = useState<GoldRow | null>(null)
  const [removeKaratLabel, setRemoveKaratLabel] = useState<string | null>(null)

  // Form fields
  const [fDate, setFDate] = useState('')
  const [fGoldOz, setFGoldOz] = useState('')
  const [fPtOz, setFPtOz] = useState('')
  const [fAgOz, setFAgOz] = useState('')
  const [fLF, setFLF] = useState('1.06')
  const [fOverwrite, setFOverwrite] = useState(false)

  async function load() {
    setLoading(true); setError('')
    const tid = toast('Loading gold prices...', 'loading')
    try {
      const r = await fetch('/api/gold')
      const d = await r.json()
      setRows(d.data || [])
      update(tid, 'Gold prices loaded', 'success')
    } catch { update(tid, 'Failed to load gold prices', 'danger') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleFetchAmark() {
    setFetching(true)
    const tid = toast('Đang fetch giá vàng...', 'loading')
    try {
      const r = await fetch('/api/gold/fetch-amark')
      const d = await r.json()
      if (!d.success) throw new Error(d.message || 'Fetch failed')

      const { goldOz, ptOz, agOz, date, source } = d
      setFDate(date)
      setFGoldOz(String(goldOz))
      setFPtOz(String(ptOz))
      setFAgOz(String(agOz))
      setFOverwrite(false)
      setFormError('')
      setModal('add')
      update(tid, `Gold $${Number(goldOz).toFixed(2)}/oz (${source}) — kiểm tra rồi Save`, 'success')
    } catch (e: any) {
      update(tid, `❌ ${e.message}`, 'danger')
      setError(e.message)
    } finally {
      setFetching(false)
    }
  }

  function openAdd() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
    setFDate(today); setFGoldOz(''); setFPtOz(''); setFAgOz(''); setFLF('1.06'); setFOverwrite(false)
    setFormError(''); setModal('add')
  }

  function openEdit(r: GoldRow) {
    setEditRow(r)
    setFDate(r.price_date)
    setFGoldOz(String(r.amark_gold_oz))
    setFPtOz(String(r.amark_pt_oz))
    setFAgOz(String(r.amark_ag_oz))
    setFLF(String(r.loss_factor))
    setFOverwrite(true) // editing existing row always overwrites
    setFormError(''); setModal('edit')
  }

  function closeModal() { setModal(null); setEditRow(null) }

  async function handleSave() {
    if (!fDate) { setFormError('Date is required'); return }
    setFormError(''); setSaving(true)
    const tid = toast(`Saving gold price for ${fDate}...`, 'loading')
    try {
      const r = await fetch('/api/gold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: fDate, goldOz: fGoldOz, ptOz: fPtOz, agOz: fAgOz, lossFactor: fLF, overwriteIfSameDate: fOverwrite }),
      })
      const d = await r.json()
      if (!r.ok) { setFormError(d.error || 'Failed'); update(tid, d.error || 'Save failed', 'danger'); return }
      closeModal()
      update(tid, `Gold price ${fDate} saved`, 'success')
      load()
    } catch (e: any) { update(tid, e.message, 'danger') }
    finally { setSaving(false) }
  }

  function handleDelete(row: GoldRow) { setDeleteGoldRow(row) }

  async function doDeleteGold() {
    if (!deleteGoldRow) return
    const row = deleteGoldRow
    setDeleteGoldRow(null)
    const tid = toast(`Deleting ${row.price_date}...`, 'loading')
    try {
      const r = await fetch(`/api/gold?date=${row.price_date}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { update(tid, d.error || 'Delete failed', 'danger'); return }
      update(tid, `Deleted ${row.price_date}`, 'success')
      load()
    } catch { update(tid, 'Failed to delete', 'danger') }
  }

  // Helper: safely parse karat_prices from any row (handles corrupted data)
  function parseKaratPrices(raw: any): Record<string, number> {
    let kp = raw
    let attempts = 0
    while (typeof kp === 'string' && attempts < 3) {
      try { kp = JSON.parse(kp) } catch { break }
      attempts++
    }
    // Auto-heal corrupted string-object { "0": "{", "1": "\"", ... }
    if (kp && typeof kp === 'object' && kp['0'] === '{' && typeof kp['1'] === 'string') {
      let str = ''; let j = 0
      while (kp[String(j)] !== undefined) { str += kp[String(j)]; j++ }
      let parsed = false
      try { kp = JSON.parse(str); parsed = true } catch {
        try { kp = JSON.parse(str + '}'); parsed = true } catch {}
      }
      if (!parsed) kp = {}
    }
    if (typeof kp !== 'object' || kp === null) return {}
    // Filter out numeric index keys (corruption artifact)
    const result: Record<string, number> = {}
    for (const [k, v] of Object.entries(kp)) {
      if (!/^\d+$/.test(k)) result[k] = v as number
    }
    return result
  }

  // Derive active karat columns — union across ALL rows (so new cols appear immediately)
  let activeKarats = DEFAULT_KARATS
  if (rows.length > 0) {
    const allKeys = new Set<string>()
    for (const row of rows) {
      const kp = parseKaratPrices(row.karat_prices)
      Object.keys(kp).forEach(k => allKeys.add(k))
    }
    if (allKeys.size > 0) activeKarats = Array.from(allKeys)
    if (activeKarats.length === 0) activeKarats = DEFAULT_KARATS
  }
  
  activeKarats = activeKarats.sort((a, b) => {
    if (a === 'AG' && b !== 'AG') return -1
    if (b === 'AG' && a !== 'AG') return 1
    if (a === 'PT' && b !== 'PT') return -1
    if (b === 'PT' && a !== 'PT') return 1
    const na = parseInt(a) || 0
    const nb = parseInt(b) || 0
    return nb - na
  })

  async function handleAddKarat() {
    let label = newKarat.trim().toUpperCase()
    if (!label) return
    if (/^\d+$/.test(label)) label += 'K' // auto append K if they just type numbers
    setKaratWorking(true)
    const tid = toast(`Adding karat column ${label}...`, 'loading')
    try {
      const r = await fetch('/api/gold/karat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const d = await r.json()
      if (!r.ok) { update(tid, d.error || 'Failed', 'danger'); return }
      setNewKarat('')
      update(tid, `${label} column added`, 'success')
      load()
    } catch (e: any) { update(tid, e.message, 'danger') }
    finally { setKaratWorking(false) }
  }

  function handleRemoveKarat(label: string) { setRemoveKaratLabel(label) }

  async function doRemoveKarat() {
    if (!removeKaratLabel) return
    const label = removeKaratLabel
    setRemoveKaratLabel(null)
    setKaratWorking(true)
    const tid = toast(`Removing ${label} column...`, 'loading')
    try {
      const r = await fetch(`/api/gold/karat?label=${label}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { update(tid, d.error || 'Failed', 'danger'); return }
      update(tid, `${label} column removed`, 'success')
      load()
    } catch (e: any) { update(tid, e.message, 'danger') }
    finally { setKaratWorking(false) }
  }


  const OZ_TO_GRAM = 31.103

  // Pre-compute karat prices for modal preview (runs on every render = reactive)
  const _goldOz = parseFloat(fGoldOz) || 0
  const _ptOz   = parseFloat(fPtOz)   || 0
  const _agOz   = parseFloat(fAgOz)   || 0
  const _lf     = parseFloat(fLF)     || 1.06
  const hasInput = _goldOz > 0 || _ptOz > 0 || _agOz > 0

  const previewEntries: { label: string; value: string }[] = hasInput
    ? activeKarats.map(k => {
        let val = 0
        if (k === 'PT')      val = _ptOz   ? (_ptOz   / OZ_TO_GRAM) * _lf               : 0
        else if (k === 'AG') val = _agOz   ? (_agOz   / OZ_TO_GRAM) * _lf               : 0
        else { const n = parseInt(k); val = (_goldOz && n) ? (_goldOz / OZ_TO_GRAM) * (n / 24) * _lf : 0 }
        return { label: k, value: val ? '$' + val.toFixed(4) + ' /gr' : '—' }
      })
    : []

  return (
    <div>
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
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid var(--border-base)', borderRadius: 2, padding: '12px', width: 280, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {activeKarats.filter(k => k !== 'PT' && k !== 'AG').map(k => (
                    <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#947545', color: '#fff', padding: '3px 8px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                      {k}
                      <button onClick={() => handleRemoveKarat(k)} disabled={karatWorking}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, fontSize: 11, lineHeight: 1, opacity: 0.8 }}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch', height: 30 }}>
                  <span style={{ background: '#f5f5f5', border: '1px solid var(--border-base)', borderRight: 'none', padding: '0 8px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>Price_</span>
                  <input value={newKarat} onChange={e => setNewKarat(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddKarat()}
                    style={{ flex: 1, border: '1px solid var(--border-base)', borderLeft: 'none', borderRight: 'none', padding: '0 8px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', outline: 'none', minWidth: 0, textAlign: 'center' }} />
                  <span style={{ background: '#f5f5f5', border: '1px solid var(--border-base)', borderLeft: 'none', padding: '0 8px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>K_gr</span>
                  <button onClick={handleAddKarat} disabled={karatWorking || !newKarat}
                    style={{ background: '#E3B217', color: '#fff', border: 'none', padding: '0 12px', cursor: 'pointer', fontSize: 16, fontWeight: 'bold' }}>
                    +
                  </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'left' }}>
                  Enter karat → Add column. Click ✕ to delete.
                </div>
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={async () => {
              const next = !showTriggerPanel
              setShowTriggerPanel(next)
              if (next) {
                setTriggerStatusLoading(true)
                try {
                  const [cfgRes, statusRes] = await Promise.all([
                    fetch('/api/gold/trigger/config'),
                    fetch('/api/gold/trigger/status'),
                  ])
                  const cfg = await cfgRes.json()
                  const status = await statusRes.json()
                  if (cfg.success) { setTriggerLF(cfg.lf); setTriggerHour(cfg.hour) }
                  if (status.success) { setTriggerEnabled(status.data.enabled) }
                } catch {}
                finally { setTriggerStatusLoading(false) }
              }
            }} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 'var(--text-xs)' }}>
              <i className="fa-solid fa-clock" style={{ fontSize: 11 }} />Auto Trigger <i className="fa-solid fa-chevron-down" style={{ fontSize: 9 }} />
            </button>
            {showTriggerPanel && (() => {
              async function saveConfig() {
                setSavingConfig(true)
                const tid = toast('Saving config...', 'loading')
                try {
                  await fetch('/api/gold/trigger/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lf: triggerLF, hour: triggerHour }),
                  })
                  update(tid, 'Config saved', 'success')
                } catch (e: any) { update(tid, e.message, 'danger') }
                finally { setSavingConfig(false) }
              }

              async function toggleTrigger() {
                setTogglingTrigger(true)
                const next = !triggerEnabled
                const tid = toast(next ? 'Đang bật trigger...' : 'Đang tắt trigger...', 'loading')
                try {
                  const r = await fetch('/api/gold/trigger/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: next }),
                  })
                  const d = await r.json()
                  if (d.success || r.ok) {
                    setTriggerEnabled(next)
                    update(tid, next ? '● Trigger đã bật — sẽ tự chạy theo lịch' : '○ Trigger đã tắt', next ? 'success' : 'warning')
                  } else {
                    update(tid, d.error || 'Failed', 'danger')
                  }
                } catch (e: any) { update(tid, e.message, 'danger') }
                finally { setTogglingTrigger(false) }
              }

              return (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '1rem', width: 290, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>

                  {/* Status row + toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-light)' }}>
                    {triggerStatusLoading ? (
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10, color: 'var(--text-muted)' }} />
                    ) : (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: triggerEnabled ? '#2E8B8B' : '#9B4040', display: 'inline-block', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: triggerEnabled ? '#2E8B8B' : '#9B4040', flex: 1 }}>
                      {triggerEnabled ? '● Trigger Active' : '○ Trigger Tắt'}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {String(parseInt(triggerHour)).padStart(2,'0')}:00 VN
                    </span>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={toggleTrigger}
                    disabled={togglingTrigger || triggerStatusLoading}
                    style={{
                      width: '100%', border: `1px solid ${triggerEnabled ? '#9B4040' : '#2E8B8B'}`,
                      background: 'transparent', borderRadius: 2, padding: '6px 0',
                      fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase', cursor: (togglingTrigger || triggerStatusLoading) ? 'not-allowed' : 'pointer',
                      color: triggerEnabled ? '#9B4040' : '#2E8B8B',
                      opacity: (togglingTrigger || triggerStatusLoading) ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      marginBottom: 12,
                    }}>
                    <i className={`fa-solid ${togglingTrigger ? 'fa-circle-notch fa-spin' : triggerEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}`} style={{ fontSize: 11 }} />
                    {togglingTrigger ? 'Đang xử lý...' : triggerEnabled ? 'Tắt Trigger' : 'Bật Trigger'}
                  </button>

                  {/* Loss Factor */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Loss Factor (default 1.06)</label>
                    <div style={{ display: 'flex', gap: 0 }}>
                      <input type="number" value={triggerLF} onChange={e => setTriggerLF(e.target.value)} step="0.001" min="1"
                        style={{ flex: 1, border: '1px solid var(--border-base)', borderRight: 'none', padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', outline: 'none', borderRadius: '2px 0 0 2px' }} />
                      <button onClick={saveConfig} disabled={savingConfig}
                        style={{ background: savingConfig ? '#ccc' : '#947545', color: '#fff', border: 'none', padding: '0 10px', cursor: 'pointer', borderRadius: '0 2px 2px 0' }}>
                        <i className={`fa-solid ${savingConfig ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} style={{ fontSize: 11 }} />
                      </button>
                    </div>
                  </div>

                  {/* Hour selector */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Giờ chạy tự động (VN)</label>
                    <div style={{ display: 'flex', gap: 0 }}>
                      <select value={triggerHour} onChange={e => setTriggerHour(e.target.value)}
                        style={{ flex: 1, border: '1px solid var(--border-base)', borderRight: 'none', padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', outline: 'none', background: 'var(--bg-surface)', borderRadius: '2px 0 0 2px' }}>
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={String(i)}>{String(i).padStart(2,'0')}:00</option>
                        ))}
                      </select>
                      <button onClick={saveConfig} disabled={savingConfig}
                        style={{ background: savingConfig ? '#ccc' : '#947545', color: '#fff', border: 'none', padding: '0 10px', cursor: 'pointer', borderRadius: '0 2px 2px 0' }}>
                        <i className={`fa-solid ${savingConfig ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} style={{ fontSize: 11 }} />
                      </button>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Vercel Cron: chỉnh trong <code>vercel.json</code></p>
                  </div>

                  {/* Run Now — scrape amark.com từ browser (browser IP không bị Cloudflare block như Vercel server) */}
                  <button
                    onClick={async () => {
                      setTriggerRunning(true)
                      const tid = toast('Đang fetch Amark.com...', 'loading')
                      try {
                        const { goldOz, ptOz, agOz } = await scrapeAmarkBrowser()
                        const save = await fetch('/api/gold/trigger/run', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ goldOz, ptOz, agOz, lf: triggerLF }),
                        })
                        const sd = await save.json()
                        if (sd.success) {
                          update(tid, `✓ Amark.com — Gold $${goldOz.toFixed(2)}/oz đã lưu`, 'success')
                          load(); setShowTriggerPanel(false)
                        } else {
                          update(tid, `❌ Save failed: ${sd.error}`, 'danger')
                        }
                      } catch (e: any) { update(tid, `❌ ${e.message}`, 'danger') }
                      finally { setTriggerRunning(false) }
                    }}
                    disabled={triggerRunning}
                    style={{ width: '100%', background: '#1A1814', color: '#fff', border: 'none', borderRadius: 2, padding: '7px 0', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: triggerRunning ? 'not-allowed' : 'pointer', opacity: triggerRunning ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                    <i className={`fa-solid ${triggerRunning ? 'fa-circle-notch fa-spin' : 'fa-play'}`} style={{ fontSize: 10 }} />
                    {triggerRunning ? 'Fetching Amark...' : 'Run Now (Fetch & Save)'}
                  </button>

                  {/* Recalc All */}
                  <button
                    onClick={async () => {
                      setRecalcWorking(true)
                      const tid = toast('Recalculating all karat prices...', 'loading')
                      try {
                        const r = await fetch('/api/gold/fix')
                        const d = await r.json()
                        if (d.success) { update(tid, d.message, 'success'); load(); setShowTriggerPanel(false) }
                        else update(tid, d.error || 'Recalc failed', 'danger')
                      } catch (e: any) { update(tid, e.message, 'danger') }
                      finally { setRecalcWorking(false) }
                    }}
                    disabled={recalcWorking}
                    style={{ width: '100%', background: '#2E8B8B', color: '#fff', border: 'none', borderRadius: 2, padding: '7px 0', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: recalcWorking ? 'not-allowed' : 'pointer', opacity: recalcWorking ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <i className={`fa-solid ${recalcWorking ? 'fa-circle-notch fa-spin' : 'fa-calculator'}`} style={{ fontSize: 10 }} />
                    {recalcWorking ? 'Recalculating...' : 'Recalc All Prices'}
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      </div>


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
                {[
                  { key: '#', label: '#' },
                  { key: 'date', label: 'Ngày' },
                  { key: 'gold', label: 'Gold ASK (oz)' },
                  { key: 'pt', label: 'PT ASK (oz)' },
                  { key: 'ag', label: 'AG ASK (oz)' },
                  { key: 'lf', label: 'Loss Factor' },
                  ...activeKarats.map(k => ({ key: k, label: k === 'PT' ? 'PT ($/gr)' : k === 'AG' ? 'AG ($/gr)' : `${k} ($/gr)` })),
                  { key: 'actions', label: 'Actions' },
                ].map(h => (
                  <th key={h.key} style={th}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6 + activeKarats.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Loading...
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6 + activeKarats.length + 1} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data</td></tr>
              ) : rows.map((r, i) => {
                const kp = parseKaratPrices(r.karat_prices)
                return (
                <tr key={r.price_date}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--text-primary)' }}>{r.price_date}</td>
                  <td style={{ ...td, color: '#B8860B' }}>{Number(r.amark_gold_oz).toFixed(3)}</td>
                  <td style={td}>{Number(r.amark_pt_oz).toFixed(3)}</td>
                  <td style={td}>{Number(r.amark_ag_oz).toFixed(3)}</td>
                  <td style={{ ...td, color: '#2E8B8B' }}>{r.loss_factor}</td>
                  {activeKarats.map(k => (
                    <td key={k} style={{ ...td, color: '#2E8B8B' }}>
                      {kp?.[k] != null ? Number(kp[k]).toFixed(3) : '—'}
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
                )
              })}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: '#fff', borderRadius: 8, width: '100%', maxWidth: 760, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ background: '#F5F1EC', padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E0D6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-solid fa-coins" style={{ color: '#947545', fontSize: 18 }} />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 400, margin: 0, color: '#2C2A27' }}>
                  {modal === 'add' ? 'Add Gold Price Manually' : `Edit Gold Price — ${editRow?.price_date}`}
                </h3>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '1.5rem 1.75rem' }}>
              {formError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '8px 12px', marginBottom: '1rem', color: '#B91C1C', fontSize: 'var(--text-sm)' }}>
                  {formError}
                </div>
              )}

              {/* Row 1: Date + Loss Factor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Date *</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} readOnly={modal === 'edit'}
                    style={{ width: '100%', border: '1px solid #D1C9BE', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#2C2A27', outline: 'none', boxSizing: 'border-box', background: modal === 'edit' ? '#F9F7F5' : '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Loss Factor</label>
                  <input type="number" value={fLF} onChange={e => setFLF(e.target.value)} step="0.001" min="1"
                    style={{ width: '100%', border: '1px solid #D1C9BE', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#2C2A27', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Section: Amark Price */}
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Amark Price (USD/oz)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Gold (oz) *</label>
                    <input type="number" value={fGoldOz} onChange={e => setFGoldOz(e.target.value)} placeholder="0.00" step="0.01"
                      style={{ width: '100%', border: '1px solid #D1C9BE', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#2C2A27', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Platinum (oz)</label>
                    <input type="number" value={fPtOz} onChange={e => setFPtOz(e.target.value)} placeholder="0.00" step="0.01"
                      style={{ width: '100%', border: '1px solid #D1C9BE', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#2C2A27', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Silver (oz)</label>
                    <input type="number" value={fAgOz} onChange={e => setFAgOz(e.target.value)} placeholder="0.00" step="0.01"
                      style={{ width: '100%', border: '1px solid #D1C9BE', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#2C2A27', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Section: Auto-Calculated */}
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Auto-Calculated (USD/gram)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {previewEntries.map(({ label, value }) => {
                    const formula = label === 'AG'
                      ? 'Ag_oz / 31.103 × LF'
                      : label === 'PT'
                      ? 'PT_oz / 31.103 × LF'
                      : `Gold_oz / 31.103 × (${parseInt(label)}/24) × LF`
                    const numVal = value === '—' ? '0.000' : value.replace('$', '').replace(' /gr', '')
                    return (
                      <div key={label}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#2E8B8B', marginBottom: 4 }}>
                          {label === 'AG' ? 'SILVER' : label === 'PT' ? 'PLATINUM' : label} /GR
                        </div>
                        <input readOnly value={numVal}
                          style={{ width: '100%', border: '1px solid #D1C9BE', borderRadius: 4, padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#2C2A27', background: '#F9F7F5', boxSizing: 'border-box', outline: 'none' }} />
                        <div style={{ fontSize: 10, color: '#AAA', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{formula}</div>
                      </div>
                    )
                  })}
                  {previewEntries.length === 0 && activeKarats.map(k => {
                    const formula = k === 'AG' ? 'Ag_oz / 31.103 × LF' : k === 'PT' ? 'PT_oz / 31.103 × LF' : `Gold_oz / 31.103 × (${parseInt(k)}/24) × LF`
                    return (
                      <div key={k}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#2E8B8B', marginBottom: 4 }}>
                          {k === 'AG' ? 'SILVER' : k === 'PT' ? 'PLATINUM' : k} /GR
                        </div>
                        <input readOnly value="0.000"
                          style={{ width: '100%', border: '1px solid #D1C9BE', borderRadius: 4, padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#2C2A27', background: '#F9F7F5', boxSizing: 'border-box', outline: 'none' }} />
                        <div style={{ fontSize: 10, color: '#AAA', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{formula}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Overwrite checkbox */}
              {modal === 'add' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <input type="checkbox" id="gm_overwrite" checked={fOverwrite} onChange={e => setFOverwrite(e.target.checked)}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#947545' }} />
                  <label htmlFor="gm_overwrite" style={{ fontSize: 'var(--text-xs)', color: '#888', cursor: 'pointer' }}>
                    Ghi đè nếu đã có ngày này
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ background: '#F5F1EC', padding: '1rem 1.75rem', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #E8E0D6' }}>
              <button onClick={closeModal}
                style={{ background: '#fff', border: '1px solid #D1C9BE', borderRadius: 4, padding: '9px 22px', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ background: '#1A1814', border: '1px solid #1A1814', borderRadius: 4, padding: '9px 22px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <><i className="fa-solid fa-circle-notch fa-spin" />Saving...</> : <><i className="fa-solid fa-floppy-disk" />Save</>}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* DELETE GOLD ROW CONFIRM */}
      {deleteGoldRow && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 380, padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: '0 0 0.75rem' }}>Xác nhận xóa</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
              Xóa dòng giá ngày <strong>{deleteGoldRow.price_date}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteGoldRow(null)} className="btn-outline" style={{ padding: '8px 18px' }}>Hủy</button>
              <button onClick={doDeleteGold} style={{ padding: '8px 18px', background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVE KARAT COLUMN CONFIRM */}
      {removeKaratLabel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: 380, padding: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: '0 0 0.75rem' }}>Xóa cột Karat</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 1.25rem' }}>
              Xóa cột <strong>{removeKaratLabel}</strong> khỏi tất cả dòng? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setRemoveKaratLabel(null)} className="btn-outline" style={{ padding: '8px 18px' }}>Hủy</button>
              <button onClick={doRemoveKarat} style={{ padding: '8px 18px', background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
