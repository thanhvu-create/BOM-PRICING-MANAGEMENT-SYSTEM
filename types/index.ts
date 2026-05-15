// ============================================================
// Domain Types — BOM Pricing Web App
// ============================================================

export type Role = 'Admin' | 'Manager' | 'Sales Supervisor' | 'Sales' | 'Order'
export type Store = 'VN' | 'US' | 'ADM' | ''
export type GoldType = '10K' | '14K' | '18K' | '20K' | '22K' | '24K' | 'PT' | 'AG'
export type GoldColor = 'Yellow' | 'White' | 'Rose' | 'Platinum'
export type InputType = 'mm' | 'ct'

export interface AppUser {
  id: string
  username: string
  role: Role
  store: Store
  created_at: string
}

// ── BOM ─────────────────────────────────────────────────────
export interface BOM {
  id: string
  bom_id: string
  timestamp: string
  date: string
  product_type: string
  so_mo: string
  model: string
  total_stone_qty: number
  total_stone_ctw: number
  labor_hours: number
  price_list_type: string
  sp_type: string
  cost_gold: number
  cost_stones: number
  cost_labor: number
  cost_subtotal: number
  cost_cif: number
  cost_total: number
  sell_price: number
  note: string
  img1: string
  img2: string
  img3: string
  folder_url: string
  created_by: string
  updated_at: string
  updated_by: string
  customer_name: string
  discount_pct: number
  discount_price: number
  sales_person: string
  store: string
}

export interface BOMGold {
  id?: string
  bom_id?: string
  idx: number
  gold_type: GoldType
  color: GoldColor
  weight: number
  price_per_gr?: number   // computed client-side
  cost?: number           // computed client-side
}

export interface BOMStone {
  id?: string
  bom_id?: string
  idx: number
  group_code: string
  grade_id: string
  size: string
  ctw1pc: number
  qty: number
  tl_hot: number
  input_type: InputType
  gia_ban: number
}

// ── PRICING PAYLOAD ─────────────────────────────────────────
export interface BOMPayload {
  header: {
    bomId?: string            // khi update
    date: string
    productType: string
    soMo: string
    model: string
    priceListType: string
    spType: string
    laborHours: number
    note?: string
    img1?: string
    img2?: string
    img3?: string
    folderUrl?: string
    salesPerson?: string
    store?: string
    customerName?: string
  }
  golds: Array<{
    goldType: GoldType
    color: GoldColor
    weight: number
  }>
  stones: Array<{
    groupCode: string
    gradeId: string
    size: string
    ctw1pc: number
    qty: number
    tlHot: number
    inputType: InputType
    giaBan: number
  }>
  discountPct?: number
  discountAmt?: number
}

export interface PricingResult {
  success: boolean
  data?: {
    golds: Array<{ idx: number; pricePerGr: number; cost: number }>
    stones: Array<{ idx: number; gradeId: string; inputType: string; giaBan: number }>
    costGold: number
    costStones: number
    costLabor: number
    costSubtotal: number
    costCif: number
    costTotal: number
    sellPrice: number
    debug?: object
  }
  message?: string
}

// ── GOLD MATERIAL ────────────────────────────────────────────
export interface GoldMaterial {
  id: string
  price_date: string
  amark_gold_oz: number
  amark_pt_oz: number
  amark_ag_oz: number
  loss_factor: number
  karat_prices: Record<string, number>   // { "18K": 38.8, "PT": 32.5, ... }
}

// ── STONE MATERIAL ───────────────────────────────────────────
export interface StoneMaterial {
  id: string
  group_code: string
  grade_id: string
  display_name: string
  unit: string
  type_input: InputType
  min_size: number
  max_size: number
  selling_price: number
  base_price: number
  mkup: number
  full_name_vn: string
}

// ── MK PRICING ───────────────────────────────────────────────
export interface MkCifRate {
  id: string
  price_list_type: string
  cif_rate: number
}

export interface MkPriceGram {
  id: string
  sp_type: string
  weight_from: number
  weight_to: number
  markup_factor: number
  additional_price: number
}

export interface MkStoreMarkup {
  id: string
  value_from: number
  value_to: number
  markups: Record<string, number>   // { "1)HPUS -P": 1.8, ... }
}

export interface MkProcessFee {
  id: string
  unit_name: string
  unit_price: number
}

export interface MkPriceListType {
  id: string
  price_list_type: string
  region: string
  store: string
  logo_url: string
}

// ── DROPDOWN DATA ────────────────────────────────────────────
export interface MasterDropdowns {
  productTypes: string[]
  priceListTypes: string[]
  spTypes: string[]
  goldTypes: GoldType[]
  colors: GoldColor[]
  stoneGroupCodes: string[]
  salesPersonNames: string[]
  storeNames: string[]
}

// ── DASHBOARD ────────────────────────────────────────────────
export interface DashboardStats {
  totalBOMs: number
  todayBOMs: number
  monthBOMs: number
  totalValue: number
  avgSellPrice: number
  discountedCount: number
  byStore: Array<{ store: string; count: number; value: number }>
  byProductType: Array<{ type: string; count: number }>
  bySalesPerson: Array<{ name: string; count: number; value: number }>
  recentBOMs: Partial<BOM>[]
}

// ── STORE PRICE MAP ──────────────────────────────────────────
export const STORE_PRICE_MAP: Record<string, string[]> = {
  VN:  ['B1)HPVN -P', 'B2)AGVN-P'],
  US:  ['1)HPUS -P', '2)HPUS FB -P', '5)HPB -P', '5.1) HPB-P (AHA)'],
  ADM: ['3)ADM1 -P', '4)ADM2 -P', 'ADM-MH'],
}

export const ROLES_CAN_VIEW_COST: Role[] = ['Admin', 'Manager']
export const ROLES_CAN_EDIT_RATE: Role[] = ['Admin', 'Manager']
export const ROLES_ADMIN_ONLY: Role[] = ['Admin']
