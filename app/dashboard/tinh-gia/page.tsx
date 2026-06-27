'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/components/shared/UserContext'
import { useConfig } from '@/components/shared/ConfigContext'
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
interface StoneRow { id: number; groupCode: string; size: string; ctw1pc: string; qty: string; tlHot: number; gradeId: string; giaBan: number; inputType: string; sellingPrice: number; pricingUnit: string; notFound: boolean; note: string }
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
function newStone(): StoneRow { return { id: nextId(), groupCode: '', size: '', ctw1pc: '', qty: '', tlHot: 0, gradeId: '', giaBan: 0, inputType: 'mm', sellingPrice: 0, pricingUnit: 'ct', notFound: false, note: '' } }

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
  display: 'block', fontSize: 10, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 4,
  fontFamily: 'var(--font-body)',
}
const thStyle: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
  color: 'var(--text-muted)', fontWeight: 400,
  padding: '10px 6px', borderBottom: '1px solid var(--border-base)',
  background: 'var(--bg-muted)', textAlign: 'left', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = { padding: '4px 4px', borderBottom: '1px solid var(--border-light)', verticalAlign: 'middle' }
const tdInput: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border-base)', borderRadius: 0,
  background: 'var(--bg-surface)', padding: '4px 6px',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
  transition: 'border-color 0.15s',
}
const card: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-base)' }

/* ── PERSISTENCE KEYS ──────────────────────────────────────── */
const DRAFT_KEY = 'bom_draft_v1'
const PREFS_KEY = 'bom_prefs'

/* ── COMPONENT ─────────────────────────────────────────────── */
export default function TinhGiaPage() {
  const { role, store: userStore } = useUser()
  const { vndRate, mgrDiscCap: managerMax } = useConfig()
  const { t } = useLang()
  const { toast, update, dismiss } = useToast()
  const isAdmin    = role === 'Admin'
  const isManager  = role === 'Manager'
  const canSeeAll  = isAdmin || isManager
  const isOrder    = role === 'Order'
  const canSubmit  = isAdmin || isManager || isOrder

  const [step, setStep] = useState(1)
  const [dropdowns, setDropdowns] = useState<Dropdowns | null>(null)
  const [loadingDD, setLoadingDD] = useState(true)
  const [showStoneTypes, setShowStoneTypes] = useState(false)
  const [stoneTypeList, setStoneTypeList] = useState<Array<{ code: string; displayName: string; viName: string; enName: string; unit: string; typeInput: string }>>([])
  const [stoneTypeSearch, setStoneTypeSearch] = useState('')
  const [stoneTypeLoading, setStoneTypeLoading] = useState(false)
  const [stoneTypeNameLang, setStoneTypeNameLang] = useState<'vi' | 'en'>('en')

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

  // Approval
  const [approvalStatus, setApprovalStatus] = useState<'draft'|'pending'|'approved'|'rejected'>('draft')
  const [approvalNote, setApprovalNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Order cannot edit pending/approved BOM
  const editLocked = isOrder && (approvalStatus === 'pending' || approvalStatus === 'approved')

  // Edit mode
  const [editBomId, setEditBomId] = useState<string | null>(null)
  const [saveAsNew, setSaveAsNew] = useState(false)
  const [fillLoading, setFillLoading] = useState(false)
  const [templateBomId, setTemplateBomId] = useState<string | null>(null)

  // Custom confirm dialog (KHÔNG dùng window.confirm)
  const [confirmVisible, setConfirmVisible] = useState(false)

  // Lookup debounce timers
  const lookupTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const lookupCache = useRef<Map<string, any>>(new Map())
  // Debounce timer for recalculate (laborHours changes)
  const calcTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track laborHours value used in the last successful calculate() call
  const lastCalcLaborHours = useRef<string>('')
  // Prevents loadForEdit from re-running when editBomId is set programmatically after a save
  const skipNextLoad = useRef(false)

  /* ── Read ?edit=BOMID or ?template=BOMID from URL ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const bomId = params.get('edit')
    if (bomId) { setEditBomId(bomId); return }
    const tplId = params.get('template')
    if (tplId) setTemplateBomId(tplId)
  }, [])

  /* ── Load BOM for editing ── */
  async function loadForEdit(bomId: string) {
    if (skipNextLoad.current) { skipNextLoad.current = false; return }
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
            sellingPrice: 0, pricingUnit: 'ct', notFound: false, note: s.note || '',
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

      setApprovalStatus(h.approval_status || 'draft')
      setApprovalNote(h.approval_note || '')

      setStep(1)
    } catch (e) { console.error('loadForEdit failed', e) }
    finally { setFillLoading(false) }
  }

  /* ── Load BOM as template: copy all fields except date/SO/customer — saves as new BOM ── */
  async function loadForTemplate(bomId: string) {
    setFillLoading(true)
    const tid = toast(`Copying BOM ${bomId} as template...`, 'loading')
    try {
      const r = await fetch(`/api/bom/${bomId}`)
      const d = await r.json()
      if (!d.header) { update(tid, 'Template not found', 'danger'); return }
      const h = d.header
      setDate(today())        // always use today for new BOM
      setProductType(h.product_type || '')
      setSoMo('')             // clear — user must enter new order number
      setModel(h.model || '')
      setPriceListType(h.price_list_type || '')
      setLaborHours(String(h.labor_hours || 0))
      setSalesPerson(h.sales_person || '')
      setStore(h.store || '')
      setCustomerName('')     // clear customer
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
        const todayStr = today()
        filled.forEach(row => fetchGoldPrice(row.id, todayStr, row.goldType))
      }

      if (d.stones?.length > 0) {
        const filledStones: StoneRow[] = d.stones.map((s: any) => {
          const ctw = Number(s.ctw1pc) || 0
          const qty = Number(s.qty) || 0
          return {
            id: nextId(), groupCode: s.group_code,
            size: String(s.size || ''), ctw1pc: String(ctw || ''),
            qty: String(qty || ''), tlHot: s.tl_hot || ctw * qty,
            gradeId: s.grade_id || '', giaBan: s.gia_ban || 0,
            inputType: s.input_type || 'mm', sellingPrice: 0, pricingUnit: 'ct', notFound: false,
          }
        })
        setStoneRows(filledStones)
        filledStones.forEach(row => {
          if (row.groupCode) scheduleLookup(row.id, row.groupCode, row.size, row.ctw1pc)
        })
      }

      const loadedSpType = h.sp_type || 'Basic'
      setSpType(loadedSpType === 'TSTT' ? 'Basic' : loadedSpType)
      setDiscountPct(''); setDiscountAmt('')
      // NOT setting editBomId — will save as a new BOM
      setEditBomId(null); setSaveAsNew(false)
      setStep(1)
      dismiss(tid)
      toast(`Template from ${bomId} loaded — fill in SO/MO and save as new BOM.`, 'info')
    } catch (e) { update(tid, 'Failed to load template', 'danger') }
    finally { setFillLoading(false) }
  }

  /* ── Trigger load when editBomId is set AND dropdowns are ready ── */
  useEffect(() => {
    if (editBomId && !loadingDD) loadForEdit(editBomId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBomId, loadingDD])

  /* ── Load BOM as template (copy) when ?template= param is set ── */
  useEffect(() => {
    if (templateBomId && !loadingDD) loadForTemplate(templateBomId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateBomId, loadingDD])

  /* ── Auto-fetch gold prices on initial load (no edit mode) ── */
  useEffect(() => {
    if (!loadingDD && !editBomId && date) {
      goldRows.forEach(r => fetchGoldPrice(r.id, date, r.goldType))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDD])

  /* ── Restore draft / prefs after dropdowns load ── */
  useEffect(() => {
    if (loadingDD) return
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    if (params?.has('edit') || params?.has('template')) return
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        // Only restore if draft has meaningful content
        if (draft.soMo || draft.model || draft.goldRows?.some((r: any) => r.weight)) {
          if (draft.date) setDate(draft.date)
          if (draft.productType) setProductType(draft.productType)
          if (draft.soMo) setSoMo(draft.soMo)
          if (draft.model) setModel(draft.model)
          if (draft.priceListType) setPriceListType(draft.priceListType)
          if (draft.spType) setSpType(draft.spType)
          if (draft.laborHours !== undefined) setLaborHours(String(draft.laborHours))
          if (draft.salesPerson) setSalesPerson(draft.salesPerson)
          if (draft.store) setStore(draft.store)
          if (draft.customerName) setCustomerName(draft.customerName)
          if (draft.note) setNote(draft.note)
          if (draft.img1) setImg1(draft.img1)
          if (draft.img2) setImg2(draft.img2)
          if (draft.img3) setImg3(draft.img3)
          if (draft.folderUrl) setFolderUrl(draft.folderUrl)
          if (draft.goldRows?.length > 0) setGoldRows(draft.goldRows.map((r: any) => ({ ...r, id: nextId() })))
          if (draft.stoneRows?.length > 0) setStoneRows(draft.stoneRows.map((r: any) => ({ ...r, id: nextId() })))
          toast('Bản nháp đã được khôi phục.', 'info')
          return
        }
      }
      // No draft — apply saved prefs (productType, priceListType, salesPerson)
      const prefs: Record<string, string> = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
      if (prefs.salesPerson) setSalesPerson(prefs.salesPerson)
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDD])

  /* ── Auto-save draft to localStorage (debounced 1s, non-edit mode) ── */
  useEffect(() => {
    if (loadingDD || editBomId) return
    const timer = setTimeout(() => {
      const draft = {
        date, productType, soMo, model, priceListType, spType,
        laborHours, salesPerson, store, customerName, note,
        img1, img2, img3, folderUrl, goldRows, stoneRows,
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    }, 1000)
    return () => clearTimeout(timer)
  }, [date, productType, soMo, model, priceListType, spType, laborHours, salesPerson, store,
      customerName, note, img1, img2, img3, folderUrl, goldRows, stoneRows, loadingDD, editBomId])

  /* ── Ctrl+S → save BOM (step 4 only, when pricing is ready) ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (step === 4 && pricing && !saving) saveBOM()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pricing, saving])

  /* ── Warn before leaving when form has unsaved data ── */
  useEffect(() => {
    const dirty = soMo || model || goldRows.some(r => r.weight) || stoneRows.some(r => r.groupCode)
    if (!dirty || savedBomId) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [soMo, model, goldRows, stoneRows, savedBomId])

  /* ── Load dropdowns ── */
  useEffect(() => {
    const ctrl = new AbortController()
    const { signal } = ctrl
    const storeParam = (canSeeAll || !userStore) ? '' : `?store=${userStore}`
    fetch(`/api/bom/dropdowns${storeParam}`, { signal })
      .then(r => r.json())
      .then(dd => {
        setDropdowns(dd)
        if (dd.productTypes?.[0])   setProductType(dd.productTypes[0])
        if (dd.priceListTypes?.[0]) setPriceListType(dd.priceListTypes[0])
      })
      .catch(e => { if (e.name !== 'AbortError') console.error(e) })
      .finally(() => setLoadingDD(false))
    return () => ctrl.abort()
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
    const hasSizeCriteria = sizeVal > 0 || ctwVal > 0
    const cacheKey = `${groupCode}|${sizeVal}|${ctwVal}`
    try {
      let d = lookupCache.current.get(cacheKey)
      if (!d) {
        const r = await fetch(`/api/master/lookup?groupCode=${encodeURIComponent(groupCode)}&size=${sizeVal}&ctw=${ctwVal}`)
        d = await r.json()
        if (d.success) lookupCache.current.set(cacheKey, d)
      }
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
            inputType:    d.input_type || 'mm',
            sellingPrice: sp,
            pricingUnit:  pu,
            giaBan:       pu === 'pc' ? qty * sp : tlHot * sp,
            notFound:     false,
          }
        }))
      } else {
        // No size match — but the API may still return type_input from a fallback query
        setStoneRows(rows => rows.map(row => {
          if (row.id !== rowId) return row
          return {
            ...row,
            // Update inputType if the API discovered it (even without a size match)
            inputType:    d.type_input || row.inputType,
            // Clear grade & price since no match
            gradeId:      '',
            sellingPrice: 0,
            giaBan:       0,
            // Show "not found" warning only when user has entered a size/ctw value
            notFound:     hasSizeCriteria,
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
    fetchGoldPrice(row.id, date, row.goldType)
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
        updated.notFound = false  // reset warning while re-looking up
        if (field === 'groupCode') {
          // Reset inputType/grade on group change; lookup will refresh them
          updated.gradeId = ''
          updated.inputType = 'mm'
          updated.sellingPrice = 0
        }
        scheduleLookup(id, gc, sz, r.ctw1pc)
      }

      return updated
    }))
  }
  function addStoneRow()          { setStoneRows(r => [...r, newStone()]) }
  function removeStoneRow(id: number) { setStoneRows(r => r.filter(x => x.id !== id)) }

  /* ── Build payload ── */
  function buildPayload(overrideSpType?: string) {
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
        note: r.note || '',
      }))

    return {
      header: {
        date, productType, soMo, model, priceListType,
        spType: overrideSpType !== undefined ? overrideSpType : effectiveSpType,
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
  async function calculate(overrideSpType?: string) {
    lastCalcLaborHours.current = laborHours   // stamp value used in this calculation
    setCalcError(''); setCalculating(true)
    const tid = toast('Calculating BOM cost...', 'loading')
    try {
      const payload = buildPayload(overrideSpType)
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
      skipNextLoad.current = true   // don't reload form data — we already have it
      setEditBomId(savedId)         // put form in edit mode for the saved BOM
      setSaveAsNew(false)           // reset to overwrite mode by default
      setSavedBomId(savedId)        // show inline success banner
      // Edit resets approval to draft (per API logic)
      if (isUpdate) { setApprovalStatus('draft'); setApprovalNote('') }
      update(tid, `BOM ${savedId} ${isUpdate ? 'updated' : 'saved'}`, 'success')
      // Save prefs for next BOM + clear draft + signal review page to refresh
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ productType, priceListType, salesPerson }))
        localStorage.removeItem(DRAFT_KEY)
        localStorage.setItem('bom_last_saved', savedId)
      } catch { /* ignore storage errors */ }
    } catch (e: any) { setSaveError(e.message); update(tid, e.message, 'danger') }
    finally { setSaving(false) }
  }

  /* ── Submit for approval ── */
  async function submitForApproval() {
    if (!editBomId && !savedBomId) return
    const bomId = editBomId || savedBomId
    setSubmitting(true)
    const tid = toast('Đang gửi duyệt...', 'loading')
    try {
      const r = await fetch(`/api/bom/${bomId}/submit`, { method: 'PATCH' })
      const d = await r.json()
      if (!r.ok) { update(tid, d.error || 'Gửi duyệt thất bại', 'danger'); return }
      setApprovalStatus('pending')
      setApprovalNote('')
      update(tid, `BOM ${bomId} đã gửi chờ duyệt`, 'success')
    } catch (e: any) { update(tid, e.message, 'danger') }
    finally { setSubmitting(false) }
  }

  /* ── Reset ── */
  function resetAll() { setConfirmVisible(true) }
  function doReset() {
    setConfirmVisible(false)
    localStorage.removeItem(DRAFT_KEY)
    let prefs: Record<string, string> = {}
    try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } catch { /* ignore */ }
    setStep(1); setDate(today())
    setProductType(
      (prefs.productType && dropdowns?.productTypes?.includes(prefs.productType))
        ? prefs.productType : (dropdowns?.productTypes?.[0] || '')
    )
    setSoMo(''); setModel('')
    setPriceListType(
      (prefs.priceListType && dropdowns?.priceListTypes?.includes(prefs.priceListType))
        ? prefs.priceListType : (dropdowns?.priceListTypes?.[0] || '')
    )
    setSpType('Basic'); setLaborHours('0')
    setSalesPerson(prefs.salesPerson || ''); setStore(''); setCustomerName(''); setNote('')
    setImg1(''); setImg2(''); setImg3(''); setFolderUrl('')
    setGoldRows([newGold()]); setStoneRows([newStone()])
    setPricing(null); setDiscountPct(''); setDiscountAmt(''); setSavedBomId(''); setSaveError('')
    setEditBomId(null); setSaveAsNew(false)
    setApprovalStatus('draft'); setApprovalNote('')
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

  /* ── (savedBomId now shown as inline banner in Step 4, not a full-page screen) ── */

  if (loadingDD) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', padding: '3rem 0' }}>
      <i className="fa-solid fa-circle-notch fa-spin" />
      <span style={{ fontSize: 'var(--text-sm)' }}>{t('loading')}</span>
    </div>
  )

  const steps = [
    { label: '1. INFO (HEADER)', short: '1', icon: 'fa-regular fa-file' },
    { label: '2. GOLD', short: '2', icon: 'fa-solid fa-coins' },
    { label: '3. STONES', short: '3', icon: 'fa-solid fa-gem' },
    { label: '4. SUMMARY', short: '4', icon: 'fa-solid fa-calculator' },
  ]

  return (
    <div>
      {/* Step indicator bar + RESET button */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: '1.5rem', border: '1px solid var(--border-base)', background: 'var(--bg-base)', overflowX: 'auto' }}>
        {steps.map((s, i) => {
          const isActive   = step === i + 1
          const isComplete = i < step - 1
          return (
            <button key={i}
              onClick={() => isComplete && setStep(i + 1)}
              style={{
                flex: 1, padding: '0.75rem 0.5rem', minWidth: 44,
                fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 400,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: isActive ? 'var(--text-primary)' : isComplete ? 'var(--color-success)' : 'var(--text-muted)',
                border: 'none',
                borderRight: i < steps.length - 1 ? '1px solid var(--border-base)' : 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                outline: 'none',
                background: isActive ? 'var(--bg-surface)' : 'transparent',
                cursor: isComplete ? 'pointer' : 'default',
                whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              {isComplete
                ? <i className="fa-solid fa-check" style={{ fontSize: 10 }} />
                : <i className={s.icon} style={{ fontSize: 10 }} />}
              <span className="step-label-full">{s.label}</span>
              <span className="step-label-short">{s.short}</span>
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
        <div className="step-enter" style={card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-regular fa-file" style={{ color: 'var(--text-secondary)', fontSize: 13 }} />
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>BOM Info (Header)</p>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {/* Row 1: DATE | PRODUCT TYPE | CUSTOMER NAME | SO/MO */}
            <div className="form-grid-4" style={{ marginBottom: '1rem' }}>
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
            <div className="form-grid-4" style={{ marginBottom: '1rem' }}>
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
            <div className="form-grid-4" style={{ marginBottom: '1rem' }}>
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
          <StepNav canNext={canGoNext()} onNext={() => setStep(2)} />
        </div>
      )}

      {/* ── STEP 2: GOLD ── */}
      {step === 2 && (
        <div className="step-enter" style={card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-coins" style={{ color: 'var(--text-secondary)', fontSize: 14 }} />Gold Materials
            </p>
            <button onClick={addGoldRow} style={{
              padding: '5px 14px', fontSize: 'var(--text-xs)', fontWeight: 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              border: '1px solid var(--color-success)', color: 'var(--color-success)',
              background: 'transparent', borderRadius: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)',
            }}>
              <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />ADD GOLD ROW
            </button>
          </div>
          <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr>
                  {['#', 'GOLD TYPE', 'COLOR', 'WEIGHT (GR)',
                    ...(canSeeAll ? ['PRICE/GR', 'SUBTOTAL'] : []),
                    'DELETE'
                  ].map(h => (
                    <th key={h} style={{ ...thStyle, textAlign: h === 'PRICE/GR' || h === 'SUBTOTAL' ? 'right' : 'left' }}>{h}</th>
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
                          borderRadius: 0, padding: '4px 9px',
                          cursor: 'pointer', color: 'var(--color-danger)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className="fa-solid fa-trash-can" style={{ fontSize: 13, lineHeight: 1 }} />
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
                    <tr style={{ background: 'var(--bg-muted)' }}>
                      <td colSpan={3} style={{ ...tdStyle, borderTop: '1px solid var(--border-base)', fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right', color: 'var(--text-secondary)', paddingRight: 10 }}>
                        {t('totalRow')}:
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

          <StepNav canNext={canGoNext()} onPrev={() => setStep(1)} onNext={() => setStep(3)}
            prevLabel="← BACK" nextLabel="NEXT →" />
        </div>
      )}

      {/* ── STEP 3: STONES ── */}
      {step === 3 && (
        <div className="step-enter" style={card}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-gem" style={{ color: 'var(--text-secondary)', fontSize: 13 }} />Stone Materials
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={openStoneTypeList} className="btn-outline" style={{ padding: '5px 14px', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <i className="fa-regular fa-gem" style={{ fontSize: 10 }} />STONE TYPES
              </button>
              <button onClick={addStoneRow} style={{
                padding: '5px 14px', fontSize: 'var(--text-xs)', fontWeight: 500,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                border: '1px solid var(--color-success)', color: 'var(--color-success)',
                background: 'transparent', borderRadius: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-body)',
              }}>
                <i className="fa-solid fa-plus" style={{ fontSize: 10 }} />ADD STONE ROW
              </button>
            </div>
          </div>
          <div style={{ padding: '1.5rem', overflow: 'visible' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 8 }}>
              Để trống nếu chỉ tính vàng. Group Code tự động tra giá khi nhập.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 28 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 84 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 120 }} />
                {canSeeAll && <col style={{ width: 100 }} />}
                <col style={{ width: 140 }} />
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr>
                  {['#', 'STONE TYPE (MASTER)', 'MM SIZE', 'CTW/1PC', 'QTY', 'CTW TOTAL', 'INPUT TYPE', 'GRADE ID',
                    ...(canSeeAll ? ['SELL PRICE'] : []),
                    'NOTE', 'DELETE'
                  ].map((h, i) => <th key={`sh-${i}`} style={{ ...thStyle, textAlign: h === 'SELL PRICE' || h === 'CTW TOTAL' ? 'right' : h === 'DELETE' || h === '#' ? 'center' : 'left' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {stoneRows.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, position: 'relative' }}>
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
                        <div className="dropdown-hp" style={{
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
                      {r.inputType === 'ct' ? (
                        <input type="text" style={tdInput} value={r.size} placeholder="VD: 20mm*14mm"
                          onChange={e => updateStone(r.id, 'size', e.target.value)} />
                      ) : (
                        <input type="number" style={tdInput} value={r.size} min="0" step="0.01" placeholder="0.00"
                          onChange={e => updateStone(r.id, 'size', e.target.value)} />
                      )}
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
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', paddingRight: 6,
                      color: r.gradeId ? 'var(--color-success)' : r.notFound ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                      {r.gradeId
                        ? r.gradeId
                        : r.notFound
                          ? <span title="Không tìm thấy size phù hợp trong dữ liệu">⚠ Không tìm thấy</span>
                          : '—'}
                    </td>
                    {/* Giá bán — cost-restricted */}
                    {canSeeAll && (
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', textAlign: 'right', paddingRight: 6 }}>
                        {r.giaBan > 0 ? fmt$(r.giaBan) : '—'}
                      </td>
                    )}
                    <td style={{ ...tdStyle, width: 140 }}>
                      <input
                        type="text"
                        style={tdInput}
                        value={r.note}
                        placeholder="Size/shape note..."
                        onChange={e => updateStone(r.id, 'note', e.target.value)}
                      />
                    </td>
                    <td style={{ ...tdStyle, width: 44, textAlign: 'center' }}>
                      {stoneRows.length > 1 ? (
                        <button onClick={() => removeStoneRow(r.id)} style={{
                          background: 'none', border: '1px solid var(--color-danger)',
                          borderRadius: 0, padding: '4px 9px',
                          cursor: 'pointer', color: 'var(--color-danger)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className="fa-solid fa-trash-can" style={{ fontSize: 13, lineHeight: 1 }} />
                        </button>
                      ) : <span />}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* TỔNG CỘNG footer */}
              {stoneRows.some(r => r.tlHot > 0 || (parseInt(r.qty) || 0) > 0) && (
                <tfoot>
                  <tr style={{ background: 'var(--bg-muted)' }}>
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
                    <td style={{ ...tdStyle, borderTop: '1px solid var(--border-base)' }} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <StepNav canNext={true} onPrev={() => setStep(2)} onNext={() => { setStep(4); calculate() }} prevLabel="← BACK" nextLabel="CALCULATE →" />
        </div>
      )}

      {/* ── STEP 4: BÁO GIÁ ── */}
      {step === 4 && (
        <div className="step-enter">
          {calcError && (
            <div style={{ borderLeft: '2px solid var(--color-danger)', padding: '10px 14px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />{calcError}
            </div>
          )}

          <div className="step4-grid" style={{ opacity: calculating ? 0.65 : 1, transition: 'opacity 0.2s' }}>
              {/* ── LEFT: BOM Info + Labor + SP Type ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ ...card, padding: '1.25rem 1.5rem', height: '100%' }}>
                  <h6 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: '0 0 1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Production Specs
                  </h6>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Total Stones:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{totalStoneQtyVal}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Total CTW:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{totalStoneTlVal.toFixed(3)}</strong>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '1rem 0' }} />

                  {/* Labor Hours (always visible; required only when hasStones) */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ ...lbl, marginBottom: 8 }}>
                      EST. LABOR HOURS{hasStones && <span style={{ color: 'var(--color-danger)' }}> *</span>}
                    </label>
                    <input
                      type="number" min="0" step="0.5" placeholder="0"
                      style={{ ...tdInput, width: '100%' }}
                      value={laborHours}
                      onChange={e => setLaborHours(e.target.value)}
                      onBlur={e => {
                        if (e.target.value !== lastCalcLaborHours.current) calculate()
                      }}
                    />
                  </div>

                  {/* SP Type */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ ...lbl, marginBottom: 8 }}>SP TYPE</label>
                    {hasStones ? (
                      <div style={{ ...tdInput, background: 'var(--bg-muted)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', cursor: 'not-allowed' }}>
                        TSTT
                      </div>
                    ) : (
                      <select style={{ ...selectBox }} value={spType} onChange={e => { const v = e.target.value; setSpType(v); calculate(v) }}>
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
                  <h6 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0, paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }} className={canSeeAll ? "" : "cost-restricted"}>
                    Cost Report
                    {calculating && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0, animation: 'pulse 1s ease-in-out infinite' }} />}
                  </h6>
                </div>
                <div style={{ padding: '1rem 1.5rem' }}>

                  {/* Cost rows — Admin/Manager only */}
                  {canSeeAll && pricing && (
                    <div style={{ marginBottom: 8 }}>
                      {[
                        ['Gold Cost',         pricing.costGold],
                        ['Stone Cost',        pricing.costStones],
                        ['Labor Cost (Labor)', pricing.costLabor],
                        ['CIF (Tax/Fee)',      pricing.costCif],
                      ].map(([l, v]) => (
                        <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{l as string}:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>{fmt$(Number(v))}</strong>
                        </div>
                      ))}

                      <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '0.5rem 0 1rem' }} />

                      {/* TOTAL COST — prominently red */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0 1rem' }}>
                        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>TOTAL COST:</span>
                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-danger)' }}>{fmt$(pricing.costTotal)}</strong>
                      </div>
                    </div>
                  )}

                  {/* Inline Discount — Admin/Manager only */}
                  {canSeeAll && pricing && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: 4 }}>
                        <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', flexShrink: 0 }}>
                          DISCOUNT
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

                  {/* EST. RETAIL PRICE */}
                  {pricing && (
                    <div style={{ background: '#F2F7F4', border: '1px solid #C3E6CB', borderRadius: 4, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        EST. RETAIL PRICE:
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
                        <span>÷ Total Cost (Markup x)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                          {pricing.costTotal > 0 ? ((discountedPrice ?? pricing.sellPrice) / pricing.costTotal).toFixed(2) + 'x' : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--text-secondary)' }}>
                        <span>− Total Cost (Profit)</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--color-success)' }}>
                          {pricing.costTotal > 0 ? fmt$((discountedPrice ?? pricing.sellPrice) - pricing.costTotal) : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Inline success banner — shown after save, stays in Step 4 so user can save again */}
                {savedBomId && (
                  <div className="fade-in" style={{ margin: '0 1.5rem 1rem', padding: '10px 14px', borderLeft: `2px solid ${approvalStatus === 'pending' ? 'var(--color-warning, #D97706)' : approvalStatus === 'approved' ? 'var(--color-success)' : approvalStatus === 'rejected' ? 'var(--color-danger)' : 'var(--color-success)'}`, background: '#F2F7F4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fa-solid fa-circle-check" />
                        {t('bomSavedLabel')}:&nbsp;<strong style={{ fontFamily: 'var(--font-mono)' }}>{savedBomId}</strong>
                        &nbsp;
                        {approvalStatus === 'draft' && <span style={{ fontSize: 10, border: '1px solid var(--border-base)', padding: '1px 6px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('approvalDraft')}</span>}
                        {approvalStatus === 'pending' && <span style={{ fontSize: 10, border: '1px solid #D97706', padding: '1px 6px', color: '#D97706', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('approvalPending')}</span>}
                        {approvalStatus === 'approved' && <span style={{ fontSize: 10, border: '1px solid var(--color-success)', padding: '1px 6px', color: 'var(--color-success)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('approvalApproved')}</span>}
                        {approvalStatus === 'rejected' && <span style={{ fontSize: 10, border: '1px solid var(--color-danger)', padding: '1px 6px', color: 'var(--color-danger)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('approvalRejected')}</span>}
                      </span>
                      {approvalStatus === 'rejected' && approvalNote && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
                          <i className="fa-solid fa-comment-dots" style={{ marginRight: 4 }} />
                          {approvalNote}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {canSubmit && (approvalStatus === 'draft' || approvalStatus === 'rejected') && (
                        <button
                          onClick={submitForApproval}
                          disabled={submitting}
                          className="btn-primary"
                          style={{ padding: '4px 12px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          {submitting
                            ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 10 }} />{t('submitting')}</>
                            : <><i className="fa-solid fa-paper-plane" style={{ fontSize: 10 }} />{approvalStatus === 'rejected' ? t('resubmitApproval') : t('submitApproval')}</>
                          }
                        </button>
                      )}
                      <button onClick={doReset} className="btn-outline" style={{ padding: '4px 12px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {t('btnNewBom')}
                      </button>
                      <a href="/dashboard/review" className="btn-outline" style={{ padding: '4px 12px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                        {t('btnHistory')}
                      </a>
                    </div>
                  </div>
                )}

                {/* Save error */}
                {saveError && (
                  <div style={{ margin: '0 1.5rem 1rem', borderLeft: '2px solid var(--color-danger)', padding: '8px 12px', color: 'var(--color-danger)', fontSize: 'var(--text-sm)', background: '#FAF2F2' }}>
                    {saveError}
                  </div>
                )}

                {/* Bottom action bar */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setStep(3)} className="btn-outline" style={{ padding: '8px 18px', flexShrink: 0, fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      ← BACK
                    </button>
                    {editLocked && (
                      <span style={{ fontSize: 'var(--text-xs)', color: '#D97706', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fa-solid fa-lock" style={{ fontSize: 10 }} />
                        {t('editLockedMsg')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {editBomId && !editLocked && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 4, border: '1px solid var(--btn-dark-bg)', background: 'var(--bg-surface)' }}>
                        <input type="checkbox" id="chkSaveAsNew" checked={saveAsNew} onChange={e => setSaveAsNew(e.target.checked)}
                          style={{ accentColor: 'var(--btn-dark-bg)', width: 14, height: 14, margin: 0 }} />
                        <label htmlFor="chkSaveAsNew" style={{ fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>
                          Save as new entry (no overwrite)
                        </label>
                      </div>
                    )}
                    <button onClick={saveBOM} className="btn-primary"
                      style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                      disabled={saving || fillLoading || !pricing || editLocked}>
                      {saving
                        ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 12 }} />SAVING...</>
                        : fillLoading
                          ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 12 }} />LOADING</>
                          : editBomId && !saveAsNew
                            ? <><i className="fa-solid fa-pen-to-square" style={{ fontSize: 12 }} />UPDATE BOM</>
                            : <><i className="fa-solid fa-save" style={{ fontSize: 12 }} />SAVE BOM</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* ── CONFIRM RESET DIALOG ── */}

      {confirmVisible && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-panel-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', width: '100%', maxWidth: 400 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-base)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>
                {t('confirm')} Reset
              </h3>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                {t('reset')} — {t('cannotUndo')}
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
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setShowStoneTypes(false)}>
          <div className="modal-panel" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', width: '100%', maxWidth: 780, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0.5rem 1.5rem' }}>
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
                      {['Group Code', t('colDisplayName')].map(h => (
                        <th key={h} style={{ ...thStyle, position: 'sticky', top: 0 }}>{h}</th>
                      ))}
                      <th style={{ ...thStyle, position: 'sticky', top: 0, whiteSpace: 'nowrap' }}>
                        {t('colFullName')} ({stoneTypeNameLang.toUpperCase()})
                        <button
                          onClick={() => setStoneTypeNameLang(l => l === 'vi' ? 'en' : 'vi')}
                          style={{ marginLeft: 6, padding: '1px 5px', fontSize: 9, border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-hover)', cursor: 'pointer', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 600 }}
                        >{stoneTypeNameLang === 'vi' ? 'EN' : 'VI'}</button>
                      </th>
                      {['Unit', 'Type'].map(h => (
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
                        <td style={{ ...tdStyle, padding: '6px 6px' }}>{s.displayName || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-secondary)', padding: '6px 6px' }}>{(stoneTypeNameLang === 'vi' ? s.viName : s.enName) || '—'}</td>
                        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', padding: '6px 6px', textAlign: 'center' }}>{s.unit || '—'}</td>
                        <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', padding: '6px 6px', textAlign: 'center' }}>{s.typeInput || '—'}</td>
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
  const { t } = useLang()
  const navBtn: React.CSSProperties = {
    border: '1px solid var(--btn-dark-bg)', padding: '8px 24px', borderRadius: 0,
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
    fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
  }
  return (
    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      {onPrev
        ? <button onClick={onPrev} style={{ ...navBtn, background: 'transparent', color: 'var(--text-primary)' }}>{prevLabel || t('btnBack')}</button>
        : <div />}
      {onNext && (
        <button onClick={onNext} style={{ ...navBtn, background: canNext ? 'var(--btn-dark-bg)' : 'var(--bg-muted)', color: 'var(--text-inverse)', cursor: canNext ? 'pointer' : 'not-allowed' }} disabled={!canNext}>
          {nextLabel || t('btnContinue')}
        </button>
      )}
    </div>
  )
}
