'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@/components/shared/UserContext'
import { useLang } from '@/components/shared/I18nContext'
import { useToast } from '@/components/shared/ToastContext'
import { fetchDriveDataUri, onTokenChange } from '@/lib/driveToken'

/* ── TYPES ─────────────────────────────────────────────────── */
interface BomRow {
  id: string; bom_id: string; date: string
  product_type: string; so_mo: string; model: string
  total_stone_qty: number; total_stone_ctw: number
  sell_price: number; discount_pct: number; discount_price: number
  cost_total: number; sales_person: string; store: string
  customer_name: string; created_by: string
  img1: string; img2: string; img3: string
}
interface BomDetail {
  header: Record<string, any>
  golds: Array<{ idx: number; gold_type: string; color: string; weight: number }>
  stones: Array<{ idx: number; group_code: string; grade_id: string; size: string; ctw1pc: number; qty: number; tl_hot: number; gia_ban: number; en_name?: string }>
}

/* ── HELPERS ─────────────────────────────────────────────────*/
function fmt$(n: number) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtPct(n: number) {
  if (!n) return ''
  const pct = n > 0 && n <= 1 ? n * 100 : n
  return pct.toFixed(1) + '%'
}
function discountPctNum(raw: number) {
  // stored as 0.05 for 5%
  return raw > 0 && raw <= 1 ? raw * 100 : raw
}

/* ── STYLE CONSTANTS ─────────────────────────────────────────*/
const th: React.CSSProperties = {
  fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--text-secondary)', fontWeight: 500,
  padding: '10px 12px', borderBottom: '1px solid var(--border-base)',
  background: 'var(--bg-base)', textAlign: 'left', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid var(--border-light)',
  fontSize: 'var(--text-sm)', color: 'var(--text-primary)', verticalAlign: 'middle',
}
const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border-base)', borderRadius: 0,
  background: 'var(--bg-surface)', padding: '6px 10px',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)', outline: 'none',
}
const PAGE_SIZE = 20

/* ── COMPONENT ───────────────────────────────────────────────*/
export default function ReviewPage() {
  const { role } = useUser()
  const { t } = useLang()
  const { toast, update, dismiss } = useToast()

  // GAS exact: cost-total-restricted = Admin/Manager only; cost-restricted = NOT Order; discount cols = all non-Order
  const showCostTotal = role === 'Admin' || role === 'Manager'
  const showSellPrice = role !== 'Order'
  const showStones    = role !== 'Sales' && role !== 'Sales Supervisor'
  const canDiscount   = role === 'Admin' || role === 'Manager' || role === 'Sales Supervisor'

  const [boms, setBoms] = useState<BomRow[]>([])
  const [loading, setLoading] = useState(true)
  const [vndRate, setVndRate] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [page, setPage] = useState(1)

  // Detail modal
  const [detailBomId, setDetailBomId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<BomDetail | null>(null)
  const [detailImages, setDetailImages] = useState<Record<string, string>>({})
  const [showDetailVnd, setShowDetailVnd] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  // Quotation modal
  const [quotBomId, setQuotBomId] = useState<string | null>(null)
  const [quotData, setQuotData] = useState<BomDetail | null>(null)
  const [quotLoading, setQuotLoading] = useState(false)
  const [quotImages, setQuotImages] = useState<Record<string, string>>({})

  // Discount modal
  const [discountBom, setDiscountBom] = useState<BomRow | null>(null)
  const [discountPct, setDiscountPct] = useState('')
  const [discountAmt, setDiscountAmt] = useState('')
  const [discountSaving, setDiscountSaving] = useState(false)
  const [discountError, setDiscountError] = useState('')
  const [discountSuccess, setDiscountSuccess] = useState('')
  const [mgrDiscCap, setMgrDiscCap] = useState(20)

  // Delete confirm dialog
  const [deleteBomId, setDeleteBomId] = useState<string | null>(null)

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // Table row thumbnails (async load after render)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})

  // Highlight newly saved/edited BOM row
  const [highlightedBomId, setHighlightedBomId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/config?key=VND_RATE').then(r => r.json()).then(d => { if (d.rate) setVndRate(Number(d.rate)) }).catch(() => {})
    fetch('/api/config?key=MANAGER_MAX_DISCOUNT').then(r => r.json()).then(d => { if (d.rate) setMgrDiscCap(Number(d.rate)) }).catch(() => {})

    // Check if tinh-gia just saved a BOM (same tab)
    try {
      const lastSaved = localStorage.getItem('bom_last_saved')
      if (lastSaved) {
        setHighlightedBomId(lastSaved)
        localStorage.removeItem('bom_last_saved')
      }
    } catch { /* ignore */ }

    loadBoms()

    // Listen for cross-tab save events
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bom_last_saved' && e.newValue) {
        setHighlightedBomId(e.newValue)
        loadBoms()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Auto-clear highlight after 4 seconds
  useEffect(() => {
    if (!highlightedBomId) return
    const timer = setTimeout(() => setHighlightedBomId(null), 4000)
    return () => clearTimeout(timer)
  }, [highlightedBomId])

  // Hide sticky header when any modal is open
  useEffect(() => {
    const anyOpen = !!(quotBomId || detailBomId || discountBom || deleteBomId || lightboxSrc)
    if (anyOpen) {
      document.body.classList.add('modal-open')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = ''
    }
    return () => {
      document.body.classList.remove('modal-open')
      document.body.style.overflow = ''
    }
  }, [quotBomId, detailBomId, discountBom, deleteBomId, lightboxSrc])

  async function loadBoms() {
    setLoading(true)
    const tid = toast('Loading BOM history...', 'loading')
    try {
      const r = await fetch('/api/bom')
      const d = await r.json()
      setBoms(d.data || [])
      update(tid, 'BOM history loaded', 'success')
    } catch { update(tid, 'Failed to load BOM history', 'danger') }
    finally { setLoading(false) }
  }

  /* ── Filtered list ─── */
  const filtered = useMemo(() => {
    return boms.filter(b => {
      const q = search.toLowerCase()
      if (q && !b.bom_id?.toLowerCase().includes(q)
             && !b.model?.toLowerCase().includes(q)
             && !b.so_mo?.toLowerCase().includes(q)
             && !b.product_type?.toLowerCase().includes(q)
             && !b.customer_name?.toLowerCase().includes(q)
             && !b.sales_person?.toLowerCase().includes(q)) return false
      if (dateFrom && b.date < dateFrom) return false
      if (dateTo && b.date > dateTo) return false
      if (storeFilter && !b.store?.toUpperCase().startsWith(storeFilter)) return false
      return true
    })
  }, [boms, search, dateFrom, dateTo, storeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* ── Detail modal ─── */
  async function openDetail(bomId: string) {
    setDetailBomId(bomId); setDetailData(null); setDetailLoading(true)
    const tid = toast(`Loading BOM data ${bomId}...`, 'loading')
    try {
      const d = await fetch(`/api/bom/${bomId}`).then(r => r.json())
      setDetailData(d)
      dismiss(tid)
    } catch { update(tid, 'Failed to load BOM detail', 'danger') }
    finally { setDetailLoading(false) }
  }
  function closeDetail() { setDetailBomId(null); setDetailData(null); setDetailImages({}); setShowDetailVnd(false) }

  useEffect(() => {
    if (!detailData) { setDetailImages({}); return }
    const h = detailData.header
    const urls = [h.img1, h.img2, h.img3].filter(Boolean) as string[]
    if (urls.length === 0) return
    const load = async () => {
      const results: Record<string, string> = {}
      await Promise.all(urls.map(async url => {
        const uri = await fetchDataUri(url)
        if (uri) results[url] = uri
      }))
      setDetailImages(results)
    }
    load()
    // Re-load images when Drive token becomes available
    return onTokenChange(load)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailData])

  /* ── Quotation images async load ─── */
  useEffect(() => {
    if (!quotData) { setQuotImages({}); return }
    const h = quotData.header
    const urls = [h.logoUrl, h.img1, h.img2, h.img3].filter(Boolean) as string[]
    if (urls.length === 0) return
    const load = async () => {
      const results: Record<string, string> = {}
      await Promise.all(urls.map(async url => {
        const uri = await fetchDataUri(url)
        if (uri) results[url] = uri
      }))
      setQuotImages(results)
    }
    load()
    // Re-load images when Drive token becomes available
    return onTokenChange(load)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotData])

  /* ── Thumbnail async load for table rows (GAS exact: async after render, 📷 placeholder) ── */
  useEffect(() => {
    const rows = paged.filter(b => b.img1 && !thumbUrls[b.bom_id])
    if (rows.length === 0) return
    const loadThumbs = () => {
      // Re-fetch all visible rows (including already-loaded ones) when token changes
      paged.filter(b => b.img1).forEach(async b => {
        const uri = await fetchDataUri(b.img1)
        if (uri) setThumbUrls(prev => ({ ...prev, [b.bom_id]: uri }))
      })
    }
    rows.forEach(async b => {
      const uri = await fetchDataUri(b.img1)
      if (uri) setThumbUrls(prev => ({ ...prev, [b.bom_id]: uri }))
    })
    // Re-load thumbnails when Drive token becomes available
    return onTokenChange(loadThumbs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged])

  /* ── Quotation modal ─── */
  async function openQuotation(bomId: string) {
    setQuotBomId(bomId); setQuotData(null); setQuotLoading(true)
    const tid = toast(`Loading quotation ${bomId}...`, 'loading')
    try {
      const d = await fetch(`/api/bom/${bomId}`).then(r => r.json())
      setQuotData(d)
      dismiss(tid)
    } catch { update(tid, 'Failed to load quotation', 'danger') }
    finally { setQuotLoading(false) }
  }
  function closeQuotation() { setQuotBomId(null); setQuotData(null); setQuotImages({}) }

  /* ── Discount modal ─── */
  function getMaxDisc() {
    if (role === 'Admin') return 100
    if (role === 'Manager') return mgrDiscCap
    return 20
  }

  function handleDiscPctChange(val: string) {
    setDiscountPct(val)
    if (!discountBom) return
    const maxPct = getMaxDisc()
    const pct = parseFloat(val)
    if (isNaN(pct) || pct < 0) { setDiscountAmt(''); return }
    const clamped = Math.min(pct, maxPct)
    setDiscountAmt((discountBom.sell_price * clamped / 100).toFixed(2))
  }

  function handleDiscAmtChange(val: string) {
    setDiscountAmt(val)
    if (!discountBom || discountBom.sell_price <= 0) return
    const maxPct = getMaxDisc()
    const amt = parseFloat(val)
    if (isNaN(amt) || amt < 0) { setDiscountPct(''); return }
    const maxAmt = discountBom.sell_price * maxPct / 100
    const clamped = Math.min(amt, maxAmt)
    setDiscountPct(((clamped / discountBom.sell_price) * 100).toFixed(2))
  }

  function openDiscount(b: BomRow) {
    setDiscountBom(b)
    const existing = discountPctNum(b.discount_pct)
    setDiscountPct(existing > 0 ? String(existing) : '')
    setDiscountAmt(existing > 0 ? (b.sell_price * existing / 100).toFixed(2) : '')
    setDiscountError(''); setDiscountSuccess('')
  }
  function closeDiscount() { setDiscountBom(null); setDiscountAmt(''); setDiscountError(''); setDiscountSuccess('') }

  async function applyDiscount() {
    if (!discountBom) return
    const pct = parseFloat(discountPct) || 0
    const maxPct = getMaxDisc()
    if (pct <= 0) { setDiscountError('Enter a discount percentage'); return }
    if (pct > 100) { setDiscountError('Discount must be 0–100%'); return }
    if (pct > maxPct) { setDiscountError(`Max discount is ${maxPct}% for your role`); return }
    setDiscountSaving(true); setDiscountError('')
    const newSellPrice = discountBom.sell_price * (1 - pct / 100)
    const tid = toast(`Applying ${pct}% discount to ${discountBom.bom_id}...`, 'loading')
    try {
      const r = await fetch(`/api/bom/${discountBom.bom_id}/discount`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountPct: pct, newSellPrice }),
      })
      const d = await r.json()
      if (!r.ok) { setDiscountError(d.error || 'Failed'); update(tid, d.error || 'Discount failed', 'danger'); return }
      setDiscountSuccess(`Applied. Price after discount: ${fmt$(newSellPrice)}`)
      update(tid, `Discount applied — ${fmt$(newSellPrice)} after ${pct}%`, 'success')
      loadBoms()
    } catch (e: any) { setDiscountError(e.message); update(tid, e.message, 'danger') }
    finally { setDiscountSaving(false) }
  }

  /* ── Delete BOM ─── */
  async function confirmDelete() {
    if (!deleteBomId) return
    const bomId = deleteBomId
    setDeleteBomId(null)
    const tid = toast(`Deleting BOM ${bomId}...`, 'loading')
    try {
      const r = await fetch(`/api/bom/${bomId}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) { update(tid, d.error || 'Delete failed', 'danger'); return }
      update(tid, `BOM ${bomId} deleted`, 'success')
      loadBoms()
    } catch { update(tid, 'Delete failed', 'danger') }
  }

  /* ── Image proxy helpers for print ─── */
  function extractDriveId(url: string): string | null {
    if (!url) return null
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    const pathMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    return idMatch?.[1] || pathMatch?.[1] || null
  }

  async function fetchDataUri(url: string): Promise<string> {
    if (!url) return ''
    const fileId = extractDriveId(url)
    if (!fileId) return ''
    // Try client-side Drive API first (works for private files when user is authenticated)
    const driveUri = await fetchDriveDataUri(fileId)
    if (driveUri) return driveUri
    // Fall back to server proxy (works for public "Anyone with link" files)
    try {
      const r = await fetch(`/api/images/proxy?fileId=${fileId}`)
      const d = await r.json()
      if (d.success) return `data:${d.contentType};base64,${d.base64}`
    } catch {}
    return ''
  }

  /* ── Print Quotation ─── */
  async function printQuotation() {
    if (!quotData) return
    const h = quotData.header
    const isVN = String(h.store || '').toUpperCase().startsWith('VN')
    const displayPrice = h.discount_pct > 0 ? h.discount_price : h.sell_price
    const vndAmt = (isVN && vndRate > 0)
      ? Math.ceil(displayPrice * vndRate / 100000) * 100000
      : null

    // Stone names: 2 words prefix, dedup
    const stoneNames = [...new Set(
      (quotData.stones || [])
        .map(s => (s.en_name || s.group_code || '').split(' ').slice(0, 2).join(' ').trim())
        .filter(Boolean)
    )].join(' + ')

    // Gold summary
    const goldTypes = [...new Set((quotData.golds || []).map(g => g.gold_type))].join(' + ')
    const goldColors = [...new Set((quotData.golds || []).map(g => g.color))].join(' + ')
    const totalWeight = (quotData.golds || []).reduce((s, g) => s + (Number(g.weight) || 0), 0)

    const dateStr = h.date ? new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() : ''

    // Pre-fetch images as data: URIs (required for print popup window)
    const [logoDataUri, img1Uri, img2Uri, img3Uri] = await Promise.all([
      fetchDataUri(h.logoUrl || ''),
      fetchDataUri(h.img1 || ''),
      fetchDataUri(h.img2 || ''),
      fetchDataUri(h.img3 || ''),
    ])

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Quotation - ${h.bom_id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Jost:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Jost', Arial, sans-serif; background: #F0EBE4; color: #1A1814; padding: 40px; max-width: 700px; margin: 0 auto; }
  .logo-wrap { margin-bottom: 20px; }
  .logo-wrap img { max-height: 110px; max-width: 280px; object-fit: contain; }
  .brand { font-family: 'Cormorant Garamond', serif; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: #6B645C; margin-bottom: 4px; }
  h1 { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 400; color: #1A1814; margin-bottom: 24px; letter-spacing: 0.05em; }
  hr { border: none; border-top: 1px solid #C8C3BB; margin: 20px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #DDD8CF; }
  .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6B645C; }
  .info-val { font-size: 13px; color: #1A1814; }
  .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: #6B645C; margin: 20px 0 10px; border-bottom: 1px solid #DDD8CF; padding-bottom: 4px; }
  .material-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #DDD8CF; font-size: 13px; }
  .price-box { background: #e91d79; color: #fff; padding: 18px 20px; margin-top: 24px; }
  .price-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.85; margin-bottom: 6px; }
  .price-main { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 400; }
  .price-sub { font-size: 14px; opacity: 0.85; margin-top: 4px; }
  .date-footer { margin-top: 28px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6B645C; }
  @media print {
    body { background: white; padding: 20px; }
    .price-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  ${logoDataUri ? `<div class="logo-wrap"><img src="${logoDataUri}" alt="Logo"/></div>` : ''}
  <div class="brand">JEWELRY BOM TEMPLATE</div>
  <h1>BÁO GIÁ / QUOTATION</h1>
  <hr/>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
    <div style="flex:1">
      ${h.date ? `<div class="info-row"><span class="info-label">Date</span><span class="info-val">${h.date}</span></div>` : ''}
      ${h.product_type ? `<div class="info-row"><span class="info-label">Product Type</span><span class="info-val">${h.product_type}</span></div>` : ''}
      ${h.customer_name ? `<div class="info-row"><span class="info-label">Customer</span><span class="info-val">${h.customer_name}</span></div>` : ''}
      ${h.so_mo ? `<div class="info-row"><span class="info-label">SO / MO</span><span class="info-val">${h.so_mo}</span></div>` : ''}
      ${h.model ? `<div class="info-row"><span class="info-label">Model</span><span class="info-val">${h.model}</span></div>` : ''}
      ${h.sales_person ? `<div class="info-row"><span class="info-label">Salesperson</span><span class="info-val">${h.sales_person}</span></div>` : ''}
      ${h.store ? `<div class="info-row"><span class="info-label">Store</span><span class="info-val">${h.store}</span></div>` : ''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${img1Uri ? `<img src="${img1Uri}" style="max-height:90px;max-width:90px;object-fit:cover;border:1px solid #C8C3BB" alt=""/>` : ''}
      ${img2Uri ? `<img src="${img2Uri}" style="max-height:90px;max-width:90px;object-fit:cover;border:1px solid #C8C3BB" alt=""/>` : ''}
      ${img3Uri ? `<img src="${img3Uri}" style="max-height:90px;max-width:90px;object-fit:cover;border:1px solid #C8C3BB" alt=""/>` : ''}
    </div>
  </div>

  <div class="section-title">CHẤT LIỆU / MATERIAL</div>
  ${goldTypes ? `<div class="material-row"><span class="info-label">Gold Type</span><span>${goldTypes}</span></div>` : ''}
  ${goldColors ? `<div class="material-row"><span class="info-label">Color</span><span>${goldColors}</span></div>` : ''}
  ${totalWeight > 0 ? `<div class="material-row"><span class="info-label">Total Weight</span><span>${totalWeight.toFixed(2)} gr</span></div>` : ''}
  ${stoneNames ? `<div class="material-row"><span class="info-label">Stones</span><span>${stoneNames}</span></div>` : ''}

  <div class="section-title">THÔNG TIN BÁO GIÁ</div>
  ${h.price_list_type ? `<div class="material-row"><span class="info-label">Price List</span><span>${h.price_list_type}</span></div>` : ''}
  ${h.note ? `<div class="material-row"><span class="info-label">Note</span><span>${h.note}</span></div>` : ''}

  <div class="price-box">
    <div class="price-label">GIÁ BÁN LẺ DỰ KIẾN / ESTIMATED RETAIL PRICE</div>
    ${vndAmt ? `<div class="price-main">${vndAmt.toLocaleString('vi-VN')} VND</div>` : ''}
    <div class="price-${vndAmt ? 'sub' : 'main'}">${fmt$(displayPrice)}</div>
  </div>

  <div class="date-footer">${dateStr}</div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 900)
  }

  /* ── Print Detail ─── */
  async function printDetail() {
    if (!detailData) return
    const h = detailData.header
    const effectiveSell = h.discount_pct > 0 ? h.discount_price : h.sell_price
    const isVN = String(h.store || '').toUpperCase().startsWith('VN')
    const vndAmt = (isVN && vndRate > 0)
      ? Math.ceil(effectiveSell * vndRate / 100000) * 100000 : null

    const [img1Uri, img2Uri, img3Uri] = await Promise.all([
      fetchDataUri(h.img1 || ''), fetchDataUri(h.img2 || ''), fetchDataUri(h.img3 || ''),
    ])

    const goldRows = (detailData.golds || []).map(g =>
      `<tr><td>${g.idx}</td><td>${g.gold_type}</td><td>${g.color}</td><td style="font-family:monospace">${g.weight} gr</td></tr>`
    ).join('')

    const stoneRows = showStones ? (detailData.stones || []).map(s =>
      `<tr><td>${s.idx}</td><td>${s.group_code}</td><td style="font-family:monospace">${s.ctw1pc}</td><td style="font-family:monospace">${s.qty}</td><td style="font-family:monospace">${(s.tl_hot || 0).toFixed(3)}</td>${showCostTotal ? `<td style="font-family:monospace">${fmt$(s.gia_ban)}</td>` : ''}</tr>`
    ).join('') : ''

    const costRows = showCostTotal ? [
      ['Gold Cost', h.cost_gold], ['Stone Cost', h.cost_stones], ['Labor Cost', h.cost_labor],
      ['Subtotal', h.cost_subtotal], ['CIF', h.cost_cif], ['Total Cost', h.cost_total],
    ].map(([l, v]) =>
      `<div class="cr"><span class="cl">${l}</span><span class="cv">${fmt$(Number(v))}</span></div>`
    ).join('') : ''

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>BOM ${h.bom_id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Jost:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Jost',Arial,sans-serif;background:#fff;color:#1A1814;padding:28px;max-width:880px;margin:0 auto;font-size:12px}
  h1{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:400;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  th{background:#F0EBE4;color:#6B645C;font-size:9px;text-transform:uppercase;letter-spacing:.1em;padding:6px 8px;border-bottom:1px solid #C8C3BB;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #DDD8CF;font-size:11px}
  .sec{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#6B645C;margin:14px 0 6px;border-bottom:1px solid #DDD8CF;padding-bottom:3px}
  .cr{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #DDD8CF}
  .cl{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6B645C}
  .cv{font-family:monospace;font-size:11px}
  .sell{display:flex;justify-content:space-between;padding:8px 0 3px;border-top:1px solid #1A1814;margin-top:3px}
  @media print{body{padding:14px}}
</style></head><body>
<h1>BOM Detail — ${h.bom_id}</h1>
<div style="display:flex;gap:8px;margin-bottom:14px">
  ${[img1Uri, img2Uri, img3Uri].filter(Boolean).map(u => `<img src="${u}" style="height:75px;object-fit:cover;border:1px solid #C8C3BB" alt=""/>`).join('')}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-bottom:14px">
  ${[['Date',h.date],['SO/MO',h.so_mo],['Model',h.model],['Product Type',h.product_type],
     ['Price List',h.price_list_type],['Salesperson',h.sales_person],['Store',h.store],['Customer',h.customer_name]
    ].filter(([,v])=>v).map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #DDD8CF">
    <span style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#6B645C">${l}</span>
    <span style="font-size:11px">${v}</span></div>`).join('')}
  ${h.note ? `<div style="grid-column:span 2;padding:3px 0;border-bottom:1px solid #DDD8CF"><span style="font-size:9px;text-transform:uppercase;color:#6B645C;display:block">Note</span><span>${h.note}</span></div>` : ''}
</div>
${detailData.golds?.length > 0 ? `<div class="sec">Vàng (Gold)</div>
<table><thead><tr><th>#</th><th>Type</th><th>Color</th><th>Weight</th></tr></thead>
<tbody>${goldRows}</tbody></table>` : ''}
${showStones && detailData.stones?.length > 0 ? `<div class="sec">Hột đá (Stones)</div>
<table><thead><tr><th>#</th><th>Group</th><th>CTW/pc</th><th>Qty</th><th>TL Hột</th>${showCostTotal ? '<th>Price</th>' : ''}</tr></thead>
<tbody>${stoneRows}</tbody></table>` : ''}
${showCostTotal ? `<div class="sec">Chi phí (Costs)</div>
<div style="background:#F0EBE4;border:1px solid #DDD8CF;padding:12px">
  ${costRows}
  <div class="sell"><span style="font-weight:600;font-size:12px;text-transform:uppercase">Sell Price</span>
    <span style="font-size:16px;font-family:'Cormorant Garamond',serif">${fmt$(h.sell_price)}</span></div>
  ${h.discount_pct > 0 ? `<div class="cr" style="color:#4A7C59"><span>Discount (${fmtPct(h.discount_pct)})</span><span style="font-family:monospace">${fmt$(h.discount_price)}</span></div>` : ''}
  ${vndAmt ? `<div style="margin-top:6px;font-size:11px;color:#6B645C">Est. VND: ${vndAmt.toLocaleString('vi-VN')} ₫</div>` : ''}
</div>` : ''}
</body></html>`

    const win = window.open('', '_blank', 'width=900,height=1000,toolbar=0,scrollbars=1,status=0')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.print() }, 900)
  }


  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 16, color: 'var(--text-secondary)' }} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>{t('reviewTitle')}</h2>
        </div>
        <button onClick={loadBoms}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', padding: '6px 14px', fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent', border: '1px solid #4A6B8C', color: '#4A6B8C', borderRadius: 0 }}>
          <i className="fa-solid fa-rotate" style={{ fontSize: 11 }} />{t('refresh')}
        </button>
      </div>

      {/* Search bar — full width */}
      <div style={{ marginBottom: '0.75rem' }}>
        <input
          style={{ border: '1px solid var(--border-base)', padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', background: 'var(--bg-surface)', outline: 'none', width: '100%', borderRadius: 0, color: 'var(--text-primary)', boxSizing: 'border-box' }}
          placeholder={t('searchPlh')}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Filter bar — date + store filters */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          <input type="date" style={{ ...inputStyle, width: '100%' }} value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
          <input type="date" style={{ ...inputStyle, width: '100%' }} value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }} />
          <select style={{ ...inputStyle, width: '100%' }} value={storeFilter}
            onChange={e => { setStoreFilter(e.target.value); setPage(1) }}>
            <option value="">{t('allStores')}</option>
            {['VN', 'US', 'ADM'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {filtered.length} results {filtered.length !== boms.length && `(of ${boms.length} total)`}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr>
                {[
                  '', t('colDate'), t('colSoMo'), t('colModel'), t('colProductType'),
                  ...(showCostTotal ? [t('colCost')] : []),
                  ...(showSellPrice ? [t('colSell'), t('colDisc'), t('colAfterDisc')] : []),
                  t('colSalesperson'), t('colStore'), t('colActions')
                ].map((h, i) => <th key={i} style={h ? th : { ...th, width: 48 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5 + (showCostTotal ? 1 : 0) + (showSellPrice ? 3 : 0) + 3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />{t('loading')}
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={5 + (showCostTotal ? 1 : 0) + (showSellPrice ? 3 : 0) + 3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noData')}</td></tr>
              ) : paged.map(b => (
                <tr key={b.bom_id}
                  style={{
                    background: b.bom_id === highlightedBomId ? '#F5EDD8' : '',
                    transition: 'background 1.5s ease',
                  }}
                  onMouseEnter={e => { if (b.bom_id !== highlightedBomId) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = b.bom_id === highlightedBomId ? '#F5EDD8' : '' }}>
                  {/* Thumbnail */}
                  <td style={{ ...td, width: 48, padding: '4px 6px', textAlign: 'center' }}>
                    {thumbUrls[b.bom_id]
                      ? <img src={thumbUrls[b.bom_id]} alt="" onClick={() => openDetail(b.bom_id)}
                          style={{ width: 36, height: 36, objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--border-light)', display: 'block' }} />
                      : b.img1
                        ? <span style={{ fontSize: 18, cursor: 'pointer', display: 'block' }} onClick={() => openDetail(b.bom_id)}>📷</span>
                        : null
                    }
                  </td>
                  <td style={{ ...td, color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>{b.date}</td>
                  <td style={{ ...td, fontSize: 'var(--text-xs)' }}>{b.so_mo || '—'}</td>
                  <td style={td}>{b.model || '—'}</td>
                  {/* Product Type */}
                  <td style={{ ...td, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{b.product_type || '—'}</td>
                  {showCostTotal && (
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#9B4040' }}>{fmt$(b.cost_total)}</td>
                  )}
                  {showSellPrice && <>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right', color: '#4A7C59' }}>{fmt$(b.sell_price)}</td>
                    <td style={{ ...td, fontSize: 'var(--text-xs)', color: b.discount_pct ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {b.discount_pct ? fmtPct(b.discount_pct) : '—'}
                    </td>
                    <td style={{ ...td, fontFamily: 'var(--font-mono)', textAlign: 'right', color: b.discount_price > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {b.discount_price > 0 ? fmt$(b.discount_price) : '—'}
                    </td>
                  </>}
                  <td style={{ ...td, color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{b.sales_person || '—'}</td>
                  <td style={td}>
                    <span style={{ border: '1px solid var(--border-base)', padding: '1px 8px', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                      {b.store || '—'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      {/* View Quotation — all roles */}
                      <button onClick={() => openQuotation(b.bom_id)}
                        title="Xem Báo Giá"
                        style={{ background: 'none', border: '1px solid #e91d79', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#e91d79' }}>
                        <i className="fa-solid fa-file-invoice" />
                      </button>
                      {/* Detail — all roles */}
                      <button onClick={() => openDetail(b.bom_id)}
                        title="Chi tiết"
                        style={{ background: 'none', border: '1px solid var(--border-base)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>
                        <i className="fa-solid fa-eye" />
                      </button>
                      {/* Copy as Template — roles that can access tinh-gia */}
                      {role !== 'Sales' && role !== 'Sales Supervisor' && (
                        <a href={`/dashboard/tinh-gia?template=${b.bom_id}`} title="Copy as Template"
                          style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: '1px solid #4A6B8C', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#4A6B8C', textDecoration: 'none' }}>
                          <i className="fa-solid fa-copy" />
                        </a>
                      )}
                      {/* Discount — Admin + Manager only */}
                      {canDiscount && (
                        <button onClick={() => openDiscount(b)}
                          title="Chiết Khấu"
                          style={{ background: 'none', border: '1px solid var(--color-warning)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--color-warning)' }}>
                          <i className="fa-solid fa-percent" />
                        </button>
                      )}
                      {/* Edit — not Sales, not Sales Supervisor (GAS exact) */}
                      {role !== 'Sales' && role !== 'Sales Supervisor' && (
                        <a href={`/dashboard/tinh-gia?edit=${b.bom_id}`} title="Edit"
                          style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: '1px solid #8C7340', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#8C7340', textDecoration: 'none' }}>
                          <i className="fa-solid fa-pen-to-square" />
                        </a>
                      )}
                      {/* Delete — Admin only */}
                      {role === 'Admin' && (
                        <button onClick={() => setDeleteBomId(b.bom_id)} title="Delete"
                          style={{ background: 'none', border: '1px solid var(--color-danger)', borderRadius: 0, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--color-danger)' }}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '10px 1rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left: record range */}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {filtered.length === 0 ? '0 records' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length} records`}
          </span>
          {/* Right: page nav */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <select
                defaultValue={PAGE_SIZE}
                style={{ border: '1px solid var(--border-base)', background: 'var(--bg-surface)', padding: '3px 6px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)', borderRadius: 0, outline: 'none', cursor: 'pointer' }}
                >
                <option value={20}>20 / page</option>
              </select>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ border: '1px solid var(--border-base)', background: 'none', padding: '4px 10px', cursor: page === 1 ? 'default' : 'pointer', fontSize: 'var(--text-xs)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: 0 }}>
                ‹
              </button>
              <span style={{ border: '1px solid var(--border-base)', padding: '4px 12px', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}>
                {page}/{totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ border: '1px solid var(--border-base)', background: 'none', padding: '4px 10px', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 'var(--text-xs)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', borderRadius: 0 }}>
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── QUOTATION MODAL ──────────────────────────────────── */}
      {quotBomId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && closeQuotation()}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: '100%', maxWidth: 660, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>
                {t('quotationTitle')}
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={printQuotation}
                  disabled={quotLoading || !quotData}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e91d79', color: '#fff', border: '1px solid #e91d79', borderRadius: 0, padding: '7px 16px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', opacity: (quotLoading || !quotData) ? 0.6 : 1 }}>
                  <i className="fa-solid fa-print" style={{ fontSize: 11 }} />{t('printPDF')}
                </button>
                <button onClick={closeQuotation} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              {quotLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />{t('loading')}
                </div>
              ) : quotData && (() => {
                const h = quotData.header
                const isVN = String(h.store || '').toUpperCase().startsWith('VN')
                const displayPrice = h.discount_pct > 0 ? h.discount_price : h.sell_price
                const vndAmt = (isVN && vndRate > 0)
                  ? Math.ceil(displayPrice * vndRate / 100000) * 100000
                  : null

                const stoneNames = [...new Set(
                  (quotData.stones || [])
                    .map(s => (s.en_name || s.group_code || '').split(' ').slice(0, 2).join(' ').trim())
                    .filter(Boolean)
                )].join(' + ')

                const goldTypes  = [...new Set((quotData.golds || []).map(g => g.gold_type))].join(' + ')
                const goldColors = [...new Set((quotData.golds || []).map(g => g.color))].join(' + ')
                const totalWeight = (quotData.golds || []).reduce((s, g) => s + Number(g.weight), 0)

                return (
                  <div>
                    {/* Logo */}
                    {h.logoUrl && quotImages[h.logoUrl] && (
                      <div style={{ marginBottom: 16 }}>
                        <img src={quotImages[h.logoUrl]} alt="Logo" style={{ maxHeight: 110, maxWidth: 280, objectFit: 'contain' }} />
                      </div>
                    )}

                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      JEWELRY BOM TEMPLATE
                    </p>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 400, color: 'var(--text-primary)', marginBottom: 20 }}>
                      BÁO GIÁ / QUOTATION
                    </h2>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-base)', marginBottom: 20 }} />

                    {/* Info + Images */}
                    <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                      <div style={{ flex: 1 }}>
                        {[
                          ['Date', h.date],
                          ['Product Type', h.product_type],
                          ['Customer', h.customer_name],
                          ['SO / MO', h.so_mo],
                          ['Model', h.model],
                          ['Salesperson', h.sales_person],
                          ['Store', h.store],
                        ].filter(([, v]) => v).map(([l, v]) => (
                          <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>{l}</span>
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                      {(h.img1 || h.img2 || h.img3) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {[h.img1, h.img2, h.img3].filter(Boolean).map((url, i) => (
                            quotImages[url]
                              ? <img key={i} src={quotImages[url]} alt={`img${i+1}`}
                                  style={{ width: 80, height: 80, objectFit: 'cover', border: '1px solid var(--border-base)' }} />
                              : <div key={i} style={{ width: 80, height: 80, border: '1px solid var(--border-base)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 18 }}>
                                  <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 14 }} />
                                </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Material */}
                    <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)', marginBottom: 8, borderBottom: '1px solid var(--border-light)', paddingBottom: 4 }}>
                      {t('quotMaterial')}
                    </p>
                    {goldTypes && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{t('quotGoldType')}</span>
                      <span>{goldTypes}</span>
                    </div>}
                    {goldColors && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{t('quotColor')}</span>
                      <span>{goldColors}</span>
                    </div>}
                    {totalWeight > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{t('quotWeight')}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{totalWeight.toFixed(2)} gr</span>
                    </div>}
                    {stoneNames && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Stones</span>
                      <span>{stoneNames}</span>
                    </div>}

                    {/* Price info */}
                    <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)', marginTop: 20, marginBottom: 8, borderBottom: '1px solid var(--border-light)', paddingBottom: 4 }}>
                      {t('quotInfo')}
                    </p>
                    {h.price_list_type && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Price List</span>
                      <span>{h.price_list_type}</span>
                    </div>}
                    {h.note && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Note</span>
                      <span style={{ textAlign: 'right', maxWidth: '60%' }}>{h.note}</span>
                    </div>}

                    {/* Price footer */}
                    <div style={{ background: '#e91d79', color: '#fff', padding: '18px 20px', marginTop: 24 }}>
                      <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.14em', opacity: 0.85, marginBottom: 6 }}>
                        {t('quotRetailPrice')}
                      </p>
                      {vndAmt && (
                        <p style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)', fontWeight: 400, marginBottom: 4 }}>
                          {vndAmt.toLocaleString('vi-VN')} VND
                        </p>
                      )}
                      <p style={{ fontFamily: vndAmt ? 'var(--font-body)' : 'var(--font-heading)', fontSize: vndAmt ? 'var(--text-base)' : 'var(--text-2xl)', opacity: vndAmt ? 0.85 : 1 }}>
                        {fmt$(displayPrice)}
                      </p>
                    </div>

                    {h.date && (
                      <p style={{ marginTop: 24, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ─────────────────────────────────────── */}
      {detailBomId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && closeDetail()}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>

            {/* Close button — floating top-right */}
            <button onClick={closeDetail} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, zIndex: 1, lineHeight: 1 }}>
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Body */}
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 8 }} />{t('loading')}
                </div>
              ) : detailData && (() => {
                const h = detailData.header
                const effectiveSell = h.discount_pct > 0 ? h.discount_price : h.sell_price
                const isVNStore = String(h.store || '').toUpperCase().startsWith('VN')
                const vndAmt = (isVNStore && vndRate > 0 && showDetailVnd)
                  ? Math.ceil(effectiveSell * vndRate / 100000) * 100000
                  : null
                const iL: React.CSSProperties = { padding: '5px 10px 5px 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', whiteSpace: 'nowrap', width: 1 }
                const iV: React.CSSProperties = { padding: '5px 16px 5px 6px', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }
                return (
                  <>
                    {/* Info table + thumbnails */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr>
                              <td style={iL}>BOM ID</td>
                              <td style={iV}>
                                <span style={{ background: 'var(--text-primary)', color: 'var(--text-inverse)', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', letterSpacing: '0.05em' }}>{detailBomId}</span>
                              </td>
                              <td style={iL}>Date</td>
                              <td style={{ ...iV, paddingRight: 0 }}>{h.date}</td>
                            </tr>
                            <tr>
                              <td style={iL}>Product Type</td>
                              <td style={iV}>{h.product_type || '—'}</td>
                              <td style={iL}>SO / MO</td>
                              <td style={{ ...iV, fontWeight: 600, paddingRight: 0 }}>{h.so_mo || '—'}</td>
                            </tr>
                            <tr>
                              <td style={iL}>Model</td>
                              <td style={iV}>{h.model || '—'}</td>
                              <td style={iL}>Customer</td>
                              <td style={{ ...iV, paddingRight: 0 }}>{h.customer_name || '—'}</td>
                            </tr>
                            <tr>
                              <td style={iL}>Salesperson</td>
                              <td style={iV}>{h.sales_person || '—'}</td>
                              <td style={iL}>Store</td>
                              <td style={{ ...iV, paddingRight: 0 }}>{h.store || '—'}</td>
                            </tr>
                            <tr>
                              <td style={iL}>Price List</td>
                              <td style={iV}>{h.price_list_type || '—'}</td>
                              <td style={iL}>SP Type</td>
                              <td style={{ ...iV, paddingRight: 0 }}>{h.sp_type || '—'}</td>
                            </tr>
                            <tr>
                              <td style={iL}>Labor Hrs</td>
                              <td style={iV}>{h.labor_hours ?? '—'}</td>
                              <td style={iL}>Note</td>
                              <td style={{ ...iV, paddingRight: 0 }}>{h.note || '—'}</td>
                            </tr>
                            <tr>
                              <td style={{ ...iL, borderBottom: 'none' }}>Folder</td>
                              <td style={{ ...iV, borderBottom: 'none', paddingRight: 0 }} colSpan={3}>
                                {h.folder_url
                                  ? <a href={h.folder_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4A6B8C', fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>{h.folder_url}</a>
                                  : '—'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Thumbnails — top right of info block */}
                      {(h.img1 || h.img2 || h.img3) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                          {[h.img1, h.img2, h.img3].filter(Boolean).map((url: string, i: number) => (
                            detailImages[url]
                              ? <img key={i} src={detailImages[url]} alt={`img${i+1}`}
                                  onClick={() => setLightboxSrc(detailImages[url])}
                                  style={{ width: 72, height: 72, objectFit: 'cover', border: '1px solid var(--border-base)', cursor: 'zoom-in', borderRadius: 2 }} />
                              : <div key={i} style={{ width: 72, height: 72, border: '1px solid var(--border-base)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                  <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 14 }} />
                                </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Gold table */}
                    {detailData.golds?.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#B8860B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px' }}>
                          <span>🪙</span><span>Gold</span>
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                          <thead><tr>{['#', 'Type', 'Color', 'Weight (gr)'].map(h => <th key={h} style={{ ...th, padding: '6px 8px' }}>{h}</th>)}</tr></thead>
                          <tbody>
                            {detailData.golds.map(g => (
                              <tr key={g.idx}>
                                <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)', padding: '6px 8px' }}>{g.idx}</td>
                                <td style={{ ...td, padding: '6px 8px' }}>{g.gold_type}</td>
                                <td style={{ ...td, padding: '6px 8px' }}>{g.color}</td>
                                <td style={{ ...td, padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{g.weight}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Stone table — hidden for Sales/Supervisor */}
                    {showStones && detailData.stones?.length > 0 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fa-regular fa-gem" style={{ fontSize: 10 }} /><span>Hột đá</span>
                        </p>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: 500 }}>
                            <thead><tr>
                              {['#', 'Group', 'Size', 'CTW/pc', 'Qty', 'TL Hột', ...(showCostTotal ? ['Price'] : [])].map(h => (
                                <th key={h} style={{ ...th, padding: '6px 8px' }}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>
                              {detailData.stones.map(s => (
                                <tr key={s.idx}>
                                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)', padding: '6px 8px' }}>{s.idx}</td>
                                  <td style={{ ...td, padding: '6px 8px' }}><span title={s.en_name}>{s.group_code}</span></td>
                                  <td style={{ ...td, padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{s.size}</td>
                                  <td style={{ ...td, padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{s.ctw1pc}</td>
                                  <td style={{ ...td, padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{s.qty}</td>
                                  <td style={{ ...td, padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{s.tl_hot?.toFixed(3)}</td>
                                  {showCostTotal && <td style={{ ...td, padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{fmt$(s.gia_ban)}</td>}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Cost breakdown — Admin/Manager only */}
                    {showCostTotal && (
                      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border-light)', padding: '0.875rem 1.25rem', borderRadius: 4, marginBottom: '1rem' }}>
                        {[
                          ['Gold Cost', h.cost_gold],
                          ['Stone Cost', h.cost_stones],
                          ['Labor Cost', h.cost_labor],
                          ['Subtotal', h.cost_subtotal],
                          ['CIF', h.cost_cif],
                          ['Total Cost', h.cost_total],
                        ].map(([l, v]) => (
                          <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>{l}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{fmt$(Number(v))}</span>
                          </div>
                        ))}
                        {(() => {
                          const costTotal = h.cost_total
                          if (costTotal <= 0) return null
                          const ratio = effectiveSell / costTotal
                          const profit = effectiveSell - costTotal
                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>Markup Ratio</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{ratio.toFixed(2)}×</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>Gross Profit</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>{fmt$(profit)}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {/* Sell Price panel — visible to all except Order */}
                    {showSellPrice && (
                      <div style={{ border: '1px solid var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', background: 'var(--bg-surface)' }}>
                          <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {h.discount_pct > 0 ? 'After Discount' : 'Sell Price'}
                          </span>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', color: 'var(--color-success)', fontWeight: 400 }}>
                            {fmt$(effectiveSell)}
                          </span>
                        </div>
                        {h.discount_pct > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 1.25rem', background: 'var(--bg-base)', borderTop: '1px solid var(--border-light)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
                              Original · Discount {fmtPct(h.discount_pct)}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{fmt$(h.sell_price)}</span>
                          </div>
                        )}
                        {vndAmt !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1.25rem', background: '#F5EDD8', borderTop: '1px solid var(--border-light)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-warning)', fontWeight: 500 }}>
                              Est. VND Price
                            </span>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', color: 'var(--color-warning)', fontWeight: 400 }}>
                              {vndAmt.toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              {/* VND toggle — only shown for VN store BOMs with a VND rate set */}
              {detailData && (() => {
                const isVN = String(detailData.header.store || '').toUpperCase().startsWith('VN')
                if (!isVN || vndRate <= 0) return <div />
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* CSS toggle switch */}
                    <div onClick={() => setShowDetailVnd(v => !v)}
                      style={{ width: 36, height: 20, borderRadius: 10, background: showDetailVnd ? '#4A6B8C' : 'var(--border-base)', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: showDetailVnd ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', cursor: 'default' }}>Show VND price</span>
                    <span style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-base)', padding: '1px 10px', borderRadius: 10, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      $1 = {vndRate.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                )
              })()}
              {!detailData && <div />}

              <div style={{ display: 'flex', gap: 8 }}>
                {detailData && !detailLoading && (
                  <button onClick={printDetail}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--btn-dark-bg)', color: 'var(--text-inverse)', border: '1px solid var(--btn-dark-bg)', borderRadius: 0, padding: '7px 16px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    <i className="fa-solid fa-print" style={{ fontSize: 11 }} /> PRINT / PDF
                  </button>
                )}
                <button onClick={closeDetail}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 0, padding: '7px 16px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  CLOSE
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── DISCOUNT MODAL ───────────────────────────────────── */}
      {discountBom && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && closeDiscount()}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '1.5rem', width: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0 }}>{t('applyDiscountTitle')}</h3>
              <button onClick={closeDiscount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 4 }}>
              {discountBom.bom_id}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              {fmt$(discountBom.sell_price)}
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
                  {t('labelDiscount')}
                </label>
                {role !== 'Admin' && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Max: {getMaxDisc()}%</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" min="0" max={getMaxDisc()} step="0.5"
                  style={{ border: '1px solid var(--border-base)', borderRadius: 0, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', color: 'var(--text-primary)', outline: 'none', width: 80 }}
                  value={discountPct} onChange={e => handleDiscPctChange(e.target.value)} placeholder="0"
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>%</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: '0 2px' }}>=</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>$</span>
                <input
                  type="number" min="0" step="0.01"
                  style={{ border: '1px solid var(--border-base)', borderRadius: 0, padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', color: 'var(--text-primary)', outline: 'none', width: 100 }}
                  value={discountAmt} onChange={e => handleDiscAmtChange(e.target.value)} placeholder="0.00"
                />
              </div>
              {discountPct && !isNaN(parseFloat(discountPct)) && parseFloat(discountPct) > 0 && (
                <div style={{ marginTop: 8, padding: '7px 10px', background: 'var(--bg-base)', borderLeft: '2px solid var(--color-success)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Price after: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-success)' }}>
                    {fmt$(discountBom.sell_price * (1 - parseFloat(discountPct) / 100))}
                  </span>
                </div>
              )}
            </div>

            {discountError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginBottom: 8 }}>{discountError}</div>}
            {discountSuccess && <div style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)', marginBottom: 8 }}><i className="fa-solid fa-check" style={{ marginRight: 6 }} />{discountSuccess}</div>}

            {!discountSuccess ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
                <button onClick={closeDiscount} className="btn-outline" style={{ padding: '8px 18px' }}>{t('cancel')}</button>
                <button onClick={applyDiscount} className="btn-primary" style={{ padding: '8px 18px' }} disabled={discountSaving}>
                  {discountSaving ? <><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 6 }} />{t('saving')}</> : t('save')}
                </button>
              </div>
            ) : (
              <button onClick={closeDiscount} className="btn-outline" style={{ width: '100%', padding: '8px', justifyContent: 'center', display: 'flex' }}>{t('cancel')}</button>
            )}
          </div>
        </div>
      )}
      {/* ── DELETE CONFIRM DIALOG ──────────────────────────── */}
      {deleteBomId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,24,20,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-base)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', fontWeight: 400, margin: 0, color: 'var(--text-primary)' }}>Xóa BOM</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>
                Bạn có chắc muốn xóa BOM <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{deleteBomId}</span>? Thao tác này không thể hoàn tác.
              </p>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-base)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteBomId(null)}
                style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 0, padding: '7px 20px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Hủy
              </button>
              <button onClick={confirmDelete}
                style={{ background: 'var(--color-danger)', color: '#fff', border: '1px solid var(--color-danger)', borderRadius: 0, padding: '7px 20px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── LIGHTBOX ───────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            background: 'rgba(26,24,20,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightboxSrc}
            alt="full preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none',
              color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}
    </div>
  )
}
