'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/components/shared/UserContext'
import { useLang } from '@/components/shared/I18nContext'
import { useToast } from '@/components/shared/ToastContext'
import DriveImageInput from '@/components/shared/DriveImageInput'

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
interface StoneRow { id: number; groupCode: string; size: string; ctw1pc: string; qty: string; tlHot: number; gradeId: string; giaBan: number; inputType: string; sellingPrice: number; pricingUnit: string }
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
function newStone(): StoneRow { return { id: nextId(), groupCode: '', size: '', ctw1pc: '', qty: '', tlHot: 0, gradeId: '', giaBan: 0, inputType: 'mm', sellingPrice: 0, pricingUnit: 'ct' } }

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
  const { t } = useLang()
  const { toast, update } = useToast()
  const isAdmin    = role === 'Admin'
  const isManager  = role === 'Manager'
  const canSeeAll  = isAdmin || isManager

  const [step, setStep] = useState(1)
  const [dropdowns, setDropdowns] = useState<Dropdowns | null>(null)
  const [vndRate, setVndRate] = useState(0)
  const [managerMax, setManagerMax] = useState(20)   // MANAGER_MAX_DISCOUNT from sys_config
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

  // Stone group autocomplete dropdowns (open state per row id)
  const [stoneDropdowns, setStoneDropdowns] = useState<Record<number, boolean>>({})

  // Step 4 — Results
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [discountAmt, setDiscountAmt] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedBomId, setSavedBomId] = useState('')
  const [saveError, setSaveError] = useState('')

  // Edit mode
  const [editBomId, setEditBomId] = useState<string | null>(null)
  const [saveAsNew, setSaveAsNew] = useState(false)
  const [fillLoading, setFillLoading] = useState(false)

  // Custom confirm dialog (KHÔNG dùng window.confirm)
  const [confirmVisible, setConfirmVisible] = useState(false)

  // Lookup debounce timers
  const lookupTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  /* ── Read ?edit=BOMID from URL ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bomId = params.get('edit')
    if (bomId) setEditBomId(bomId)
  }, [])

  /* ── Load BOM for editing ── */
  async function loadForEdit(bomId: string) {
    setFillLoading(true)
    try {
      const r = await fetch(`/api/bom/${bomId}`)
      const d = await r.json()
      if (!d.header) return
      const h = d.header
      setDate(h.date || today())
      setProductType(h.product_type || '')
      setSoMo(h.so_mo || '')
      setModel(h.model || '')
      setPriceListType(h.price_list_type || '')
      setLaborHours(String(h.labor_hours || 0))
      setSalesPerson(h.sales_person || '')
      setStore(h.store || '')
      setCustomerName(h.customer_name || '')
      setNote(h.note || '')
      setImg1(h.img1 || '')
      setImg2(h.img2 || '')
      setImg3(h.img3 || '')
      setFolderUrl(h.folder_url || '')

      if (d.golds?.length > 0) {
        const filled: GoldRow[] = d.golds.map((g: any) => ({
          id: nextId(), goldType: g.gold_type, color: g.color,
          weight: String(g.weight), pricePerGr: 0, cost: 0,
        }))
        setGoldRows(filled)
        filled.forEach(row => fetchGoldPrice(row.id, h.date || today(), row.goldType))
      }

      if (d.stones?.length > 0) {
        const filledStones: StoneRow[] = d.stones.map((s: any) => {
          const ctw = Number(s.ctw1pc) || 0
          const qty = Number(s.qty) || 0
          const tlHot = s.tl_hot || ctw * qty
          const giaBan = s.gia_ban || 0
          return {
            id: nextId(), groupCode: s.group_code,
            size: String(s.size || ''), ctw1pc: String(ctw || ''),
            qty: String(qty || ''), tlHot,
            gradeId: s.grade_id || '', giaBan, inputType: s.input_type || 'mm',
            sellingPrice: 0, pricingUnit: 'ct',
          }
        })
        setStoneRows(filledStones)
        // Trigger fresh lookup để lấy đúng pricingUnit + sellingPrice cho mỗi stone
        filledStones.forEach(row => {
          if (row.groupCode) scheduleLookup(row.id, row.groupCode, row.size, row.ctw1pc)
        })
      }

      // Restore discount (stored as decimal in DB, e.g. 0.05 = 5%)
      const rawPct = Number(h.discount_pct) || 0
      if (rawPct > 0) {
        const pct = rawPct <= 1 ? rawPct * 100 : rawPct
        setDiscountPct(pct.toFixed(2))
        const sellP = Number(h.sell_price) || 0
        if (sellP > 0) setDiscountAmt((sellP * pct / 100).toFixed(2))
      } else {
        setDiscountPct('')
        setDiscountAmt('')
      }

      // Normalize spType: 'TSTT' is only valid when hasStones; store the underlying type
      const loadedSpType = h.sp_type || 'Basic'
      setSpType(loadedSpType === 'TSTT' ? 'Basic' : loadedSpType)

      setStep(1)
    } catch (e) { console.error('loadForEdit failed', e) }
    finally { setFillLoading(false) }
  }

  /* ── Trigger load when editBomId is set AND dropdowns are ready ── */
  useEffect(() => {
    if (editBomId && !loadingDD) loadForEdit(editBomId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBomId, loadingDD])

  /* ── Auto-fetch gold prices on initial load (no edit mode) ── */
  useEffect(() => {
    if (!loadingDD && !editBomId && date) {
      goldRows.forEach(r => fetchGoldPrice(r.id, date, r.goldType))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDD])

  /* ── Load dropdowns ── */
  useEffect(() => {
    const storeParam = (canSeeAll || !userStore) ? '' : `?store=${userStore}`
    Promise.all([
      fetch(`/api/bom/dropdowns${storeParam}`).then(r => r.json()),
      fetch('/api/config?key=VND_RATE').then(r => r.json()),
      fetch('/api/config?key=MANAGER_MAX_DISCOUNT').then(r => r.json()),
    ]).then(([dd, cfg, mgrCfg]) => {
      setDropdowns(dd)
      if (dd.productTypes?.[0])   setProductType(dd.productTypes[0])
      if (dd.priceListTypes?.[0]) setPriceListType(dd.priceListTypes[0])
      if (cfg.rate) setVndRate(Number(cfg.rate))
      if (mgrCfg.rate) setManagerMax(Number(mgrCfg.rate))
    }).catch(console.error).finally(() => setLoadingDD(false))
  }, [canSeeAll, userStore])

  /* ── Fetch gold price ── */
  const fetchGoldPrice = useCallback(async (rowId: number, goldDate: string, goldType: string) => {
    if (!goldDate || !goldType) return
    try {
      const r = await fetch(`/api/bom/gold-price?date=${goldDate}&goldType=${goldType}`)
      const d = await r.json()
      const price = d.pricePerGram ?? d.pricePerGr  // API returns pricePerGram
      if (price != null && price > 0) {
        setGoldRows(rows => rows.map(row => {
          if (row.id !== rowId) return row
          const w = parseFloat(row.weight) || 0
          return { ...row, pricePerGr: price, cost: price * w }
        }))
      }
    } catch { }
  }, [])

  /* ── Stone lookup ── */
  const lookupStone = useCallback(async (rowId: number, groupCode: string, size: string, ctw1pc: string) => {
    if (!groupCode.trim()) return
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
          const sp = Number(d.selling_price) || 0
          const pu = (d.pricing_unit || 'ct').toLowerCase()
          return {
            ...row,
            gradeId:      d.grade_id   || '',
            inputType:    d.type_input || 'mm',
            sellingPrice: sp,
            pricingUnit:  pu,
            giaBan:       pu === 'pc' ? qty * sp : tlHot * sp,
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
  function addGoldRow() {
    const row = newGold()
    setGoldRows(r => [...r, row])
    if (date) fetchGoldPrice(row.id, date, row.goldType)
  }
  function removeGoldRow(id: number) { setGoldRows(r => r.filter(x => x.id !== id)) }

  /* ── Stone row handlers ── */
  function updateStone(id: number, field: keyof StoneRow, val: string) {
    setStoneRows(rows => rows.map(r => {
      if (r.id !== id) return r
      const updated: StoneRow = { ...r, [field]: val }

      if (field === 'ctw1pc') {
        const ctw = parseFloat(val) || 0
        const qty = parseFloat(r.qty) || 0
        updated.tlHot = ctw * qty
        if (r.inputType === 'mm' && r.sellingPrice > 0) {
          // mm type: recalc giaBan from cached sellingPrice, no re-lookup
          updated.giaBan = r.pricingUnit === 'pc' ? qty * r.sellingPrice : updated.tlHot * r.sellingPrice
        } else {
          // ct type: size to check is ctw — need re-lookup
          updated.giaBan = 0
          scheduleLookup(id, r.groupCode, r.size, val)
        }
      } else if (field === 'qty') {
        const ctw = parseFloat(r.ctw1pc) || 0
        const qty = parseFloat(val) || 0
        updated.tlHot = ctw * qty
        if (r.sellingPrice > 0) {
          // Recalc giaBan from cached sellingPrice — no re-lookup
          updated.giaBan = r.pricingUnit === 'pc' ? qty * r.sellingPrice : updated.tlHot * r.sellingPrice
        } else if (r.gradeId) {
          scheduleLookup(id, r.groupCode, r.size, r.ctw1pc)
        }
      } else if (field === 'groupCode' || field === 'size') {
        const gc = field === 'groupCode' ? val : r.groupCode
        const sz = field === 'size' ? val : r.size
        updated.giaBan = 0
        scheduleLookup(id, gc, sz, r.ctw1pc)
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
        date, productType, soMo, model, priceListType,
        spType: effectiveSpType,
        laborHours: parseFloat(laborHours) || 0,
        salesPerson, store, customerName, note,
        img1, img2, img3, folderUrl,
      },
      golds: validGolds,
      stones: validStones,
      calculatedCosts: pricing,
    }
  }

  /* ── Calculate ── */
  async function calculate() {
    setCalcError(''); setCalculating(true)
    const tid = toast('Calculating BOM cost...', 'loading')
    try {
      const payload = buildPayload()
      // GAS exact: reject only khi CẢ HAI đều rỗng
      if (payload.golds.length === 0 && payload.stones.length === 0) {
        setCalcError('Cần ít nhất 1 dòng vàng hoặc 1 dòng hột hợp lệ')
        update(tid, 'Cần ít nhất 1 dòng vàng hoặc hột', 'warning')
        setCalculating(false); return
      }
      const r = await fetch('/api/bom/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await r.json()
      if (!r.ok || !d.data) {
        setCalcError(d.error || d.message || 'Calculation failed')
        update(tid, d.error || 'Calculation failed', 'danger'); return
      }
      setPricing(d.data)
      update(tid, 'BOM cost calculated', 'success')
    } catch (e: any) { setCalcError(e.message); update(tid, e.message, 'danger') }
    finally { setCalculating(false) }
  }

  /* ── Save BOM ── */
  async function saveBOM() {
    if (!pricing) return
    setSaveError(''); setSaving(true)
    const isUpdate = editBomId && !saveAsNew
    const tid = toast(isUpdate ? 'Updating BOM...' : 'Saving BOM...', 'loading')
    try {
      const pct = clampedDiscPct  // use clamped value (already computed above)
      const payload = { ...buildPayload(), discountPct: pct }
      const r = await fetch(isUpdate ? `/api/bom/${editBomId}` : '/api/bom', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) {
        setSaveError(d.error || d.message || 'Save failed')
        update(tid, d.error || 'Save failed', 'danger'); return
      }
      const savedId = isUpdate ? editBomId! : (d.data?.bom_id || d.bomId || 'Saved')
      setSavedBomId(savedId)
      update(tid, `BOM ${savedId} ${isUpdate ? 'updated' : 'saved'}`, 'success')
    } catch (e: any) { setSaveError(e.message); update(tid, e.message, 'danger') }
    finally { setSaving(false) }
  }

  /* ── Reset ── */
  function resetAll() { setConfirmVisible(true) }
  function doReset() {
    setConfirmVisible(false)
    setStep(1); setDate(today()); setProductType(dropdowns?.productTypes?.[0] || '')
    setSoMo(''); setModel(''); setPriceListType(dropdowns?.priceListTypes?.[0] || '')
    setSpType('Basic'); setLaborHours('0')
    setSalesPerson(''); setStore(''); setCustomerName(''); setNote('')
    setImg1(''); setImg2(''); setImg3(''); setFolderUrl('')
    setGoldRows([newGold()]); setStoneRows([newStone()])
    setPricing(null); setDiscountPct(''); setDiscountAmt(''); setSavedBomId(''); setSaveError('')
    setEditBomId(null); setSaveAsNew(false)
  }

  /* ── Date change → re-fetch gold prices ── */
  function onDateChange(val: string) {
    setDate(val)
    goldRows.forEach(r => fetchGoldPrice(r.id, val, r.goldType))
  }

  /* ── Step nav validation ── */
  function canGoNext() {
    if (step === 1) return !!date && !!soMo && !!productType
    return true  // Step 2 → 3 and Step 3 → 4: always allowed (GAS exact)
  }

  /* ── Stone Type List ── */
  async function openStoneTypeList() {
    setShowStoneTypes(true)
    if (stoneTypeList.length > 0) return
    setStoneTypeLoading(true)
    try {
      const r = await fetch('/api/bom/stone-types')
      const d = await r.json()
      setStoneTypeList(d.data || [])
    } catch { } finally { setStoneTypeLoading(false) }
  }

  const filteredStoneTypes = stoneTypeList.filter(s => {
    const q = stoneTypeSearch.toLowerCase()
    return !q || s.code.toLowerCase().includes(q) || s.viName.toLowerCase().includes(q) || s.enName.toLowerCase().includes(q)
  })

  /* ── SP Type lock logic (CASE B → TSTT) — exact GAS definition ── */
  const hasStones = stoneRows.some(
    r => String(r.groupCode || '').trim() !== '' && (Number(r.qty) || 0) > 0
  )
  const effectiveSpType = hasStones ? 'TSTT' : spType

  /* ── Stone totals (dùng cho Step 3 footer + Step 4 summary) ── */
  const totalStoneQtyVal = stoneRows.reduce((s, r) => s + (parseInt(r.qty) || 0), 0)
  const totalStoneTlVal  = stoneRows.reduce((s, r) => s + r.tlHot, 0)
  const totalStoneGiaVal = stoneRows.reduce((s, r) => s + r.giaBan, 0)

  /* ── Discount cap (GAS exact) ── */
  const maxDiscPct = isAdmin ? 100 : isManager ? managerMax : 20

  /* ── Discount calc (use clamped pct) ── */
  const clampedDiscPct = Math.min(Math.max(parseFloat(discountPct) || 0, 0), maxDiscPct)
  const discountedPrice = pricing && clampedDiscPct > 0
    ? pricing.sellPrice * (1 - clampedDiscPct / 100)
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
    { label: t('step1'), icon: 'fa-regular fa-file' },
    { label: t('step2'), icon: 'fa-solid fa-coins' },
    { label: t('step3'), icon: 'fa-solid fa-gem' },
    { label: t('step4'), icon: 'fa-solid fa-calculator' },
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
            <i className="fa-solid fa-trash-can" style={{ fontSize: 10 }} />{t('reset')}
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
                  {t('labelDate')} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input type="date" style={inputUnder} value={date} onChange={e => onDateChange(e.target.value)} />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>
                  {t('labelProductType')} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select style={selectBox} value={productType} onChange={e => setProductType(e.target.value)}>
                  <option value="">— Chọn —</option>
                  {dropdowns?.productTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>{t('labelCustomer')}</label>
                <input style={inputUnder} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Tên khách hàng" />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>
                  {t('labelSoMo')} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input style={inputUnder} value={soMo} onChange={e => setSoMo(e.target.value)} placeholder="Số SO hoặc MO" />
              </div>
            </div>
            {/* Row 2: MODEL NUMBER | PRICE LIST TYPE | SALESPERSON | STORE */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>{t('labelModelNum')}</label>
                <input style={inputUnder} value={model} onChange={e => setModel(e.target.value)} placeholder="Model" />
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>
                  {t('labelPriceListType')} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select style={selectBox} value={priceListType} onChange={e => setPriceListType(e.target.value)}>
                  <option value="">— Chọn —</option>
                  {dropdowns?.priceListTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>{t('labelSalesperson')}</label>
                <select style={selectBox} value={salesPerson} onChange={e => setSalesPerson(e.target.value)}>
                  <option value="">— None —</option>
                  {dropdowns?.salesPersonNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>{t('labelStore')}</label>
                <select style={selectBox} value={store} onChange={e => setStore(e.target.value)}>
                  <option value="">— None —</option>
                  {[...new Set(dropdowns?.storeNames ?? [])].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {/* Row 3: IMAGE 1 | IMAGE 2 | IMAGE 3 | FOLDER URL */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <DriveImageInput
                label="IMAGE 1 URL"
                value={img1}
                onChange={setImg1}
                inputStyle={inputUnder}
                labelStyle={{ ...lbl, fontWeight: 500, marginBottom: 6 }}
              />
              <DriveImageInput
                label="IMAGE 2 URL"
                value={img2}
                onChange={setImg2}
                inputStyle={inputUnder}
                labelStyle={{ ...lbl, fontWeight: 500, marginBottom: 6 }}
              />
              <DriveImageInput
                label="IMAGE 3 URL"
                value={img3}
                onChange={setImg3}
                inputStyle={inputUnder}
                labelStyle={{ ...lbl, fontWeight: 500, marginBottom: 6 }}
              />
              <div>
                <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>{t('labelFolderUrl')}</label>
                <input style={inputUnder} value={folderUrl} onChange={e => setFolderUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            {/* Row 4: NOTE (full width) */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ ...lbl, fontWeight: 500, marginBottom: 6 }}>{t('labelNote')}</label>
              <textarea style={{ ...inputUnder, resize: 'vertical', minHeight: 56 }} value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú..." />
            </div>
            {(!date || !soMo || !productType) && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: '0.5rem' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                Bắt buộc: Date, SO/MO, Product Type
              </p>
            )}
          </div>
          <StepNav canNext={canGoNext()} onNext={() => setStep(2)} nextLabel="Tiếp Tục →" />
        </div>
      )}

      {/* ── STEP 2: GOLD ── */}
      {step === 2 && (
        <div style={card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-coins" style={{ color: 'var(--text-secondary)', fontSize: 14 }} />Dữ liệu Vàng
            </p>
            <button onClick={addGoldRow} style={{
              padding: '5px 14px', fontSize: 'var(--text-xs)', fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              border: '1px solid var(--color-success)', color: 'var(--color-success)',
              background: 'transparent', borderRadius: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)',
            }}>
              <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />Thêm Dòng Vàng
            </button>
          </div>
          <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr>
                  {['#', 'Gold Type', 'Color', 'Weight (gr)',
                    ...(canSeeAll ? ['Giá/gr', 'Giá Mỗi Loại'] : []),
                    'Xóa'
                  ].map(h => (
                    <th key={h} style={{ ...thStyle, textAlign: h === 'Giá/gr' || h === 'Giá Mỗi Loại' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {goldRows.map((r, i) => (
                  <tr key={r.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...tdStyle, width: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, width: 120 }}>
                      <select style={tdInput} value={r.goldType} onChange={e => updateGold(r.id, 'goldType', e.target.value)}>
                        {(dropdowns?.goldTypes || ['10K','14K','18K','20K','22K','24K','PT','AG']).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, width: 130 }}>
                      <select style={tdInput} value={r.color} onChange={e => updateGold(r.id, 'color', e.target.value)}>
                        {(dropdowns?.colors || ['Yellow','White','Rose','Platinum']).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle }}>
                      <input type="number" style={tdInput} value={r.weight} min="0" step="0.01" placeholder="0.00"
                        onChange={e => updateGold(r.id, 'weight', e.target.value)} />
                    </td>
                    {/* Giá/gr — cost-restricted (Admin/Manager only) */}
                    {canSeeAll && (
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: '#B8860B', textAlign: 'right', paddingRight: 10, fontWeight: 600 }}>
                        {r.pricePerGr > 0 ? fmt$(r.pricePerGr) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    )}
                    {/* Giá mỗi loại — cost-restricted */}
                    {canSeeAll && (
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: '#B8860B', textAlign: 'right', paddingRight: 10, fontWeight: 700 }}>
                        {r.cost > 0 ? fmt$(r.cost) : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>}
                      </td>
                    )}
                    <td style={{ ...tdStyle, width: 44, textAlign: 'center' }}>
                      {goldRows.length > 1 ? (
                        <button onClick={() => removeGoldRow(r.id)} style={{
                          background: 'none', border: '1px solid var(--color-danger)',
                          borderRadius: 0, padding: '3px 8px',
                          cursor: 'pointer', color: 'var(--color-danger)',
                        }}>
                          <i className="fa-solid fa-trash-can" style={{ fontSize: 11 }} />
                        </button>
                      ) : <span />}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              {goldRows.some(r => r.cost > 0 || (parseFloat(r.weight) || 0) > 0) && (() => {
                const totalWeight = goldRows.reduce((s, r) => s + (parseFloat(r.weight) || 0), 0)
                const totalCost   = goldRows.reduce((s, r) => s + r.cost, 0)
                return (
                  <tfoot>
                    <tr style={{ background: '#F5EDD8' }}>
                      <td colSpan={3} style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', color: 'var(--text-secondary)', paddingRight: 10 }}>
                        Tổng Cộng:
                      </td>
                      <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', paddingLeft: 8 }}>
                        {totalWeight.toFixed(2)} gr
                      </td>
                      {canSeeAll && <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)' }} />}
                      {canSeeAll && (
                        <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#B8860B', textAlign: 'right', paddingRight: 10 }}>
                          {totalCost > 0 ? fmt$(totalCost) : '—'}
                        </td>
                      )}
                      <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)' }} />
                    </tr>
                  </tfoot>
                )
              })()}
            </table>
          </div>

          {/* SP Type — chỉ cho CASE A */}
          <div style={{ padding: '0.75rem 1.5rem 1rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>SP Type (Kiểu SP trơn)</label>
              {hasStones ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  TSTT <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)' }}>(tự động khi có hột)</span>
                </span>
              ) : (
                <select style={{ ...selectBox, width: 160 }} value={spType} onChange={e => setSpType(e.target.value)}>
                  {(dropdowns?.spTypes?.length ? dropdowns.spTypes : ['Basic', 'Fancy']).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <StepNav canNext={canGoNext()} onPrev={() => setStep(1)} onNext={() => setStep(3)}
            prevLabel="← Quay Lại" nextLabel="Tiếp Tục →" />
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
                <i className="fa-regular fa-gem" style={{ fontSize: 10 }} />{t('stoneTypeListTitle')}
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
                <tr>
                  {['#', t('labelStoneGroup'), t('labelMmSize'), t('labelCtw'), t('labelQty'), t('labelTlHot'), 'Input', t('labelGradeId'),
                    ...(canSeeAll ? [t('labelStonePrice')] : []),
                    ''
                  ].map((h, i) => <th key={`sh-${i}`} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {stoneRows.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, width: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, minWidth: 140, position: 'relative' }}>
                      <input
                        type="text"
                        style={tdInput}
                        value={r.groupCode}
                        placeholder="Group code..."
                        autoComplete="off"
                        onChange={e => {
                          updateStone(r.id, 'groupCode', e.target.value)
                          setStoneDropdowns(prev => ({ ...prev, [r.id]: true }))
                        }}
                        onFocus={() => setStoneDropdowns(prev => ({ ...prev, [r.id]: true }))}
                        onBlur={() => setTimeout(() => setStoneDropdowns(prev => ({ ...prev, [r.id]: false })), 200)}
                      />
                      {stoneDropdowns[r.id] && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                          background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
                          maxHeight: 220, overflowY: 'auto',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}>
                          {(() => {
                            const q = r.groupCode.trim().toUpperCase()
                            const matches = (dropdowns?.stoneGroupCodes || [])
                              .filter(c => !q || c.toUpperCase().includes(q))
                              .slice(0, 80)
                            if (matches.length === 0) return (
                              <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                                No matches
                              </div>
                            )
                            return matches.map(c => (
                              <div key={c}
                                onMouseDown={() => {
                                  updateStone(r.id, 'groupCode', c)
                                  setStoneDropdowns(prev => ({ ...prev, [r.id]: false }))
                                }}
                                style={{ padding: '5px 10px', fontSize: 'var(--text-sm)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                {c}
                              </div>
                            ))
                          })()}
                        </div>
                      )}
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
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {r.inputType || 'mm'}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: r.gradeId ? 'var(--color-success)' : 'var(--text-muted)', paddingRight: 6 }}>
                      {r.gradeId || '—'}
                    </td>
                    {/* Giá bán — cost-restricted */}
                    {canSeeAll && (
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textAlign: 'right', paddingRight: 6 }}>
                        {r.giaBan > 0 ? fmt$(r.giaBan) : '—'}
                      </td>
                    )}
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
              {/* TỔNG CỘNG footer */}
              {stoneRows.some(r => r.tlHot > 0 || (parseInt(r.qty) || 0) > 0) && (
                <tfoot>
                  <tr style={{ background: '#F5EDD8' }}>
                    <td colSpan={4} style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', color: 'var(--text-secondary)', paddingRight: 10 }}>
                      Tổng Cộng:
                    </td>
                    <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {totalStoneQtyVal}
                    </td>
                    <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', paddingRight: 6 }}>
                      {totalStoneTlVal.toFixed(3)}
                    </td>
                    <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)' }} />
                    <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)' }} />
                    {canSeeAll && (
                      <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: '#B8860B', textAlign: 'right', paddingRight: 6 }}>
                        {totalStoneGiaVal > 0 ? fmt$(totalStoneGiaVal) : '—'}
                      </td>
                    )}
                    <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)' }} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <StepNav canNext={true} onPrev={() => setStep(2)} onNext={() => { setStep(4); calculate() }} prevLabel="← Quay Lại" nextLabel="Tính Giá →" />
        </div>
      )}

      {/* ── STEP 4: BÁO GIÁ ── */}
      {step === 4 && (
        <div>
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

          {!calculating && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* ── LEFT: BOM Info + Labor + SP Type ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ ...card, padding: '1.25rem 1.5rem', height: '100%' }}>
                  <h6 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: '0 0 1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    Thông số Sản Xuất
                  </h6>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Tổng số hột:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{totalStoneQtyVal}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Tổng lượng hột (CTW):</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{totalStoneTlVal.toFixed(3)}</strong>
                  </div>
                  
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '1rem 0' }} />

                  {/* Labor Hours (CASE B) */}
                  {hasStones && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ ...lbl, marginBottom: 8 }}>
                        {t('labelLaborHours')} <span style={{ color: 'var(--color-danger)' }}>*</span>
                      </label>
                      <input
                        type="number" min="0" step="0.5" placeholder="0"
                        style={{ ...tdInput }}
                        value={laborHours}
                        onChange={e => { setLaborHours(e.target.value); calculate() }}
                        onBlur={calculate}
                      />
                    </div>
                  )}

                  {/* SP Type */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ ...lbl, marginBottom: 8 }}>SP Type</label>
                    {hasStones ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', display: 'block', padding: '4px 0' }}>
                        TSTT <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)' }}>(tự động)</span>
                      </span>
                    ) : (
                      <select style={{ ...selectBox }} value={spType} onChange={e => { setSpType(e.target.value); calculate() }}>
                        {(dropdowns?.spTypes?.length ? dropdowns.spTypes : ['Basic', 'Fancy']).map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Pricing Breakdown ── */}
              <div style={card}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <h6 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0, paddingBottom: '0.5rem' }} className={canSeeAll ? "" : "cost-restricted"}>
                    Báo Cáo Chi Phí (Cost)
                  </h6>
                </div>
                <div style={{ padding: '1rem 1.5rem' }}>

                  {/* Cost rows — Admin/Manager only */}
                  {canSeeAll && pricing && (
                    <div style={{ marginBottom: 8 }}>
                      {[
                        ['Chi phí Vàng',     pricing.costGold],
                        ['Chi phí Hột',   pricing.costStones],
                        ['Chi phí Công',    pricing.costLabor],
                        ['CIF (Thuế/Phí)',          pricing.costCif],
                      ].map(([l, v]) => (
                        <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{l as string}:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{fmt$(Number(v))}</strong>
                        </div>
                      ))}
                      
                      <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.5rem 0 1rem' }} />

                      {/* TỔNG COST — prominently red */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0 1rem' }}>
                        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>TỔNG COST:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-danger)' }}>{fmt$(pricing.costTotal)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Inline Discount — Admin/Manager only */}
                  {canSeeAll && pricing && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 4 }}>
                        <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', flexShrink: 0 }}>
                          Discount
                        </span>
                        <input type="number" min="0" max={maxDiscPct} step="0.5"
                          style={{ width: 60, border: 'none', borderBottom: '1px solid var(--border-base)', borderRadius: 0, padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', outline: 'none', color: 'var(--text-primary)', background: 'transparent', textAlign: 'center' }}
                          value={discountPct}
                          onChange={e => {
                            const raw = e.target.value
                            setDiscountPct(raw)
                            const p = Math.min(Math.max(parseFloat(raw) || 0, 0), maxDiscPct)
                            if (p > 0) setDiscountAmt((pricing.sellPrice * p / 100).toFixed(2))
                            else setDiscountAmt('')
                          }}
                          onBlur={e => {
                            const p = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), maxDiscPct)
                            setDiscountPct(p > 0 ? String(p) : '')
                          }}
                          placeholder="0" />
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>% =</span>
                        <input type="number" min="0" step="0.01"
                          style={{ width: 80, border: 'none', borderBottom: '1px solid var(--border-base)', borderRadius: 0, padding: '2px 4px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', outline: 'none', color: 'var(--text-primary)', background: 'transparent', textAlign: 'right' }}
                          value={discountAmt}
                          onChange={e => {
                            const raw = e.target.value
                            setDiscountAmt(raw)
                            const maxAmt = pricing.sellPrice * maxDiscPct / 100
                            const a = Math.min(Math.max(parseFloat(raw) || 0, 0), maxAmt)
                            if (pricing.sellPrice > 0 && a > 0)
                              setDiscountPct((a / pricing.sellPrice * 100).toFixed(2))
                            else setDiscountPct('')
                          }}
                          onBlur={e => {
                            const maxAmt = pricing.sellPrice * maxDiscPct / 100
                            const a = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), maxAmt)
                            setDiscountAmt(a > 0 ? String(a) : '')
                          }}
                          placeholder="0.00" />
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>$</span>
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {discountedPrice != null ? fmt$(discountedPrice) : '—'}
                        </span>
                      </div>
                      {!isAdmin && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                          Max: {maxDiscPct}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* GIÁ BÁN LẺ DỰ KIẾN */}
                  {pricing && (
                    <div style={{ background: '#F2F7F4', border: '1px solid #C3E6CB', borderRadius: 4, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        GIÁ BÁN LẺ DỰ KIẾN:
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 400, color: 'var(--text-primary)' }}>
                          {fmt$(discountedPrice ?? pricing.sellPrice)}
                        </strong>
                        {isVNStore && vndEst && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {vndEst.toLocaleString('vi-VN')} ₫
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2 dòng phân tích — cost-restricted */}
                  {canSeeAll && pricing && (
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                        <span>÷ Tổng Cost (Tỷ lệ markup)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {pricing.costTotal > 0 ? ((discountedPrice ?? pricing.sellPrice) / pricing.costTotal).toFixed(2) : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--text-secondary)' }}>
                        <span>− Tổng Cost (Lợi nhuận)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--color-success)' }}>
                          {pricing.costTotal > 0 ? fmt$((discountedPrice ?? pricing.sellPrice) - pricing.costTotal) : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Save error */}
                {saveError && (
                  <div style={{ margin: '0 1.5rem 1rem', borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
                    {saveError}
                  </div>
                )}

                {/* Bottom action bar */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)' }}>
                  <button onClick={() => setStep(3)} className="btn-outline" style={{ padding: '8px 18px', flexShrink: 0 }}>
                    ← Quay lại
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {editBomId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 4, border: '1px solid var(--btn-dark-bg)', background: 'var(--bg-surface)' }}>
                        <input type="checkbox" id="chkSaveAsNew" checked={saveAsNew} onChange={e => setSaveAsNew(e.target.checked)}
                          style={{ accentColor: 'var(--btn-dark-bg)', width: 14, height: 14, margin: 0 }} />
                        <label htmlFor="chkSaveAsNew" style={{ fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>
                          Lưu thành BOM mới
                        </label>
                      </div>
                    )}
                    <button onClick={saveBOM} className="btn-primary"
                      style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
                      disabled={saving || fillLoading || !pricing}>
                      {saving
                        ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 12 }} />Đang lưu</>
                        : fillLoading
                          ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 12 }} />Loading</>
                          : <><i className="fa-solid fa-save" style={{ fontSize: 12 }} />LƯU BOM</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRM RESET DIALOG ── */}
      {confirmVisible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: '100%', maxWidth: 400 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-base)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>
                Xác nhận Reset
              </h3>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                Xóa toàn bộ dữ liệu đã nhập? Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setConfirmVisible(false)}
                style={{
                  border: '1px solid var(--border-base)', background: 'transparent',
                  borderRadius: 0, padding: '7px 20px', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                  fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                }}>
                Hủy
              </button>
              <button
                onClick={doReset}
                style={{
                  border: '1px solid var(--color-danger)', background: 'var(--color-danger)',
                  borderRadius: 0, padding: '7px 20px', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                  fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#fff',
                }}>
                <i className="fa-solid fa-trash-can" style={{ marginRight: 6, fontSize: 10 }} />Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STONE TYPE LIST MODAL ── */}
      {showStoneTypes && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setShowStoneTypes(false)}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>{t('stoneTypeListTitle')}</h3>
              <button onClick={() => setShowStoneTypes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <input
                style={{ width: '100%', border: '1px solid var(--border-base)', borderRadius: 0, padding: '7px 10px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', outline: 'none' }}
                placeholder={t('stoneTypeSearchPlh')}
                value={stoneTypeSearch}
                onChange={e => setStoneTypeSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.5rem' }}>
              {stoneTypeLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />{t('loading')}
                </div>
              ) : filteredStoneTypes.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {stoneTypeSearch ? t('stoneTypeNoResult') : t('stoneTypeNoData')}
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr>
                      {['Group Code', t('colViName'), 'Full Name (EN)', 'Type', 'Unit'].map(h => (
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
                        <td style={{ ...tdStyle, padding: '6px 6px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '1px 7px', border: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {s.typeInput || 'mm'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, padding: '6px 6px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '1px 7px', border: '1px solid var(--border-base)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', background: s.unit === 'pc' ? 'var(--bg-muted)' : 'transparent' }}>
                            {s.unit || 'ct'}
                          </span>
                        </td>
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
function StepNav({ canNext, onPrev, onNext, nextLabel, prevLabel }: {
  canNext: boolean
  onPrev?: () => void; onNext?: () => void; nextLabel?: string; prevLabel?: string
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
        ? <button onClick={onPrev} style={{ ...navBtn, background: 'transparent', color: 'var(--text-primary)' }}>{prevLabel || '← Quay Lại'}</button>
        : <div />}
      {onNext && (
        <button onClick={onNext} style={{ ...navBtn, background: canNext ? 'var(--btn-dark-bg)' : 'var(--bg-muted)', color: 'var(--text-inverse)', cursor: canNext ? 'pointer' : 'not-allowed' }} disabled={!canNext}>
          {nextLabel || 'Tiếp Tục →'}
        </button>
      )}
    </div>
  )
}
