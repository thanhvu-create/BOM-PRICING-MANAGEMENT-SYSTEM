export type Lang = 'vi' | 'en'

const dict: Record<string, Record<Lang, string>> = {
  // Nav
  home:           { vi: 'TRANG CHỦ',    en: 'HOME' },
  tinhgia:        { vi: 'TÍNH GIÁ',     en: 'PRICING' },
  review:         { vi: 'LỊCH SỬ',      en: 'HISTORY' },
  gold:           { vi: 'GIÁ VÀNG',     en: 'GOLD' },
  mk:             { vi: 'MK DATA',      en: 'MK' },
  master:         { vi: 'STONE DATA',   en: 'STONE' },
  users:          { vi: 'NGƯỜI DÙNG',   en: 'USERS' },
  audit:          { vi: 'NHẬT KÝ',      en: 'AUDIT' },

  // Page headings (title case — used in topbar serif heading)
  pageTitleHome:    { vi: 'Trang Chủ',    en: 'Dashboard' },
  pageTitleTinhgia: { vi: 'Tính Giá BOM', en: 'BOM Pricing' },
  pageTitleReview:  { vi: 'Lịch Sử BOM', en: 'Price History' },
  pageTitleGold:    { vi: 'Giá Vàng',     en: 'Gold Prices' },
  pageTitleMk:      { vi: 'MK Data',      en: 'MK Data' },
  pageTitleMaster:  { vi: 'Stone Data',   en: 'Stone Data' },
  pageTitleUsers:   { vi: 'Người Dùng',   en: 'User Mgmt' },
  pageTitleAudit:   { vi: 'Nhật Ký Hoạt Động', en: 'Audit Log' },

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
  colProductType:    { vi: 'Loại SP',          en: 'Product Type' },
  colSalesperson:    { vi: 'Nhân Viên',       en: 'Salesperson' },
  colStore:          { vi: 'Cửa Hàng',        en: 'Store' },
  colApprovalStatus: { vi: 'Trạng Thái',      en: 'Status' },
  colActions:        { vi: 'Thao Tác',        en: 'Actions' },

  // Approval workflow
  approvalAll:       { vi: 'Tất cả',          en: 'All' },
  approvalDraft:     { vi: 'Nháp',            en: 'Draft' },
  approvalPending:   { vi: 'Chờ Duyệt',       en: 'Pending' },
  approvalApproved:  { vi: 'Đã Duyệt',        en: 'Approved' },
  approvalRejected:  { vi: 'Từ Chối',         en: 'Rejected' },
  approvalFilter:    { vi: 'Trạng Thái',      en: 'Status' },
  pendingBadge:      { vi: 'chờ duyệt',       en: 'pending review' },
  submitApproval:    { vi: 'Gửi Duyệt',       en: 'Submit' },
  resubmitApproval:  { vi: 'Gửi Lại',         en: 'Resubmit' },
  submitting:        { vi: 'Đang gửi...',      en: 'Submitting...' },
  editLockedMsg:     { vi: 'BOM đang chờ duyệt — không thể chỉnh sửa', en: 'BOM pending review — cannot edit' },
  rejectModalTitle:  { vi: 'Từ Chối BOM',     en: 'Reject BOM' },
  rejectNoteLabel:   { vi: 'Ghi chú (tùy chọn)', en: 'Note (optional)' },
  rejectNotePlh:     { vi: 'Lý do từ chối...', en: 'Reason for rejection...' },
  btnReject:         { vi: 'Từ Chối',         en: 'Reject' },
  btnApprove:        { vi: 'Duyệt',           en: 'Approve' },
  bomSavedLabel:     { vi: 'BOM Đã Lưu',      en: 'BOM Saved' },

  // Discount modal
  applyDiscountTitle: { vi: 'Chiết Khấu',         en: 'Apply Discount' },
  warnMaxDiscount:    { vi: 'Tối đa',              en: 'Max' },

  // Common
  btnContinue:     { vi: 'Tiếp Tục →',              en: 'Continue →' },
  btnBack:         { vi: '← Quay Lại',              en: '← Back' },
  save:            { vi: 'Lưu',                     en: 'Save' },
  cancel:          { vi: 'Hủy',                     en: 'Cancel' },
  delete:          { vi: 'Xóa',                     en: 'Delete' },
  edit:            { vi: 'Sửa',                     en: 'Edit' },
  refresh:         { vi: 'Làm Mới',                 en: 'Refresh' },
  loading:         { vi: 'Đang tải...',              en: 'Loading...' },
  saving:          { vi: 'Đang lưu...',              en: 'Saving...' },
  noData:          { vi: 'Không có dữ liệu',         en: 'No data' },
  saveBOM:         { vi: 'Lưu BOM',                 en: 'Save BOM' },
  updateBOM:       { vi: 'Cập Nhật BOM',            en: 'Update BOM' },
  reset:           { vi: 'RESET',                   en: 'RESET' },
  calculate:       { vi: 'Tính Giá',                en: 'Calculate' },
  mgrDiscCapLabel: { vi: 'Tối đa CK (%)',           en: 'Max Disc (%)' },
  addNew:          { vi: 'Thêm Mới',                en: 'Add New' },
  add:             { vi: 'Thêm',                    en: 'Add' },
  close:           { vi: 'Đóng',                    en: 'Close' },
  confirm:         { vi: 'Xác Nhận',                en: 'Confirm' },
  confirmDelete:   { vi: 'Xác Nhận Xóa',            en: 'Confirm Delete' },
  cannotUndo:      { vi: 'Hành động này không thể hoàn tác', en: 'This action cannot be undone' },
  allStoresOpt:    { vi: 'Tất cả cửa hàng',         en: 'All Stores' },
  allStoresSel:    { vi: '-- Tất cả cửa hàng --',   en: '-- All stores --' },
  selectOpt:       { vi: '— Chọn —',               en: '— Select —' },
  required:        { vi: 'bắt buộc',                en: 'required' },
  optional:        { vi: 'tùy chọn',                en: 'optional' },
  page:            { vi: 'Trang',                   en: 'Page' },
  records:         { vi: 'bản ghi',                 en: 'records' },
  syncAll:         { vi: 'Đồng Bộ',                 en: 'Sync All' },
  syncing:         { vi: 'Đang đồng bộ...',          en: 'Syncing...' },
  noAccess:        { vi: 'Không có quyền truy cập trang này', en: 'Access denied' },

  // Dashboard Home
  dashOverview:    { vi: 'TỔNG QUAN',               en: 'OVERVIEW' },
  dashTotalBoms:   { vi: 'TỔNG BOM',                en: 'TOTAL BOMS' },
  dashTodayBoms:   { vi: 'HÔM NAY',                 en: "TODAY'S BOMS" },
  dashMonthBoms:   { vi: 'THÁNG NÀY',               en: 'THIS MONTH' },
  dashTotalValue:  { vi: 'TỔNG GIÁ BÁN',            en: 'TOTAL MSRP VALUE' },
  dashAllTime:     { vi: 'Tất cả',                  en: 'All time' },
  dashByStore:     { vi: 'DOANH SỐ THEO CH',        en: 'SALES BY STORE' },
  dashTopProducts: { vi: 'TOP 5 LOẠI SP',           en: 'TOP 5 PRODUCT TYPES' },
  dashTopSales:    { vi: 'TOP 5 NHÂN VIÊN',         en: 'TOP 5 SALESPERSONS' },
  dashDiscSummary: { vi: 'CHIẾT KHẤU',              en: 'DISCOUNT SUMMARY' },
  dashDiscBoms:    { vi: 'BOM CHIẾT KHẤU',          en: 'DISCOUNTED BOMS' },
  dashAvgSell:     { vi: 'GIÁ BÁN TRUNG BÌNH',      en: 'AVG. SELL PRICE' },
  dashRecentAct:   { vi: 'HOẠT ĐỘNG GẦN ĐÂY',       en: 'RECENT ACTIVITY' },
  dashViewAll:     { vi: 'Xem tất cả ›',            en: 'View all ›' },
  dashNoRecent:    { vi: 'Chưa có BOM nào',          en: 'No recent BOMs' },
  dashWelcome:          { vi: 'Chào mừng đến BOM Pricing System', en: 'Welcome to BOM Pricing System' },
  dashUseNav:           { vi: 'Dùng menu trên để truy cập Tính Giá và Lịch Sử BOM.', en: 'Use the navigation above to access BOM Pricing and Price History.' },
  dashStatusBreakdown:  { vi: 'PHÂN BỔ TRẠNG THÁI',            en: 'STATUS BREAKDOWN' },
  dashApprovedOnly:     { vi: 'Chỉ tính BOM đã duyệt',         en: 'Approved BOMs only' },

  // Gold page
  goldSubtitle:    { vi: 'Giá kim loại theo ngày — tự động từ Amark', en: 'Daily metal prices — auto-fetched from Amark.com' },
  btnFetchAmark:   { vi: 'Tải Từ Amark',            en: 'Fetch Today (Amark)' },
  btnAddManual:    { vi: 'Thêm Thủ Công',           en: 'Add Manual' },
  btnKaratCols:    { vi: 'Cột Karat',               en: 'Karat Cols' },
  btnAutoTrigger:  { vi: 'Tự Động',                 en: 'Auto Trigger' },
  btnRecalc:       { vi: 'Tính Lại Giá',            en: 'Recalc All Prices' },
  triggerActive:   { vi: '● Đang Hoạt Động',        en: '● Trigger Active' },
  triggerOff:      { vi: '○ Đã Tắt',               en: '○ Trigger Off' },
  colLossFactor:   { vi: 'Hao Hụt',                 en: 'Loss Factor' },
  modalAddGold:    { vi: 'Thêm Giá Vàng Thủ Công',  en: 'Add Gold Price Manually' },
  modalEditGold:   { vi: 'Sửa Giá Vàng —',          en: 'Edit Gold Price —' },
  labelAmarkSection: { vi: 'Giá Amark (USD/oz)',    en: 'Amark Price (USD/oz)' },
  labelAutoCalc:   { vi: 'Tự Tính (USD/gram)',       en: 'Auto-Calculated (USD/gram)' },
  labelOverwrite:  { vi: 'Ghi đè nếu đã có ngày này', en: 'Overwrite if date exists' },
  labelTriggerHour: { vi: 'Giờ chạy tự động (VN)', en: 'Auto-run hour (VN time)' },
  toggleDisable:   { vi: 'Tắt Trigger',             en: 'Disable Trigger' },
  toggleEnable:    { vi: 'Bật Trigger',             en: 'Enable Trigger' },

  // MK page
  mkSubtitle:      { vi: 'Quản lý bảng giá và markup', en: 'Manage markup & pricing tables' },

  // Master/Stone page
  masterSearchPlh: { vi: 'Tìm mã, tên đá...',       en: 'Search master code / grade ID / name...' },

  // Users page
  usersPageTitle:   { vi: 'Quản Lý Người Dùng',     en: 'User Management' },
  btnAddUser:       { vi: '+ THÊM USER',            en: '+ ADD USER' },
  btnHideForm:      { vi: 'ẨN FORM',                en: 'HIDE FORM' },
  sectionNewUser:   { vi: 'NGƯỜI DÙNG MỚI',         en: 'NEW USER' },
  labelUsername:    { vi: 'Tên Đăng Nhập',           en: 'Username' },
  labelPassword:    { vi: 'Mật Khẩu',               en: 'Password' },
  labelRole:        { vi: 'Vai Trò',                 en: 'Role' },
  labelNewPassword: { vi: 'Mật Khẩu Mới',           en: 'New Password' },
  noChangePassword: { vi: '(để trống = không đổi)',  en: '(leave blank = no change)' },
  modalEditUser:    { vi: 'Sửa Tài Khoản',          en: 'Edit Account' },
  confirmDeleteUser: { vi: 'Xóa tài khoản',         en: 'Delete Account' },
  errUsernameReq:   { vi: 'Username là bắt buộc',   en: 'Username is required' },
  errPasswordReq:   { vi: 'Password là bắt buộc',   en: 'Password is required' },
  noUsers:          { vi: 'Chưa có user nào',        en: 'No users yet' },

  // Audit page
  auditPageTitle:  { vi: 'Nhật Ký Hoạt Động',       en: 'Audit Log' },
  tabLog:          { vi: 'Nhật Ký',                  en: 'Log' },
  tabStats:        { vi: 'Thống Kê',                 en: 'Statistics' },
  filterFrom:      { vi: 'Từ ngày',                  en: 'From date' },
  filterTo:        { vi: 'Đến ngày',                 en: 'To date' },
  btnFilter:       { vi: 'Lọc',                      en: 'Filter' },
  colTime:         { vi: 'Thời Gian',                en: 'Time' },
  colSummary:      { vi: 'Tóm Tắt / Diff',           en: 'Summary / Diff' },
  allOptions:      { vi: 'Tất cả',                   en: 'All' },
}

export function t(key: string, lang: Lang): string {
  return dict[key]?.[lang] ?? dict[key]?.['en'] ?? key
}

export const STORAGE_KEY = 'bomLang'
