export type Lang = 'vi' | 'en'

const dict: Record<string, Record<Lang, string>> = {
  // Nav
  home:           { vi: 'TRANG CHỦ',    en: 'DASHBOARD' },
  tinhgia:        { vi: 'TÍNH GIÁ',     en: 'BOM PRICING' },
  review:         { vi: 'LỊCH SỬ',      en: 'PRICE HISTORY' },
  gold:           { vi: 'GIÁ VÀNG',     en: 'GOLD PRICES' },
  mk:             { vi: 'MK DATA',      en: 'MK DATA' },
  master:         { vi: 'STONE DATA',   en: 'STONE DATA' },
  users:          { vi: 'NGƯỜI DÙNG',   en: 'USER MGMT' },

  // Page headings (title case — used in topbar serif heading)
  pageTitleHome:    { vi: 'Trang Chủ',    en: 'Dashboard' },
  pageTitleTinhgia: { vi: 'Tính Giá BOM', en: 'BOM Pricing' },
  pageTitleReview:  { vi: 'Lịch Sử BOM', en: 'Price History' },
  pageTitleGold:    { vi: 'Giá Vàng',     en: 'Gold Prices' },
  pageTitleMk:      { vi: 'MK Data',      en: 'MK Data' },
  pageTitleMaster:  { vi: 'Stone Data',   en: 'Stone Data' },
  pageTitleUsers:   { vi: 'Người Dùng',   en: 'User Mgmt' },

  // Topbar
  signOut:        { vi: 'Đăng Xuất',    en: 'Sign Out' },

  // Step labels
  step1:          { vi: '1. THÔNG TIN', en: '1. INFO (HEADER)' },
  step2:          { vi: '2. VÀNG',      en: '2. GOLD' },
  step3:          { vi: '3. HỘT ĐÁ',   en: '3. STONES' },
  step4:          { vi: '4. TỔNG HỢP',  en: '4. SUMMARY' },

  // Header form labels
  labelDate:          { vi: 'NGÀY',           en: 'DATE' },
  labelProductType:   { vi: 'LOẠI SẢN PHẨM',  en: 'PRODUCT TYPE' },
  labelCustomer:      { vi: 'KHÁCH HÀNG',      en: 'CUSTOMER NAME' },
  labelSoMo:          { vi: 'SỐ SO / MO',      en: 'SO / MO' },
  labelModelNum:      { vi: 'MÃ MODEL',         en: 'MODEL NUMBER' },
  labelPriceListType: { vi: 'BẢNG GIÁ',        en: 'PRICE LIST TYPE' },
  labelSalesperson:   { vi: 'NHÂN VIÊN BÁN',   en: 'SALESPERSON' },
  labelStore:         { vi: 'CỬA HÀNG',         en: 'STORE' },
  labelNote:          { vi: 'GHI CHÚ',          en: 'NOTE' },
  labelSpType:        { vi: 'KIỂU SẢN PHẨM',   en: 'SP TYPE' },
  labelLaborHours:    { vi: 'GIỜ CÔNG',         en: 'LABOR HOURS' },
  labelFolderUrl:     { vi: 'DRIVE FOLDER',     en: 'DRIVE FOLDER' },

  // Gold table
  labelGoldType:   { vi: 'LOẠI VÀNG',   en: 'GOLD TYPE' },
  labelColor:      { vi: 'MÀU SẮC',     en: 'COLOR' },
  labelWeight:     { vi: 'TRỌNG LƯỢNG', en: 'WEIGHT (gr)' },
  labelPricePerGr: { vi: 'GIÁ/GR',      en: 'PRICE/GR' },
  labelGoldTotal:  { vi: 'THÀNH TIỀN',  en: 'TOTAL' },

  // Stone table
  labelStoneGroup: { vi: 'MÃ HỘT',     en: 'GROUP CODE' },
  labelMmSize:     { vi: 'KT (MM)',     en: 'SIZE (MM)' },
  labelCtw:        { vi: 'CTW/VIÊN',   en: 'CTW/PC' },
  labelQty:        { vi: 'SỐ LƯỢNG',   en: 'QTY' },
  labelTlHot:      { vi: 'TL HỘT',     en: 'TL HOT' },
  labelGradeId:    { vi: 'GRADE ID',   en: 'GRADE ID' },
  labelStonePrice: { vi: 'GIÁ BÁN',    en: 'PRICE' },

  // Cost summary
  labelCostGold:      { vi: 'Chi Phí Vàng',    en: 'Gold Cost' },
  labelCostStones:    { vi: 'Chi Phí Hột',     en: 'Stone Cost' },
  labelCostLabor:     { vi: 'Chi Phí Công',    en: 'Labor Cost' },
  labelCostSubtotal:  { vi: 'Tạm Tính',        en: 'Subtotal' },
  labelCif:           { vi: 'CIF',             en: 'CIF' },
  labelCostTotal:     { vi: 'Tổng Chi Phí',    en: 'Total Cost' },
  labelSellPrice:     { vi: 'Giá Bán',         en: 'Sell Price' },
  labelDiscount:      { vi: 'Chiết Khấu',      en: 'Discount' },
  labelAfterDiscount: { vi: 'Sau Chiết Khấu',  en: 'After Disc.' },
  labelEstVnd:        { vi: 'Ước Tính VND',    en: 'Est. VND' },
  labelRatio:         { vi: 'Tỷ Lệ',          en: 'Ratio' },

  // Quotation modal
  quotationTitle:    { vi: 'Báo Giá',                      en: 'Quotation' },
  printPDF:          { vi: 'IN / PDF',                     en: 'PRINT / PDF' },
  quotMaterial:      { vi: 'CHẤT LIỆU / MATERIAL',         en: 'MATERIAL' },
  quotInfo:          { vi: 'THÔNG TIN BÁO GIÁ',            en: 'QUOTE INFO' },
  quotGoldType:      { vi: 'Loại Vàng',                    en: 'Gold Type' },
  quotColor:         { vi: 'Màu',                          en: 'Color' },
  quotWeight:        { vi: 'Tổng KL',                      en: 'Total Weight' },
  quotRetailPrice:   { vi: 'GIÁ BÁN LẺ DỰ KIẾN',          en: 'ESTIMATED RETAIL PRICE' },

  // Stone Type List modal
  stoneTypeListTitle: { vi: 'Danh Sách Hột Đá',     en: 'Stone Types' },
  stoneTypeSearchPlh: { vi: 'Tìm Group Code, tên Việt, tên Anh...', en: 'Search Group Code, VI name, EN name...' },
  colViName:          { vi: 'Tên Tiếng Việt',        en: 'Vietnamese Name' },
  stoneTypeNoData:    { vi: 'Không có dữ liệu',      en: 'No data' },
  stoneTypeNoResult:  { vi: 'Không tìm thấy kết quả', en: 'No results found' },

  // Review page
  reviewTitle:       { vi: 'Lịch Sử BOM',  en: 'BOM Price History' },
  searchPlh:         { vi: 'Tìm BOM ID, SO/MO, Nhân Viên, Cửa Hàng...', en: 'Search by BOM ID, SO/MO, Salesperson, Store...' },
  allStores:         { vi: 'Tất Cả Cửa Hàng', en: 'All Stores' },
  colBomId:          { vi: 'BOM ID',          en: 'BOM ID' },
  colDate:           { vi: 'Ngày',            en: 'Date' },
  colSoMo:           { vi: 'SO/MO',           en: 'SO/MO' },
  colModel:          { vi: 'Model',           en: 'Model' },
  colStones:         { vi: 'Hột',            en: 'Stones' },
  colCost:           { vi: 'Chi Phí ($)',     en: 'Cost ($)' },
  colSell:           { vi: 'Giá Bán ($)',     en: 'Sell ($)' },
  colDisc:           { vi: 'CK%',            en: 'Disc%' },
  colAfterDisc:      { vi: 'Sau CK',         en: 'After Disc' },
  colSalesperson:    { vi: 'Nhân Viên',       en: 'Salesperson' },
  colStore:          { vi: 'Cửa Hàng',        en: 'Store' },
  colActions:        { vi: 'Thao Tác',        en: 'Actions' },

  // Discount modal
  applyDiscountTitle: { vi: 'Chiết Khấu',         en: 'Apply Discount' },
  warnMaxDiscount:    { vi: 'Tối đa',              en: 'Max' },

  // Common
  save:        { vi: 'Lưu',          en: 'Save' },
  cancel:      { vi: 'Hủy',          en: 'Cancel' },
  delete:      { vi: 'Xóa',          en: 'Delete' },
  edit:        { vi: 'Sửa',          en: 'Edit' },
  refresh:     { vi: 'Làm Mới',      en: 'Refresh' },
  loading:     { vi: 'Đang tải...',  en: 'Loading...' },
  saving:      { vi: 'Đang lưu...', en: 'Saving...' },
  noData:      { vi: 'Không có dữ liệu', en: 'No data' },
  saveBOM:     { vi: 'Lưu BOM',      en: 'Save BOM' },
  updateBOM:   { vi: 'Cập Nhật BOM', en: 'Update BOM' },
  reset:       { vi: 'RESET',        en: 'RESET' },
  calculate:   { vi: 'Tính Giá',     en: 'Calculate' },
  mgrDiscCapLabel: { vi: 'Tối đa CK (%)', en: 'Max Disc (%)' },
}

export function t(key: string, lang: Lang): string {
  return dict[key]?.[lang] ?? dict[key]?.['en'] ?? key
}

export const STORAGE_KEY = 'bomLang'
