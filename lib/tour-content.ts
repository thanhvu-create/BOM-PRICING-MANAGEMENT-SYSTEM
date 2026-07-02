// Interactive product-tour step definitions (bilingual VI/EN), keyed by page.
// Each step targets a `data-tour="<key>"` anchor rendered somewhere in the UI.
// Steps whose target is not present in the DOM (role-hidden control, absent
// section) are skipped gracefully at runtime — so one definition serves all roles.
// `target: ''` (or placement 'center') renders a viewport-centered modal step.

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  target: string // data-tour key; '' => centered modal step
  title: { vi: string; en: string }
  body: { vi: string; en: string }
  placement?: TourPlacement
}

// pageKey mirrors PAGE_TITLE mapping in DashboardShell:
//   dashboard | tinh-gia | review | gold | mk | master | users | audit
export const TOUR_CONTENT: Record<string, TourStep[]> = {
  dashboard: [
    {
      target: '',
      placement: 'center',
      title: { vi: 'Chào mừng đến BOM Pricing', en: 'Welcome to BOM Pricing' },
      body: {
        vi: 'Đây là tour nhanh giới thiệu các khu vực chính. Bạn có thể bỏ qua bất cứ lúc nào, và mở lại tour từ nút HƯỚNG DẪN trên thanh trên cùng.',
        en: 'A quick tour of the main areas. You can skip anytime and replay it later from the GUIDE button in the top bar.',
      },
    },
    {
      target: 'topbar-nav',
      placement: 'bottom',
      title: { vi: 'Thanh điều hướng', en: 'Navigation' },
      body: {
        vi: 'Chuyển giữa các trang tại đây. Menu hiển thị theo quyền của bạn — mỗi vai trò thấy các mục khác nhau.',
        en: 'Switch between pages here. The menu adapts to your role — each role sees different items.',
      },
    },
    {
      target: 'dash-kpi',
      placement: 'bottom',
      title: { vi: 'Chỉ số tổng quan (KPI)', en: 'Overview KPIs' },
      body: {
        vi: 'Tổng số BOM, BOM hôm nay, tháng này và tổng giá trị. Giá trị chỉ hiển thị với vai trò được xem giá.',
        en: 'Total BOMs, today, this month, and total value. Monetary value shows only for roles allowed to see prices.',
      },
    },
    {
      target: 'dash-recent',
      placement: 'top',
      title: { vi: 'Hoạt động gần đây', en: 'Recent Activity' },
      body: {
        vi: 'Các BOM mới nhất. Bấm "Xem tất cả" để sang trang Lịch Sử đầy đủ.',
        en: 'The latest BOMs. Click "View all" to jump to the full History page.',
      },
    },
    {
      target: 'topbar-vnd',
      placement: 'bottom',
      title: { vi: 'Tỷ giá USD → VND', en: 'USD → VND Rate' },
      body: {
        vi: 'Tỷ giá dùng để quy đổi giá bán sang VND trên báo giá. Admin/Manager có thể chỉnh trực tiếp.',
        en: 'Used to convert sell price to VND on quotations. Admin/Manager can edit it inline.',
      },
    },
    {
      target: 'topbar-guide',
      placement: 'bottom',
      title: { vi: 'Hướng dẫn & tour', en: 'Guide & Tour' },
      body: {
        vi: 'Mở HƯỚNG DẪN để đọc chi tiết theo vai trò, và bấm "Xem tour trang này" để chạy lại tour bất cứ lúc nào.',
        en: 'Open GUIDE for role-based docs, and use "Tour this page" to replay the tour anytime.',
      },
    },
    {
      target: 'topbar-lang',
      placement: 'left',
      title: { vi: 'Ngôn ngữ VI / EN', en: 'Language VI / EN' },
      body: {
        vi: 'Chuyển đổi toàn bộ giao diện giữa Tiếng Việt và English.',
        en: 'Switch the whole interface between Vietnamese and English.',
      },
    },
  ],

  'tinh-gia': [
    {
      target: 'tg-steps',
      placement: 'bottom',
      title: { vi: 'Quy trình 4 bước', en: '4-Step Flow' },
      body: {
        vi: 'Tính giá theo thứ tự: 1) Thông tin → 2) Vàng → 3) Hột đá → 4) Tổng hợp. Bấm từng bước để quay lại chỉnh sửa.',
        en: 'Price in order: 1) Info → 2) Gold → 3) Stones → 4) Summary. Click a completed step to go back and edit.',
      },
    },
    {
      target: 'tg-save',
      placement: 'top',
      title: { vi: 'Tính & Lưu', en: 'Calculate & Save' },
      body: {
        vi: 'Ở bước Tổng hợp, xem đầy đủ chi phí và giá bán, rồi Lưu để tạo BOM (hệ thống tự sinh BOM ID).',
        en: 'On the Summary step, review the full cost breakdown and sell price, then Save to create the BOM (a BOM ID is generated).',
      },
    },
  ],

  review: [
    {
      target: 'rv-search',
      placement: 'bottom',
      title: { vi: 'Tìm kiếm BOM', en: 'Search BOMs' },
      body: {
        vi: 'Tìm nhanh theo BOM ID, model hoặc SO/MO.',
        en: 'Quickly find by BOM ID, model, or SO/MO.',
      },
    },
    {
      target: 'rv-filters',
      placement: 'bottom',
      title: { vi: 'Bộ lọc', en: 'Filters' },
      body: {
        vi: 'Lọc theo cửa hàng và trạng thái duyệt. BOM chờ duyệt (pending) hiển thị badge ở menu Lịch Sử.',
        en: 'Filter by store and approval status. Pending BOMs show a badge on the History menu item.',
      },
    },
  ],

  gold: [
    {
      target: 'gold-fetch',
      placement: 'bottom',
      title: { vi: 'Lấy giá Amark', en: 'Fetch Amark' },
      body: {
        vi: 'Kéo giá vàng Amark mới nhất. Hệ thống cũng tự lấy hàng ngày qua cron.',
        en: 'Pull the latest Amark gold price. The system also auto-fetches daily via cron.',
      },
    },
    {
      target: 'gold-add',
      placement: 'bottom',
      title: { vi: 'Thêm giá thủ công', en: 'Add Manually' },
      body: {
        vi: 'Thêm/sửa giá vàng theo ngày. Khi tính BOM, hệ thống dùng giá của ngày gần nhất ≤ ngày BOM.',
        en: 'Add/edit gold price by date. When pricing a BOM, the nearest date ≤ BOM date is used.',
      },
    },
  ],

  mk: [
    {
      target: 'mk-tabs',
      placement: 'bottom',
      title: { vi: 'Các bảng giá MK', en: 'MK Pricing Tables' },
      body: {
        vi: 'Chuyển giữa các bảng: CIF Rate, Store Markup, Price/Gram, Process Fee… Mọi thay đổi ảnh hưởng BOM tính sau đó.',
        en: 'Switch between tables: CIF Rate, Store Markup, Price/Gram, Process Fee… Changes affect BOMs priced afterwards.',
      },
    },
    {
      target: 'mk-add',
      placement: 'bottom',
      title: { vi: 'Thêm dòng', en: 'Add Row' },
      body: {
        vi: 'Thêm dòng mới vào bảng đang chọn.',
        en: 'Add a new row to the selected table.',
      },
    },
  ],

  master: [
    {
      target: 'master-toolbar',
      placement: 'bottom',
      title: { vi: 'Danh mục đá', en: 'Stone Catalog' },
      body: {
        vi: 'Tìm kiếm, thêm và đồng bộ danh mục đá. Dữ liệu này dùng để tự tra giá khi nhập hột ở trang Tính Giá.',
        en: 'Search, add, and sync the stone catalog. This data powers auto price lookup when entering stones in Pricing.',
      },
    },
  ],

  users: [
    {
      target: 'users-add',
      placement: 'bottom',
      title: { vi: 'Tạo tài khoản', en: 'Create User' },
      body: {
        vi: 'Thêm người dùng: username, mật khẩu, vai trò và cửa hàng. Vai trò + cửa hàng quyết định quyền xem.',
        en: 'Add a user: username, password, role, and store. Role + store determine visibility.',
      },
    },
    {
      target: 'users-table',
      placement: 'top',
      title: { vi: 'Danh sách người dùng', en: 'User List' },
      body: {
        vi: 'Sửa vai trò/cửa hàng, đặt lại mật khẩu, hoặc xóa tài khoản.',
        en: 'Edit role/store, reset password, or delete accounts.',
      },
    },
  ],

  audit: [
    {
      target: 'audit-filters',
      placement: 'bottom',
      title: { vi: 'Nhật ký hoạt động', en: 'Audit Log' },
      body: {
        vi: 'Lọc theo người thực hiện, đối tượng và loại thao tác. Mở một log để xem diff trước/sau khi thay đổi.',
        en: 'Filter by actor, entity, and action type. Open a log to view the before/after diff of a change.',
      },
    },
  ],
}

export function getTourForPage(pageKey: string): TourStep[] {
  return TOUR_CONTENT[pageKey] ?? []
}
