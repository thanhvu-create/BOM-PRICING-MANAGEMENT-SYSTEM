'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/components/shared/UserContext'

/* ── TYPES ─────────────────────────────────────────────────── */
interface Dropdowns {
  productTypes: string[]
  priceListTypes: string[]
  spTypes: string[]
  goldTypes: string[]
  colors: string[]
  stoneGroupCodes: string[]
  salesPersonNames: string[]
  storeNames: string[]
}
interface GoldRow  { id: number; goldType: string; color: string; weight: string; pricePerGr: number; cost: number }
interface StoneRow { id: number; groupCode: string; size: string; ctw1pc: string; qty: string; tlHot: number; gradeId: string; giaBan: number; inputType: string }
interface PricingData {
  costGold: number; costStones: number; costLabor: number
  costSubtotal: number; costCif: number; costTotal: number; sellPrice: number
}

/* ── HELPERS ───────────────────────────────────────────────── */
let _rowId = 0
function nextId() { return ++_rowId }
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) }
function fmt$(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function newGold(): GoldRow  { return { id: nextId(), goldType: '18K', color: 'Yellow', weight: '', pricePerGr: 0, cost: 0 } }
function newStone(): StoneRow { return { id: nextId(), groupCode: '', size: '', ctw1pc: '', qty: '', tlHot: 0, gradeId: '', giaBan: 0, inputType: 'mm' } }

/* ── STYLE CONSTANTS ───────────────────────────────────────── */
const inputUnder: React.CSSProperties = {
  width: '100%', border: 'none', borderBottom: '1px solid var(--border-base)',
  background: 'transparent', padding: '6px 0',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const selectBox: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border-base)', borderRadius: 0,
  background: 'var(--bg-surface)', padding: '5px 8px',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 'var(--text-xs)', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 4,
}
const thStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--text-secondary)', fontWeight: 500,
  padding: '8px 6px', borderBottom: '1px solid var(--border-base)',
  background: 'var(--bg-base)', textAlign: 'left', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = { padding: '4px 4px', borderBottom: '1px solid var(--border-light)', verticalAlign: 'middle' }
const tdInput: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border-base)', borderRadius: 0,
  background: 'var(--bg-surface)', padding: '4px 6px',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const card: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4 }

/* ── COMPONENT ─────────────────────────────────────────────── */
export default function TinhGiaPage() {
  const { role, store: userStore } = useUser()
  const isAdmin    = role === 'Admin'
  const isManager  = role === 'Manager'
  const canSeeAll  = isAdmin || isManager

  const [step, setStep] = useState(1)
  const [dropdowns, setDropdowns] = useState<Dropdowns | null>(null)
  const [vndRate, setVndRate] = useState(0)
  const [loadingDD, setLoadingDD] = useState(true)
  const [showStoneTypes, setShowStoneTypes] = useState(false)
  const [stoneTypeList, setStoneTypeList] = useState<Array<{ code: string; viName: string; enName: string }>>([])
  const [stoneTypeSearch, setStoneTypeSearch] = useState('')
  const [stoneTypeLoading, setStoneTypeLoading] = useState(false)

  // Step 1 — Header
  const [date, setDate] = useState(today)
  const [productType, setProductType] = useState('')
  const [soMo, setSoMo] = useState('')
  const [model, setModel] = useState('')
  const [priceListType, setPriceListType] = useState('')
  const [spType, setSpType] = useState('Basic')
  const [laborHours, setLaborHours] = useState('0')
  const [salesPerson, setSalesPerson] = useState('')
  const [store, setStore] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [img1, setImg1] = useState('')
  const [img2, setImg2] = useState('')
  const [img3, setImg3] = useState('')
  const [folderUrl, setFolderUrl] = useState('')

  // Step 2 — Gold
  const [goldRows, setGoldRows] = useState<GoldRow[]>([newGold()])

  // Step 3 — Stones
  const [stoneRows, setStoneRows] = useState<StoneRow[]>([newStone()])

  // Step 4 — Results
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedBomId, setSavedBomId] = useState('')
  const [saveError, setSaveError] = useState('')

  // Lookup debounce timers
  const lookupTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  /* ── Load dropdowns ── */
  useEffect(() => {
    const storeParam = (canSeeAll || !userStore) ? '' : `?store=${userStore}`
    Promise.all([
      fetch(`/api/bom/dropdowns${storeParam}`).then(r => r.json()),
      fetch('/api/config?key=VND_RATE').then(r => r.json()),
    ]).then(([dd, cfg]) => {
      setDropdowns(dd)
      if (dd.productTypes?.[0])   setProductType(dd.productTypes[0])
      if (dd.priceListTypes?.[0]) setPriceListType(dd.priceListTypes[0])
      if (cfg.rate) setVndRate(Number(cfg.rate))
    }).catch(console.error).finally(() => setLoadingDD(false))
  }, [canSeeAll, userStore])

  /* ── Fetch gold price ── */
  const fetchGoldPrice = useCallback(async (rowId: number, goldDate: string, goldType: string) => {
    if (!goldDate || !goldType) return
    try {
      const r = await fetch(`/api/bom/gold-price?date=${goldDate}&goldType=${goldType}`)
      const d = await r.json()
      if (d.pricePerGr != null) {
        setGoldRows(rows => rows.map(row => {
          if (row.id !== rowId) return row
          const w = parseFloat(row.weight) || 0
          return { ...row, pricePerGr: d.pricePerGr, cost: d.pricePerGr * w }
        }))
      }
    } catch { }
  }, [])

  /* ── Stone lookup ── */
  const lookupStone = useCallback(async (rowId: number, groupCode: string, size: string, ctw1pc: string) => {
    if (!groupCode) return
    const sizeVal = parseFloat(size) || 0
    const ctwVal  = parseFloat(ctw1pc) || 0
    if (sizeVal === 0 && ctwVal === 0) return
    try {
      const r = await fetch(`/api/master/lookup?groupCode=${encodeURIComponent(groupCode)}&size=${sizeVal}&ctw=${ctwVal}`)
      const d = await r.json()
      if (d.success) {
        setStoneRows(rows => rows.map(row => {
          if (row.id !== rowId) return row
          const ctw  = parseFloat(row.ctw1pc) || 0
          const qty  = parseFloat(row.qty) || 0
          const tlHot = ctw * qty
          return {
            ...row,
            gradeId:   d.grade_id    || '',
            inputType: d.type_input  || 'mm',
            giaBan:    (d.selling_price || 0) * tlHot,
          }
        }))
      }
    } catch { }
  }, [])

  function scheduleLookup(rowId: number, groupCode: string, size: string, ctw1pc: string) {
    if (lookupTimers.current[rowId]) clearTimeout(lookupTimers.current[rowId])
    lookupTimers.current[rowId] = setTimeout(() => lookupStone(rowId, groupCode, size, ctw1pc), 400)
  }

  /* ── Gold row handlers ── */
  function updateGold(id: number, field: keyof GoldRow, val: string) {
    setGoldRows(rows => rows.map(r => {
      if (r.id !== id) return r
      const updated: GoldRow = { ...r, [field]: val }
      if (field === 'weight') updated.cost = updated.pricePerGr * (parseFloat(val) || 0)
      if (field === 'goldType') fetchGoldPrice(id, date, val)
      return updated
    }))
  }
  function addGoldRow()         { setGoldRows(r => [...r, newGold()]) }
  function removeGoldRow(id: number) { setGoldRows(r => r.filter(x => x.id !== id)) }

  /* ── Stone row handlers ── */
  function updateStone(id: number, field: keyof StoneRow, val: string) {
    setStoneRows(rows => rows.map(r => {
      if (r.id !== id) return r
      const updated: StoneRow = { ...r, [field]: val }
      if (field === 'ctw1pc' || field === 'qty') {
        const ctw = parseFloat(field === 'ctw1pc' ? val : r.ctw1pc) || 0
        const qty = parseFloat(field === 'qty'   ? val : r.qty)    || 0
        updated.tlHot  = ctw * qty
        updated.giaBan = 0 // reset until re-lookup
      }
      // Trigger lookup when groupCode/size/ctw changes
      if (field === 'groupCode' || field === 'size' || field === 'ctw1pc') {
        const gc  = field === 'groupCode' ? val : r.groupCode
        const sz  = field === 'size'  ? val : r.size
        const ctw = field === 'ctw1pc' ? val : r.ctw1pc
        scheduleLookup(id, gc, sz, ctw)
      }
      // After qty change, recalculate giaBan using existing grade price
      if (field === 'qty' && r.gradeId) {
        scheduleLookup(id, r.groupCode, r.size, r.ctw1pc)
      }
      return updated
    }))
  }
  function addStoneRow()          { setStoneRows(r => [...r, newStone()]) }
  function removeStoneRow(id: number) { setStoneRows(r => r.filter(x => x.id !== id)) }

  /* ── Build payload ── */
  function buildPayload() {
    const validGolds = goldRows
      .filter(r => r.goldType && (parseFloat(r.weight) || 0) > 0)
      .map(r => ({ goldType: r.goldType, color: r.color, weight: parseFloat(r.weight) || 0 }))

    const validStones = stoneRows
      .filter(r => r.groupCode && ((parseFloat(r.ctw1pc) || 0) > 0 || (parseFloat(r.qty) || 0) > 0))
      .map(r => ({
        groupCode: r.groupCode, gradeId: r.gradeId,
        size: r.size, ctw1pc: parseFloat(r.ctw1pc) || 0,
        qty: parseFloat(r.qty) || 0,
        tlHot: (parseFloat(r.ctw1pc) || 0) * (parseFloat(r.qty) || 0),
        inputType: r.inputType as 'mm' | 'ct',
        giaBan: r.giaBan,
      }))

    return {
      header: {
        date, productType, soMo, model, priceListType, spType,
        laborHours: parseFloat(laborHours) || 0,
        salesPerson, store, customerName, note,
        img1, img2, img3, folderUrl,
      },
      golds: validGolds,
      stones: validStones,
    }
  }

  /* ── Calculate ── */
  async function calculate() {
    setCalcError(''); setCalculating(true)
    try {
      const payload = buildPayload()
      if (payload.golds.length === 0) { setCalcError('Cần ít nhất 1 dòng vàng hợp lệ'); setCalculating(false); return }
      const r = await fetch('/api/bom/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await r.json()
      if (!r.ok || !d.data) { setCalcError(d.error || d.message || 'Calculation failed'); return }
      setPricing(d.data)
    } catch (e: any) { setCalcError(e.message) } finally { setCalculating(false) }
  }

  /* ── Save BOM ── */
  async function saveBOM() {
    if (!pricing) return
    setSaveError(''); setSaving(true)
    try {
      const pct = parseFloat(discountPct) || 0
      const r = await fetch('/api/bom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), discountPct: pct }),
      })
      const d = await r.json()
      if (!r.ok) { setSaveError(d.error || 'Save failed'); return }
      setSavedBomId(d.data?.bom_id || 'Saved')
    } catch (e: any) { setSaveError(e.message) } finally { setSaving(false) }
  }

  /* ── Reset ── */
  function resetAll() {
    if (!confirm('Xóa toàn bộ dữ liệu đã nhập?')) return
    setStep(1); setDate(today()); setProductType(dropdowns?.productTypes?.[0] || '')
    setSoMo(''); setModel(''); setPriceListType(dropdowns?.priceListTypes?.[0] || '')
    setSpType('Basic'); setLaborHours('0')
    setSalesPerson(''); setStore(''); setCustomerName(''); setNote('')
    setImg1(''); setImg2(''); setImg3(''); setFolderUrl('')
    setGoldRows([newGold()]); setStoneRows([newStone()])
    setPricing(null); setDiscountPct(''); setSavedBomId(''); setSaveError('')
  }

  /* ── Date change → re-fetch gold prices ── */
  function onDateChange(val: string) {
    setDate(val)
    goldRows.forEach(r => fetchGoldPrice(r.id, val, r.goldType))
  }

  /* ── Step nav validation ── */
  function canGoNext() {
    if (step === 1) return !!date && !!soMo && !!priceListType
    if (step === 2) return goldRows.some(r => r.goldType && parseFloat(r.weight) > 0)
    return true
  }

  /* ── Stone Type List ── */
  async function openStoneTypeList() {
    setShowStoneTypes(true)
    if (stoneTypeList.length > 0) return
    setStoneTypeLoading(true)
    try {
      const r = await fetch('/api/master/stone?dedup=1')
      const d = await r.json()
      const rows = (d.data || []).reduce((acc: any[], row: any) => {
        if (!acc.find((x: any) => x.code === row.group_code)) {
          acc.push({ code: row.group_code, viName: row.full_name_vi || '', enName: row.full_name_en || '' })
        }
        return acc
      }, [])
      setStoneTypeList(rows)
    } catch { } finally { setStoneTypeLoading(false) }
  }

  const filteredStoneTypes = stoneTypeList.filter(s => {
    const q = stoneTypeSearch.toLowerCase()
    return !q || s.code.toLowerCase().includes(q) || s.viName.toLowerCase().includes(q) || s.enName.toLowerCase().includes(q)
  })

  /* ── Discount calc ── */
  const discountedPrice = pricing && parseFloat(discountPct) > 0
    ? pricing.sellPrice * (1 - parseFloat(discountPct) / 100)
    : null
  const isVNStore = String(store || '').toUpperCase().startsWith('VN')
  const vndEst = pricing && vndRate > 0
    ? Math.ceil((discountedPrice ?? pricing.sellPrice) * vndRate / 100000) * 100000
    : null

  /* ── SAVED STATE ── */
  if (savedBomId) return (
    <div className="fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <i className="fa-solid fa-circle-check" style={{ fontSize: 48, color: 'var(--color-success)', marginBottom: '1rem', display: 'block' }} />
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 400, marginBottom: 8 }}>BOM Đã Lưu</h2>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', marginBottom: '2rem' }}>{savedBomId}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={resetAll} className="btn-primary" style={{ padding: '10px 24px' }}>
          <i className="fa-solid fa-plus" style={{ marginRight: 8, fontSize: 11 }} />BOM Mới
        </button>
        <a href="/dashboard/review" className="btn-outline" style={{ padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 11 }} />Lịch Sử
        </a>
      </div>
    </div>
  )

  if (loadingDD) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', padding: '3rem 0' }}>
      <i className="fa-solid fa-circle-notch fa-spin" />
      <span style={{ fontSize: 'var(--text-sm)' }}>Đang tải dữ liệu...</span>
    </div>
  )

  const steps = [
    { label: '1. INFO (HEADER)', icon: 'fa-regular fa-file' },
    { label: '2. GOLD',          icon: 'fa-solid fa-coins' },
    { label: '3. STONES',        icon: 'fa-solid fa-gem' },
    { label: '4. SUMMARY',       icon: 'fa-solid fa-calculator' },
  ]

  return (
    <div className="fade-in">
      {/* Step indicator bar + RESET button */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: '1.5rem', border: '1px solid var(--border-base)', background: 'var(--bg-base)' }}>
        {steps.map((s, i) => {
          const isActive   = step === i + 1
          const isComplete = i < step - 1
          return (
            <button key={i}
              onClick={() => isComplete && setStep(i + 1)}
              style={{
                flex: 1, padding: '0.75rem 0.5rem',
                fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 500,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: isActive ? 'var(--text-primary)' : isComplete ? 'var(--color-success)' : 'var(--text-muted)',
                border: 'none',
                borderRight: i < steps.length - 1 ? '1px solid var(--border-base)' : 'none',
                outline: isActive ? '2px solid var(--border-strong)' : 'none',
                outlineOffset: -2,
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                cursor: isComplete ? 'pointer' : 'default',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              {isComplete
                ? <i className="fa-solid fa-check" style={{ fontSize: 10 }} />
                : <i className={s.icon} style={{ fontSize: 10 }} />}
              {s.label}
            </button>
          )
        })}
        {/* RESET button pinned to right */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderLeft: '1px solid var(--border-base)' }}>
          <button onClick={resetAll}
            style={{
              border: '1px solid var(--color-danger)', color: 'var(--color-danger)',
              background: 'transparent', padding: '6px 16px', borderRadius: 0,
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            <i className="fa-solid fa-trash-can" style={{ fontSize: 10 }} />RESET
          </button>
        </div>
      </div>

      {/* ── STEP 1: HEADER ── */}
      {step === 1 && (
        <div style={card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-regular fa-file" style={{ color: 'var(--text-secondary)', fontSize: 13 }} />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>BOM Info (Header)</p>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {/* Row 1: DATE | PRODUCT TYPE | CUSTOMER NAME | SO/MO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>
                  DATE <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input type="date" style={inputUnder} value={date} onChange={e => onDateChange(e.target.value)} />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>
                  PRODUCT TYPE <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select style={selectBox} value={productType} onChange={e => setProductType(e.target.value)}>
                  <option value="">— Chọn —</option>
                  {dropdowns?.productTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>CUSTOMER NAME</label>
                <input style={inputUnder} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tên khách hàng" />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>
                  SO / MO <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input style={inputUnder} value={soMo} onChange={e => setSoMo(e.target.value)} placeholder="Số SO hoặc MO" />
              </div>
            </div>
            {/* Row 2: MODEL NUMBER | PRICE LIST TYPE | SALESPERSON | STORE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>MODEL NUMBER</label>
                <input style={inputUnder} value={model} onChange={e => setModel(e.target.value)} placeholder="Model" />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>
                  PRICE LIST TYPE <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select style={selectBox} value={priceListType} onChange={e => setPriceListType(e.target.value)}>
                  <option value="">— Chọn —</option>
                  {dropdowns?.priceListTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>SALESPERSON</label>
                <select style={selectBox} value={salesPerson} onChange={e => setSalesPerson(e.target.value)}>
                  <option value="">— None —</option>
                  {dropdowns?.salesPersonNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>STORE</label>
                <select style={selectBox} value={store} onChange={e => setStore(e.target.value)}>
                  <option value="">— None —</option>
                  {[...new Set(dropdowns?.storeNames ?? [])].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {/* Row 3: IMAGE 1 | IMAGE 2 | IMAGE 3 | FOLDER URL */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>IMAGE 1 URL</label>
                <input style={inputUnder} value={img1} onChange={e => setImg1(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>IMAGE 2 URL</label>
                <input style={inputUnder} value={img2} onChange={e => setImg2(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>IMAGE 3 URL</label>
                <input style={inputUnder} value={img3} onChange={e => setImg3(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>FOLDER URL</label>
                <input style={inputUnder} value={folderUrl} onChange={e => setFolderUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            {/* Row 4: NOTE (full width) */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>NOTE</label>
              <textarea style={{ ...inputUnder, resize: 'vertical', minHeight: 56 }} value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú..." />
            </div>
            {(!date || !soMo || !priceListType) && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: '0.5rem' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                Bắt buộc: Date, SO/MO, Price List Type
              </p>
            )}
          </div>
          <StepNav canNext={canGoNext()} onNext={() => setStep(2)} />
        </div>
      )}

      {/* ── STEP 2: GOLD ── */}
      {step === 2 && (
        <div style={card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-coins" style={{ color: 'var(--text-secondary)', fontSize: 14 }} />Gold Materials
            </p>
            <button onClick={addGoldRow} className="btn-outline" style={{ padding: '5px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />Thêm dòng
            </button>
          </div>
          <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 550 }}>
              <thead>
                <tr>{['#', 'Loại Vàng', 'Màu', 'Trọng Lượng (gr)', 'Giá/gr', 'Thành Tiền', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {goldRows.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, width: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, width: 100 }}>
                      <select style={tdInput} value={r.goldType} onChange={e => updateGold(r.id, 'goldType', e.target.value)}>
                        {(dropdowns?.goldTypes || ['10K','14K','18K','20K','22K','24K','PT','AG']).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, width: 120 }}>
                      <select style={tdInput} value={r.color} onChange={e => updateGold(r.id, 'color', e.target.value)}>
                        {(dropdowns?.colors || ['Yellow','White','Rose','Platinum']).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, width: 140 }}>
                      <input type="number" style={tdInput} value={r.weight} min="0" step="0.01" placeholder="0.00"
                        onChange={e => updateGold(r.id, 'weight', e.target.value)} />
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right', paddingRight: 8 }}>
                      {r.pricePerGr > 0 ? fmt$(r.pricePerGr) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'right', paddingRight: 8 }}>
                      {r.cost > 0 ? fmt$(r.cost) : '—'}
                    </td>
                    <td style={{ ...tdStyle, width: 36, textAlign: 'center' }}>
                      {goldRows.length > 1 && (
                        <button onClick={() => removeGoldRow(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: 13 }}>
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <StepNav canNext={canGoNext()} onPrev={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {/* ── STEP 3: STONES ── */}
      {step === 3 && (
        <div style={card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-gem" style={{ color: 'var(--text-secondary)', fontSize: 13 }} />Stone Materials
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openStoneTypeList} className="btn-outline" style={{ padding: '5px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fa-regular fa-gem" style={{ fontSize: 10 }} />Stone Types
              </button>
              <button onClick={addStoneRow} className="btn-outline" style={{ padding: '5px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />Thêm dòng
              </button>
            </div>
          </div>
          <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 8 }}>
              Để trống nếu chỉ tính vàng. Group Code tự động tra giá khi nhập.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr>{['#', 'Group Code', 'MM Size', 'CTW/pc', 'Qty', 'TL Hột', 'Grade', 'Giá', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {stoneRows.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, width: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, minWidth: 130 }}>
                      <select style={tdInput} value={r.groupCode}
                        onChange={e => updateStone(r.id, 'groupCode', e.target.value)}>
                        <option value="">— Select —</option>
                        {dropdowns?.stoneGroupCodes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, width: 80 }}>
                      <input type="number" style={tdInput} value={r.size} min="0" step="0.01" placeholder="0.00"
                        onChange={e => updateStone(r.id, 'size', e.target.value)} />
                    </td>
                    <td style={{ ...tdStyle, width: 90 }}>
                      <input type="number" style={tdInput} value={r.ctw1pc} min="0" step="0.001" placeholder="0.000"
                        onChange={e => updateStone(r.id, 'ctw1pc', e.target.value)} />
                    </td>
                    <td style={{ ...tdStyle, width: 70 }}>
                      <input type="number" style={tdInput} value={r.qty} min="0" step="1" placeholder="0"
                        onChange={e => updateStone(r.id, 'qty', e.target.value)} />
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textAlign: 'right', paddingRight: 6 }}>
                      {r.tlHot > 0 ? r.tlHot.toFixed(3) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: r.gradeId ? 'var(--color-success)' : 'var(--text-muted)', paddingRight: 6 }}>
                      {r.gradeId || '—'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textAlign: 'right', paddingRight: 6 }}>
                      {r.giaBan > 0 ? fmt$(r.giaBan) : '—'}
                    </td>
                    <td style={{ ...tdStyle, width: 36, textAlign: 'center' }}>
                      {stoneRows.length > 1 && (
                        <button onClick={() => removeStoneRow(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: 13 }}>
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <StepNav canNext={true} onPrev={() => setStep(2)} onNext={() => { setStep(4); calculate() }} nextLabel="Tính Giá →" />
        </div>
      )}

      {/* ── STEP 4: BÁO GIÁ ── */}
      {step === 4 && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', alignItems: 'center' }}>
            <button onClick={calculate} className="btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }} disabled={calculating}>
              {calculating ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 11 }} />Đang tính...</> : <><i className="fa-solid fa-calculator" style={{ fontSize: 11 }} />Tính lại</>}
            </button>
            <button onClick={() => setStep(3)} className="btn-outline" style={{ padding: '9px 20px' }}>← Hột Đá</button>
          </div>

          {calcError && (
            <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '10px 14px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />{calcError}
            </div>
          )}

          {calculating && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, marginBottom: 12, display: 'block' }} />
              <span style={{ fontSize: 'var(--text-sm)' }}>Đang tính giá...</span>
            </div>
          )}

          {!calculating && pricing && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* BOM info summary */}
              <div style={card}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fa-solid fa-calculator" style={{ color: 'var(--text-secondary)', fontSize: 13 }} />
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>Summary &amp; Quotation</p>
                </div>
                <div style={{ padding: '1rem 1.5rem' }}>
                  {[
                    { label: 'Date', val: date },
                    { label: 'SO/MO', val: soMo },
                    { label: 'Model', val: model },
                    { label: 'Price List', val: priceListType },
                    { label: 'SP Type', val: spType },
                    ...(salesPerson ? [{ label: 'Salesperson', val: salesPerson }] : []),
                    ...(store ? [{ label: 'Store', val: store }] : []),
                    ...(customerName ? [{ label: 'Customer', val: customerName }] : []),
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{r.label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing breakdown */}
              <div style={card}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>Báo Giá</p>
                </div>
                <div style={{ padding: '1rem 1.5rem' }}>
                  {/* Cost rows — Admin/Manager only */}
                  {canSeeAll && [
                    ['Gold Cost',   pricing.costGold],
                    ['Stone Cost',  pricing.costStones],
                    ['Labor Cost',  pricing.costLabor],
                    ['Subtotal',    pricing.costSubtotal],
                    ['CIF',         pricing.costCif],
                    ['Total Cost',  pricing.costTotal],
                  ].map(([l, v]) => (
                    <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{l}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{fmt$(Number(v))}</span>
                    </div>
                  ))}

                  {/* Sell Price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 6px', borderTop: '1px solid var(--border-strong)', marginTop: canSeeAll ? 4 : 0 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sell Price</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400 }}>{fmt$(pricing.sellPrice)}</span>
                  </div>

                  {/* Inline Discount */}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, marginTop: 4 }}>
                    <label style={{ ...lbl, marginBottom: 6 }}>Chiết Khấu %</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" min="0" max="100" step="0.5"
                        style={{ width: 80, border: '1px solid var(--border-base)', borderRadius: 0, padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', outline: 'none', color: 'var(--text-primary)' }}
                        value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="0" />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>%</span>
                      {discountedPrice && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontWeight: 500 }}>
                          → {fmt$(discountedPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* VND estimate — only VN store */}
                  {isVNStore && vndEst && (
                    <div style={{ background: 'var(--bg-muted)', padding: '8px 12px', marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Est. VND</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                          {vndEst.toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save button */}
                {saveError && (
                  <div style={{ margin: '0 1.5rem', borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
                    {saveError}
                  </div>
                )}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <button onClick={saveBOM} className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px', display: 'flex', alignItems: 'center', gap: 8 }}
                    disabled={saving}>
                    {saving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 12 }} />Đang lưu...</> : <><i className="fa-solid fa-floppy-disk" style={{ fontSize: 12 }} />Lưu BOM</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STONE TYPE LIST MODAL ── */}
      {showStoneTypes && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setShowStoneTypes(false)}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>Stone Types</h3>
              <button onClick={() => setShowStoneTypes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <input
                style={{ width: '100%', border: '1px solid var(--border-base)', borderRadius: 0, padding: '7px 10px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', outline: 'none' }}
                placeholder="Tìm Group Code, tên Việt, tên Anh..."
                value={stoneTypeSearch}
                onChange={e => setStoneTypeSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.5rem' }}>
              {stoneTypeLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Đang tải...
                </div>
              ) : filteredStoneTypes.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {stoneTypeSearch ? 'Không tìm thấy kết quả' : 'Không có dữ liệu'}
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr>
                      {['Group Code', 'Tên Tiếng Việt', 'Full Name (EN)'].map(h => (
                        <th key={h} style={{ ...thStyle, position: 'sticky', top: 0 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStoneTypes.map(s => (
                      <tr key={s.code}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', padding: '6px 6px' }}>{s.code}</td>
                        <td style={{ ...tdStyle, padding: '6px 6px' }}>{s.viName || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)', padding: '6px 6px' }}>{s.enName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── STEP NAV ─────────────────────────────────────────────── */
function StepNav({ canNext, onPrev, onNext, nextLabel }: {
  canNext: boolean
  onPrev?: () => void; onNext?: () => void; nextLabel?: string
}) {
  const navBtn: React.CSSProperties = {
    border: '1px solid var(--btn-dark-bg)', padding: '8px 24px', borderRadius: 0,
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
    fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
  }
  return (
    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      {onPrev
        ? <button onClick={onPrev} style={{ ...navBtn, background: 'transparent', color: 'var(--text-primary)' }}>← BACK</button>
        : <div />}
      {onNext && (
        <button onClick={onNext} style={{ ...navBtn, background: canNext ? 'var(--btn-dark-bg)' : 'var(--bg-muted)', color: 'var(--text-inverse)', cursor: canNext ? 'pointer' : 'not-allowed' }} disabled={!canNext}>
          {nextLabel || 'NEXT →'}
        </button>
      )}
    </div>
  )
}
