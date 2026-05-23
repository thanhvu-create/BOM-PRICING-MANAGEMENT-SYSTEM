# i18n Audit — Hardcoded Text Report

> Mục tiêu: Đồng bộ toàn bộ UI text qua `lib/i18n.ts` — không còn hardcode VI/EN lẫn lộn.
> Sau khi implement: user toggle VI↔EN thì **toàn bộ** label thay đổi nhất quán.

## Tình trạng hiện tại

| File | Tình trạng | Ưu tiên |
|---|---|---|
| `app/login/page.tsx` | ❌ 0% i18n — toàn tiếng Anh hardcode | Thấp (login page ít cần dịch) |
| `app/dashboard/page.tsx` | ⚠️ ~40% — nhiều label EN hardcode | Cao |
| `app/dashboard/tinh-gia/page.tsx` | ⚠️ ~50% — section titles, column headers EN | Cao |
| `app/dashboard/review/page.tsx` | ✅ ~70% — tốt nhất, còn vài chỗ lẫn | Trung bình |
| `app/dashboard/gold/page.tsx` | ❌ ~10% — VI/EN lẫn lộn nặng | Cao |
| `app/dashboard/mk/page.tsx` | ❌ ~10% — hầu hết hardcode | Cao |
| `app/dashboard/master/page.tsx` | ❌ ~10% — VI/EN lẫn lộn | Cao |
| `app/dashboard/users/page.tsx` | ❌ ~15% — VI/EN lẫn lộn | Trung bình |
| `app/dashboard/audit/page.tsx` | ❌ ~5% — toàn VI hardcode | Trung bình |
| `components/shared/DashboardShell.tsx` | ✅ ~60% — còn vài chỗ | Thấp |

---

## Keys cần thêm vào `lib/i18n.ts`

### Nhóm: Common (dùng nhiều nơi)
```
addNew          vi: Thêm Mới        en: Add New
confirm         vi: Xác Nhận        en: Confirm
confirmDelete   vi: Xác Nhận Xóa    en: Confirm Delete
cannotUndo      vi: Hành động này không thể hoàn tác  en: This action cannot be undone
allStoresOpt    vi: Tất cả cửa hàng  en: All Stores
selectOpt       vi: — Chọn —        en: — Select —
noneOpt         vi: — None —        en: — None —
actions         vi: Thao Tác        en: Actions
page            vi: Trang           en: Page
records         vi: bản ghi         en: records
savingDot       vi: Đang lưu...     en: Saving...
loadingDot      vi: Đang tải...     en: Loading...
close           vi: Đóng            en: Close
add             vi: Thêm            en: Add
required        vi: bắt buộc        en: required
optional        vi: tùy chọn        en: optional
```

### Nhóm: Dashboard Home (`page.tsx`)
```
dashOverview       vi: TỔNG QUAN           en: OVERVIEW
dashTotalBoms      vi: TỔNG BOM            en: TOTAL BOMS
dashTodayBoms      vi: HÔM NAY             en: TODAY'S BOMS
dashMonthBoms      vi: THÁNG NÀY           en: THIS MONTH
dashTotalValue     vi: TỔNG GIÁ BÁN        en: TOTAL MSRP VALUE
dashAllTime        vi: Tất cả              en: All time
dashByStore        vi: DOANH SỐ THEO CH    en: SALES BY STORE
dashTopProducts    vi: TOP 5 LOẠI SP       en: TOP 5 PRODUCT TYPES
dashTopSales       vi: TOP 5 NHÂN VIÊN     en: TOP 5 SALESPERSONS
dashDiscSummary    vi: CHIẾT KHẤU          en: DISCOUNT SUMMARY
dashDiscBoms       vi: BOM CHIẾT KHẤU      en: DISCOUNTED BOMS
dashAvgSell        vi: GIÁ BÁN TRUNG BÌNH  en: AVG. SELL PRICE
dashRecentAct      vi: HOẠT ĐỘNG GẦN ĐÂY   en: RECENT ACTIVITY
dashViewAll        vi: Xem tất cả ›        en: View all ›
dashNoRecent       vi: Chưa có BOM nào     en: No recent BOMs
dashWelcome        vi: Chào mừng đến BOM Pricing System  en: Welcome to BOM Pricing System
```

### Nhóm: Tính Giá — BOM form
```
sectionBomInfo     vi: Thông Tin BOM       en: BOM Info (Header)
sectionGold        vi: Vàng                en: Gold Materials
sectionStone       vi: Hột Đá              en: Stone Materials
sectionSpecs       vi: Thông Số Sản Xuất   en: Production Specs
sectionCost        vi: Bảng Chi Phí        en: Cost Report
addGoldRow         vi: THÊM VÀNG           en: ADD GOLD ROW
addStoneRow        vi: THÊM ĐÁ             en: ADD STONE ROW
stoneTypes         vi: DANH MỤC ĐÁ         en: STONE TYPES
btnNext            vi: Tiếp Tục →          en: Next →
colSubtotal        vi: THÀNH TIỀN          en: SUBTOTAL
colDelete          vi: XÓA                 en: DEL
colInputType       vi: INPUT TYPE          en: INPUT TYPE
colCtwTotal        vi: CTW TỔNG            en: CTW TOTAL
colGradeId         vi: GRADE ID            en: GRADE ID
labelTotalStones   vi: Tổng Số Viên        en: Total Stones
labelTotalCtw      vi: Tổng CTW            en: Total CTW
stoneHelpText      vi: Để trống nếu chỉ tính vàng  en: Leave empty for gold-only BOM
notFoundSuffix     vi: — Không tìm thấy   en: — Not found
```

### Nhóm: Review page
```
detailTitle        vi: Chi Tiết BOM         en: BOM Detail
btnCopyTemplate    vi: Copy Template        en: Copy as Template
btnViewQuot        vi: Xem Báo Giá          en: View Quotation
btnDetail          vi: Chi tiết             en: Detail
btnDiscount        vi: Chiết Khấu           en: Discount
colBomInfo         vi: BOM ID               en: BOM ID
labelProductTypeFl vi: Tất cả loại SP       en: All Product Types
labelPriceListFl   vi: Tất cả bảng giá      en: All Price Lists
perPage            vi: / trang              en: / page
labelFolder        vi: Thư Mục              en: Folder
labelSpType        vi: Kiểu SP              en: SP Type
labelLaborHrs      vi: Giờ Công             en: Labor Hrs
sectionGoldDetail  vi: 🪙 Vàng              en: 🪙 Gold
sectionStoneDetail vi: 💎 Hột Đá            en: 💎 Stones
```

### Nhóm: Gold page
```
goldPageTitle      vi: Giá Vàng             en: Gold Prices
goldSubtitle       vi: Giá kim loại theo ngày — tự động từ Amark  en: Daily metal prices — auto-fetched from Amark
btnFetchAmark      vi: Tải Từ Amark         en: Fetch Today (Amark)
btnAddManual       vi: Thêm Thủ Công        en: Add Manual
btnKaratCols       vi: Cột Karat            en: Karat Cols
btnAutoTrigger     vi: Tự Động              en: Auto Trigger
btnRecalc          vi: Tính Lại Giá         en: Recalc All Prices
triggerActive      vi: ● Đang Hoạt Động     en: ● Trigger Active
triggerOff         vi: ○ Đã Tắt             en: ○ Trigger Off
colPriceDate       vi: Ngày                 en: Date
colGoldOz          vi: Gold ASK (oz)        en: Gold ASK (oz)
colPtOz            vi: Platinum ASK (oz)    en: PT ASK (oz)
colAgOz            vi: Bạc ASK (oz)         en: AG ASK (oz)
colLossFactor      vi: Hao Hụt              en: Loss Factor
modalAddGold       vi: Thêm Giá Vàng        en: Add Gold Price
modalEditGold      vi: Sửa Giá Vàng —       en: Edit Gold Price —
labelGoldOzReq     vi: Gold (oz) *          en: Gold (oz) *
labelPtOz          vi: Platinum (oz)        en: Platinum (oz)
labelAgOz          vi: Bạc (oz)             en: Silver (oz)
labelAmarkSection  vi: Giá Amark (USD/oz)   en: Amark Price (USD/oz)
labelAutoCalc      vi: Tự Tính (USD/gram)   en: Auto-Calculated (USD/gram)
labelOverwrite     vi: Ghi đè nếu đã có ngày này  en: Overwrite if date exists
labelTriggerHour   vi: Giờ chạy tự động (VN)  en: Auto-run hour (VN time)
```

### Nhóm: MK page
```
mkPageTitle        vi: Bảng Giá & Markup    en: Markup & Pricing
mkSubtitle         vi: Quản lý bảng giá và markup  en: Manage markup & pricing tables
rowSaved           vi: Đã lưu               en: Row saved
rowDeleted         vi: Đã xóa               en: Row deleted
```

### Nhóm: Master Data page
```
masterPageTitle    vi: Stone Data           en: Stone Data
masterSearchPlh    vi: Tìm mã, tên...       en: Search master code / grade ID / name...
colMasterCode      vi: MASTER CODE          en: MASTER CODE
colGradeId         vi: GRADE ID             en: GRADE ID
colDisplayName     vi: TÊN HIỂN THỊ         en: DISPLAY NAME
colUnit            vi: ĐƠN VỊ              en: UNIT
colType            vi: LOẠI                 en: TYPE
colMin             vi: MIN                  en: MIN
colMax             vi: MAX                  en: MAX
colBasePrice       vi: GIÁ GỐC ($)          en: BASE ($)
colMarkup          vi: MARKUP               en: MK
colSellPrice       vi: GIÁ BÁN ($)          en: SELL ($)
modalAddStone      vi: Thêm Đá Mới          en: Add Stone Row
modalEditStone     vi: Sửa:                 en: Edit:
labelCategory      vi: Danh Mục             en: Category
labelType          vi: Loại                 en: Type
labelShape         vi: Hình Dạng            en: Shape
labelColor         vi: Màu                  en: Color
labelQuality       vi: Chất Lượng           en: Quality
labelMasterCode    vi: Master Code          en: Master Code
labelDisplayName   vi: Tên Hiển Thị         en: Display Name
labelViName        vi: Tên Tiếng Việt       en: Vietnamese Name
labelEnName        vi: Tên Tiếng Anh        en: English Name
labelMinSize       vi: Kích Thước Min       en: Min Size
labelMaxSize       vi: Kích Thước Max       en: Max Size
labelPricingUnit   vi: Đơn Vị Tính Giá      en: Pricing Unit
labelMeasureType   vi: Loại Đo              en: Measure Type
labelBasePrice     vi: Giá Gốc ($)          en: Base Price ($)
labelMarkupPct     vi: Markup (%)           en: Markup (%)
labelSellingPrice  vi: Giá Bán (tự tính)    en: Selling Price (auto)
validMinMax        vi: Min phải ≤ Max        en: Min must be ≤ Max
validMaxMin        vi: Max phải ≥ Min        en: Max must be ≥ Min
validMarkup        vi: Markup không quá 100%  en: Markup cannot exceed 100%
syncDmSize         vi: Đồng Bộ DM Size      en: Sync DM Size
```

### Nhóm: Users page
```
usersPageTitle     vi: Quản Lý Người Dùng   en: User Management
btnAddUser         vi: + THÊM USER          en: + ADD USER
btnHideForm        vi: ẨN FORM              en: HIDE FORM
sectionNewUser     vi: NGƯỜI DÙNG MỚI       en: NEW USER
labelUsername      vi: Tên Đăng Nhập *      en: Username *
labelPassword      vi: Mật Khẩu *           en: Password *
labelRole          vi: Vai Trò              en: Role
labelNewPassword   vi: Mật Khẩu Mới         en: New Password
noChangePassword   vi: (để trống = không đổi)  en: (leave blank = no change)
colUsername        vi: TÊN ĐĂNG NHẬP        en: USERNAME
colRole            vi: VAI TRÒ              en: ROLE
colCreated         vi: NGÀY TẠO             en: CREATED
modalEditUser      vi: Sửa Tài Khoản        en: Edit Account
confirmDeleteUser  vi: Xóa tài khoản        en: Delete Account
errUsernameReq     vi: Username là bắt buộc  en: Username is required
errPasswordReq     vi: Password là bắt buộc  en: Password is required
noUsers            vi: Chưa có user nào      en: No users yet
```

### Nhóm: Audit page
```
auditPageTitle     vi: Nhật Ký Hoạt Động    en: Audit Log
tabLog             vi: Nhật Ký              en: Log
tabStats           vi: Thống Kê             en: Statistics
filterActor        vi: Actor                en: Actor
filterEntity       vi: Entity               en: Entity
filterAction       vi: Action               en: Action
filterFrom         vi: Từ ngày              en: From date
filterTo           vi: Đến ngày             en: To date
btnFilter          vi: Lọc                  en: Filter
colTime            vi: Thời Gian            en: Time
colSummary         vi: Tóm Tắt / Diff       en: Summary / Diff
allEntities        vi: Tất cả entity        en: All entities
allActions         vi: Tất cả action        en: All actions
noAccess           vi: Không có quyền truy cập  en: Access denied
```

---

## Phạm vi implement

### Bước 1 — Thêm keys vào `lib/i18n.ts`
Thêm tất cả keys ở trên vào dict. (~100 keys mới)

### Bước 2 — Update từng file
Thay thế hardcoded strings bằng `t('key')`:

**Thứ tự ưu tiên:**
1. `app/dashboard/gold/page.tsx` — lẫn lộn nặng nhất
2. `app/dashboard/mk/page.tsx`
3. `app/dashboard/master/page.tsx`
4. `app/dashboard/page.tsx`
5. `app/dashboard/users/page.tsx`
6. `app/dashboard/audit/page.tsx`
7. `app/dashboard/tinh-gia/page.tsx` — đã tốt, chỉ cần vá vài chỗ
8. `app/dashboard/review/page.tsx` — đã tốt nhất, vá nhẹ
9. `components/shared/DashboardShell.tsx` — vá nhẹ

### Bước 3 — Không cần làm
- `app/login/page.tsx` — login page là tiếng Anh cố định, không cần dịch

---

## Quy tắc implement

```typescript
// Trong client component:
const { t } = useLang()
// Dùng:
t('keyName')

// Placeholder trong input:
placeholder={t('keyName')}

// Title trong button:
title={t('keyName')}
```

**Không dùng t() cho:**
- Data values (tên model, BOM ID, store codes)
- Technical labels không cần dịch (GRADE ID, BOM ID, SO/MO)
- Đơn vị kỹ thuật (gr, ct, mm, oz, %)
