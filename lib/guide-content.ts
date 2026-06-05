import type { Lang } from './i18n'
import type { Role } from '@/types'
export type { Role }

export interface GuideSection {
  id: string
  icon: string
  title: { vi: string; en: string }
  steps: { vi: string; en: string }[]
  tip?: { vi: string; en: string }
}

export interface RoleGuide {
  roleName: { vi: string; en: string }
  overview: { vi: string; en: string }
  sections: GuideSection[]
}

export const GUIDE_CONTENT: Record<Role, RoleGuide> = {
  Admin: {
    roleName: { vi: 'Quản Trị Viên (Admin)', en: 'Administrator (Admin)' },
    overview: {
      vi: 'Admin có toàn quyền hệ thống: xem tất cả BOM mọi cửa hàng, quản lý người dùng, xóa BOM, xem giá cost và giá bán, chiết khấu, và quản lý toàn bộ dữ liệu danh mục.',
      en: 'Admin has full system access: view all BOMs across all stores, manage users, delete BOMs, view cost and sell prices, apply discounts, and manage all master data.',
    },
    sections: [
      {
        id: 'dashboard',
        icon: 'fa-house',
        title: { vi: 'Trang Chủ (Dashboard)', en: 'Dashboard' },
        steps: [
          {
            vi: 'Xem KPI tổng quan: tổng số BOM, BOM hôm nay, BOM tháng này, tổng giá trị, giá bán trung bình, số BOM đã chiết khấu.',
            en: 'View KPI overview: total BOMs, today\'s BOMs, this month\'s BOMs, total value, average sell price, discounted count.',
          },
          {
            vi: 'Xem biểu đồ phân tích theo cửa hàng, loại sản phẩm và nhân viên bán hàng.',
            en: 'View analytics charts by store, product type, and salesperson.',
          },
          {
            vi: 'Xem bảng BOM gần nhất. Click vào BOM để xem chi tiết hoặc chuyển sang trang Review.',
            en: 'View recent BOMs table. Click a BOM to view details or navigate to the Review page.',
          },
          {
            vi: 'Điều chỉnh tỷ giá VND trực tiếp trong header (ô nhập số bên cạnh "VNĐ").',
            en: 'Adjust VND exchange rate directly in the header (input field next to "VNĐ").',
          },
        ],
      },
      {
        id: 'tinh-gia',
        icon: 'fa-calculator',
        title: { vi: 'Tính Giá BOM', en: 'BOM Pricing' },
        steps: [
          {
            vi: 'Bước 1 — Thông Tin: Chọn ngày, loại sản phẩm, nhập mã model (bắt buộc), chọn bảng giá, kiểu SP, nhân viên, cửa hàng, khách hàng và ghi chú.',
            en: 'Step 1 — Info: Select date, product type, enter model number (required), choose price list type, SP type, salesperson, store, customer, and notes.',
          },
          {
            vi: 'Bước 2 — Vàng: Click "+ Thêm dòng vàng" để thêm mỗi loại vàng. Chọn loại vàng (10K–24K/PT/AG), màu sắc, nhập trọng lượng (gr). Giá/gr sẽ tự động điền từ bảng giá vàng hôm nay.',
            en: 'Step 2 — Gold: Click "+ Add gold row" for each gold type. Select karat (10K–24K/PT/AG), color, enter weight (gr). Price/gr is auto-filled from today\'s gold price table.',
          },
          {
            vi: 'Bước 3 — Hột Đá: Click "+ Thêm hột đá" nếu có đá. Chọn mã hột (Group Code), nhập kích thước (mm) hoặc trọng lượng (ct/viên), nhập số lượng. Hệ thống tự lookup Grade ID và giá bán.',
            en: 'Step 3 — Stones: Click "+ Add stone" if applicable. Select Group Code, enter size (mm) or weight (ct/pc), enter quantity. System auto-looks up Grade ID and price.',
          },
          {
            vi: 'Bước 4 — Tổng Hợp: Click "Tính" để xem chi phí đầy đủ (gold cost, stone cost, labor cost, CIF, tổng cost, giá bán). Sau khi xem xong, click "Lưu" để tạo BOM.',
            en: 'Step 4 — Summary: Click "Calculate" to see full cost breakdown (gold, stone, labor, CIF, total cost, sell price). Review then click "Save" to create the BOM.',
          },
          {
            vi: 'Chỉnh sửa BOM: từ trang Review, click nút Edit trên BOM cần sửa, sẽ chuyển sang trang Tính Giá ở chế độ Edit.',
            en: 'Edit BOM: from the Review page, click Edit on the BOM, it opens the Pricing page in edit mode.',
          },
          {
            vi: 'Template: từ Review, click "Copy Template" để tạo BOM mới dựa trên BOM cũ (không ghi đè).',
            en: 'Template: from Review, click "Copy Template" to create a new BOM based on an existing one (does not overwrite).',
          },
        ],
        tip: {
          vi: 'Nếu BOM không có đá (chỉ vàng), hệ thống tự tính theo CASE A (giá theo gram). Nếu có đá, tính theo CASE B (cost × markup).',
          en: 'If the BOM has no stones (gold only), the system uses CASE A pricing (price per gram). With stones, it uses CASE B (cost × markup).',
        },
      },
      {
        id: 'review',
        icon: 'fa-clock-rotate-left',
        title: { vi: 'Lịch Sử BOM (Review)', en: 'BOM History (Review)' },
        steps: [
          {
            vi: 'Tìm kiếm BOM bằng ô search (theo BOM ID, model, SO/MO) hoặc lọc theo ngày, cửa hàng, loại sản phẩm, bảng giá.',
            en: 'Search BOMs using the search box (by BOM ID, model, SO/MO) or filter by date, store, product type, price list type.',
          },
          {
            vi: 'Click nút chi tiết (icon mắt) để xem đầy đủ thông tin: gold table, stone table, cost breakdown, sell price.',
            en: 'Click the detail button (eye icon) to view full information: gold table, stone table, cost breakdown, sell price.',
          },
          {
            vi: 'Chiết Khấu: click nút "%" trên BOM, nhập % chiết khấu, hệ thống tính giá sau chiết khấu và lưu.',
            en: 'Discount: click the "%" button on a BOM, enter discount %, the system calculates discounted price and saves.',
          },
          {
            vi: 'Báo giá: click nút in (printer icon) để xem modal báo giá, sau đó click "IN / PDF" để in hoặc xuất PDF.',
            en: 'Quotation: click the print icon to view the quotation modal, then click "PRINT / PDF" to print or export PDF.',
          },
          {
            vi: 'Xóa BOM: click nút xóa (trash icon) — chỉ Admin có quyền này. Xác nhận trước khi xóa.',
            en: 'Delete BOM: click the trash icon — Admin only. Confirm before deleting.',
          },
          {
            vi: 'Duyệt/Từ chối BOM (pending): Admin/Manager thấy badge đếm BOM chờ duyệt. Click để lọc và duyệt/từ chối.',
            en: 'Approve/Reject BOM (pending): Admin/Manager see a pending badge count. Click to filter and approve/reject.',
          },
        ],
      },
      {
        id: 'gold',
        icon: 'fa-coins',
        title: { vi: 'Giá Vàng', en: 'Gold Prices' },
        steps: [
          {
            vi: 'Xem lịch sử giá vàng theo ngày (giá Amark, giá/gram từng loại karat).',
            en: 'View gold price history by date (Amark price, price per gram for each karat).',
          },
          {
            vi: 'Hệ thống tự động lấy giá Amark mỗi ngày qua cron job. Nếu cần, Admin/Manager có thể thêm thủ công hoặc chỉnh sửa giá.',
            en: 'The system auto-fetches Amark prices daily via cron. If needed, Admin/Manager can manually add or edit prices.',
          },
          {
            vi: 'Giá vàng được dùng khi tính BOM — hệ thống lấy giá của ngày gần nhất ≤ ngày BOM.',
            en: 'Gold prices are used when calculating BOMs — the system uses the nearest date ≤ BOM date.',
          },
        ],
      },
      {
        id: 'mk',
        icon: 'fa-tags',
        title: { vi: 'MK Data (Bảng Giá)', en: 'MK Data (Pricing Tables)' },
        steps: [
          {
            vi: 'Quản lý CIF Rate: tỷ lệ chi phí vận chuyển/bảo hiểm theo từng Price List Type.',
            en: 'Manage CIF Rate: shipping/insurance cost rate per Price List Type.',
          },
          {
            vi: 'Quản lý Store Markup: hệ số nhân để tính giá bán từ tổng cost (CASE B).',
            en: 'Manage Store Markup: multiplier to calculate sell price from total cost (CASE B).',
          },
          {
            vi: 'Quản lý Price/Gram: giá bán theo gram và additional price cho CASE A (không có đá).',
            en: 'Manage Price/Gram: sell price per gram and additional price for CASE A (no stones).',
          },
          {
            vi: 'Quản lý Process Fee: phí công thợ (nhận hột, lắp ráp) — dùng tính labor cost.',
            en: 'Manage Process Fee: labor fees (stone setting, assembly) — used to calculate labor cost.',
          },
          {
            vi: 'Mọi thay đổi MK Data sẽ ảnh hưởng đến các BOM được tính sau thời điểm thay đổi.',
            en: 'All MK Data changes affect BOMs calculated after the change.',
          },
        ],
      },
      {
        id: 'master',
        icon: 'fa-gem',
        title: { vi: 'Stone Data (Danh Mục Đá)', en: 'Stone Data (Stone Catalog)' },
        steps: [
          {
            vi: 'Xem và quản lý danh mục đá: group code, loại đá, kích thước (mm hoặc ct), grade, giá bán.',
            en: 'View and manage stone catalog: group code, stone type, size (mm or ct), grade, selling price.',
          },
          {
            vi: 'Thêm/sửa/xóa stone records. Mỗi record định nghĩa một range kích thước với giá tương ứng.',
            en: 'Add/edit/delete stone records. Each record defines a size range with corresponding price.',
          },
          {
            vi: 'Dữ liệu đá được dùng trong Tính Giá: khi nhập group code + size → tự động lookup giá bán.',
            en: 'Stone data is used in BOM Pricing: entering group code + size auto-looks up the selling price.',
          },
        ],
      },
      {
        id: 'users',
        icon: 'fa-users',
        title: { vi: 'Người Dùng', en: 'User Management' },
        steps: [
          {
            vi: 'Xem danh sách tất cả tài khoản: username, role, store, trạng thái.',
            en: 'View all accounts: username, role, store, status.',
          },
          {
            vi: 'Tạo tài khoản mới: nhập username, email, mật khẩu, chọn role (Admin/Manager/Order/Sales Supervisor/Sales) và store (VN/US/ADM).',
            en: 'Create new account: enter username, email, password, select role (Admin/Manager/Order/Sales Supervisor/Sales) and store (VN/US/ADM).',
          },
          {
            vi: 'Chỉnh sửa tài khoản: đổi role, store, hoặc reset mật khẩu.',
            en: 'Edit account: change role, store, or reset password.',
          },
          {
            vi: 'Xóa tài khoản: click nút xóa. Lưu ý: không thể xóa tài khoản đang đăng nhập.',
            en: 'Delete account: click the delete button. Note: cannot delete the currently logged-in account.',
          },
        ],
        tip: {
          vi: 'Store quyết định BOM nào nhân viên thấy trong Review. Chỉ Admin/Manager thấy toàn bộ stores.',
          en: 'Store determines which BOMs staff can see in Review. Only Admin/Manager see all stores.',
        },
      },
      {
        id: 'audit',
        icon: 'fa-shield-halved',
        title: { vi: 'Nhật Ký Hoạt Động (Audit Log)', en: 'Audit Log' },
        steps: [
          {
            vi: 'Xem toàn bộ lịch sử thao tác: tạo BOM, sửa BOM, xóa, chiết khấu, thay đổi giá vàng, MK data, stone, user.',
            en: 'View full activity history: create BOM, edit BOM, delete, discount, gold price changes, MK data, stone, user changes.',
          },
          {
            vi: 'Mỗi log hiển thị: thời gian, người thực hiện, action (CREATE/UPDATE/DELETE/DISCOUNT), đối tượng, tóm tắt.',
            en: 'Each log shows: timestamp, actor, action (CREATE/UPDATE/DELETE/DISCOUNT), entity, summary.',
          },
          {
            vi: 'Click "Xem Diff" để xem chi tiết thay đổi before/after — so sánh dữ liệu trước và sau khi sửa.',
            en: 'Click "View Diff" to see detailed before/after changes — comparing data before and after edits.',
          },
          {
            vi: 'Lọc log theo loại action, entity, hoặc tìm theo username/BOM ID.',
            en: 'Filter logs by action type, entity, or search by username/BOM ID.',
          },
        ],
      },
    ],
  },

  Manager: {
    roleName: { vi: 'Quản Lý (Manager)', en: 'Manager' },
    overview: {
      vi: 'Manager có quyền quản lý tương đương Admin, ngoại trừ: không xóa BOM và không quản lý tài khoản người dùng. Thấy giá cost và giá bán của tất cả stores.',
      en: 'Manager has similar authority to Admin, except: cannot delete BOMs and cannot manage user accounts. Can see cost and sell prices across all stores.',
    },
    sections: [
      {
        id: 'dashboard',
        icon: 'fa-house',
        title: { vi: 'Trang Chủ (Dashboard)', en: 'Dashboard' },
        steps: [
          {
            vi: 'Xem đầy đủ KPI: tổng BOM, hôm nay, tháng này, tổng giá trị, giá bán trung bình.',
            en: 'View full KPIs: total BOMs, today, this month, total value, average sell price.',
          },
          {
            vi: 'Xem biểu đồ phân tích theo cửa hàng, loại sản phẩm và nhân viên bán hàng.',
            en: 'View analytics charts by store, product type, and salesperson.',
          },
          {
            vi: 'Điều chỉnh tỷ giá VND trong header.',
            en: 'Adjust VND exchange rate in the header.',
          },
        ],
      },
      {
        id: 'tinh-gia',
        icon: 'fa-calculator',
        title: { vi: 'Tính Giá BOM', en: 'BOM Pricing' },
        steps: [
          {
            vi: 'Tạo BOM mới: nhập đầy đủ header → vàng → đá (nếu có) → tính → lưu. Xem hướng dẫn chi tiết trong phần Admin.',
            en: 'Create new BOM: fill header → gold → stones (if any) → calculate → save. See detailed steps in the Admin guide.',
          },
          {
            vi: 'Chỉnh sửa BOM từ trang Review (click nút Edit).',
            en: 'Edit BOMs from the Review page (click Edit button).',
          },
        ],
      },
      {
        id: 'review',
        icon: 'fa-clock-rotate-left',
        title: { vi: 'Lịch Sử BOM (Review)', en: 'BOM History (Review)' },
        steps: [
          {
            vi: 'Xem toàn bộ BOM tất cả stores, bao gồm cost và giá bán.',
            en: 'View all BOMs across all stores, including cost and sell prices.',
          },
          {
            vi: 'Áp dụng chiết khấu: click nút "%" → nhập % → xác nhận.',
            en: 'Apply discount: click "%" button → enter % → confirm.',
          },
          {
            vi: 'In báo giá: click print icon → xem modal → click "IN / PDF".',
            en: 'Print quotation: click print icon → view modal → click "PRINT / PDF".',
          },
          {
            vi: 'Duyệt/Từ chối BOM đang chờ duyệt (pending).',
            en: 'Approve/Reject pending BOMs.',
          },
        ],
        tip: {
          vi: 'Manager không thể xóa BOM — chỉ Admin có quyền đó.',
          en: 'Managers cannot delete BOMs — only Admins can.',
        },
      },
      {
        id: 'gold',
        icon: 'fa-coins',
        title: { vi: 'Giá Vàng', en: 'Gold Prices' },
        steps: [
          {
            vi: 'Xem và chỉnh sửa giá vàng. Hệ thống tự lấy giá Amark hàng ngày.',
            en: 'View and edit gold prices. System auto-fetches Amark prices daily.',
          },
        ],
      },
      {
        id: 'mk',
        icon: 'fa-tags',
        title: { vi: 'MK Data', en: 'MK Data' },
        steps: [
          {
            vi: 'Xem và cập nhật CIF Rate, Store Markup, Price/Gram, Process Fee.',
            en: 'View and update CIF Rate, Store Markup, Price/Gram, Process Fee.',
          },
        ],
      },
      {
        id: 'master',
        icon: 'fa-gem',
        title: { vi: 'Stone Data', en: 'Stone Data' },
        steps: [
          {
            vi: 'Xem và quản lý danh mục đá: thêm, sửa, xóa records.',
            en: 'View and manage stone catalog: add, edit, delete records.',
          },
        ],
      },
      {
        id: 'audit',
        icon: 'fa-shield-halved',
        title: { vi: 'Nhật Ký Hoạt Động', en: 'Audit Log' },
        steps: [
          {
            vi: 'Xem toàn bộ lịch sử thao tác của tất cả users. Xem diff before/after khi cần.',
            en: 'View full activity history for all users. View before/after diff when needed.',
          },
        ],
      },
    ],
  },

  Order: {
    roleName: { vi: 'Nhân Viên Order', en: 'Order Staff' },
    overview: {
      vi: 'Order chuyên tính giá BOM cho cửa hàng được gán. Thấy giá bán (sell price) nhưng không thấy giá cost. Có thể tạo, sửa BOM và quản lý stone data.',
      en: 'Order staff specializes in BOM pricing for their assigned store. Can see sell price but not cost price. Can create, edit BOMs and manage stone data.',
    },
    sections: [
      {
        id: 'dashboard',
        icon: 'fa-house',
        title: { vi: 'Trang Chủ (Dashboard)', en: 'Dashboard' },
        steps: [
          {
            vi: 'Xem KPI cơ bản: tổng số BOM đã tạo, BOM hôm nay, BOM tháng này.',
            en: 'View basic KPIs: total BOMs created, today\'s BOMs, this month\'s BOMs.',
          },
        ],
      },
      {
        id: 'tinh-gia',
        icon: 'fa-calculator',
        title: { vi: 'Tính Giá BOM', en: 'BOM Pricing' },
        steps: [
          {
            vi: 'Bước 1 — Thông Tin: Chọn ngày, loại sản phẩm, nhập mã model (bắt buộc), chọn bảng giá, kiểu SP, nhân viên, cửa hàng, khách hàng và ghi chú.',
            en: 'Step 1 — Info: Select date, product type, enter model number (required), choose price list type, SP type, salesperson, store, customer, and notes.',
          },
          {
            vi: 'Bước 2 — Vàng: Thêm dòng vàng, chọn loại/màu, nhập trọng lượng. Giá/gr tự động cập nhật.',
            en: 'Step 2 — Gold: Add gold rows, select type/color, enter weight. Price/gr is auto-updated.',
          },
          {
            vi: 'Bước 3 — Hột Đá: Thêm hột đá nếu có. Chọn mã hột, nhập size hoặc ct, nhập số lượng. Hệ thống tự lookup giá.',
            en: 'Step 3 — Stones: Add stones if applicable. Select group code, enter size or ct, enter quantity. System auto-looks up price.',
          },
          {
            vi: 'Bước 4 — Tổng Hợp: Click "Tính" để xem giá bán. Click "Lưu" để tạo BOM (sẽ có BOM ID).',
            en: 'Step 4 — Summary: Click "Calculate" to see sell price. Click "Save" to create the BOM (a BOM ID will be generated).',
          },
          {
            vi: 'Template: từ Review, click "Copy Template" để tạo BOM mới từ mẫu BOM cũ — tiết kiệm thời gian khi sản phẩm tương tự.',
            en: 'Template: from Review, click "Copy Template" to create a new BOM based on an existing one — saves time for similar products.',
          },
        ],
        tip: {
          vi: 'Luôn nhập đúng Price List Type phù hợp với cửa hàng (VN/US/ADM) để tính giá chính xác.',
          en: 'Always enter the correct Price List Type for your store (VN/US/ADM) to ensure accurate pricing.',
        },
      },
      {
        id: 'review',
        icon: 'fa-clock-rotate-left',
        title: { vi: 'Lịch Sử BOM', en: 'BOM History' },
        steps: [
          {
            vi: 'Xem danh sách BOM của cửa hàng mình. Thấy giá bán và thông tin chiết khấu.',
            en: 'View BOM list for your store. Can see sell price and discount information.',
          },
          {
            vi: 'Sửa BOM: click nút Edit → chỉnh sửa thông tin → lưu lại.',
            en: 'Edit BOM: click Edit button → modify information → save.',
          },
          {
            vi: 'In báo giá: click print icon → xem modal báo giá → click "IN / PDF".',
            en: 'Print quotation: click print icon → view quotation modal → click "PRINT / PDF".',
          },
        ],
        tip: {
          vi: 'Order không thấy giá cost (chi phí vàng, đá, công). Chỉ thấy giá bán cuối cùng.',
          en: 'Order staff cannot see cost prices (gold, stone, labor costs). Only the final sell price is visible.',
        },
      },
      {
        id: 'master',
        icon: 'fa-gem',
        title: { vi: 'Stone Data', en: 'Stone Data' },
        steps: [
          {
            vi: 'Xem danh mục đá: group code, loại, kích thước, grade, giá bán.',
            en: 'View stone catalog: group code, type, size, grade, selling price.',
          },
          {
            vi: 'Quản lý stone records nếu được phân quyền thêm/sửa.',
            en: 'Manage stone records if authorized to add/edit.',
          },
        ],
      },
    ],
  },

  'Sales Supervisor': {
    roleName: { vi: 'Giám Sát Bán Hàng (Sales Supervisor)', en: 'Sales Supervisor' },
    overview: {
      vi: 'Sales Supervisor giám sát BOM của cửa hàng mình. Chỉ xem — không tạo hay sửa BOM, không thấy giá cost và giá bán. Có thể in báo giá cho khách.',
      en: 'Sales Supervisor oversees BOMs for their store. View-only — cannot create or edit BOMs, cannot see cost or sell prices. Can print quotations for customers.',
    },
    sections: [
      {
        id: 'dashboard',
        icon: 'fa-house',
        title: { vi: 'Trang Chủ (Dashboard)', en: 'Dashboard' },
        steps: [
          {
            vi: 'Xem KPI cơ bản của cửa hàng: tổng số BOM, BOM hôm nay, BOM tháng này.',
            en: 'View basic store KPIs: total BOMs, today\'s BOMs, this month\'s BOMs.',
          },
        ],
      },
      {
        id: 'review',
        icon: 'fa-clock-rotate-left',
        title: { vi: 'Lịch Sử BOM', en: 'BOM History' },
        steps: [
          {
            vi: 'Xem danh sách BOM của cửa hàng mình (lọc theo store được gán).',
            en: 'View BOM list for your store (filtered by assigned store).',
          },
          {
            vi: 'Tìm kiếm và lọc: dùng ô search, lọc theo ngày hoặc loại sản phẩm để tìm BOM cần xem.',
            en: 'Search and filter: use search box, filter by date or product type to find specific BOMs.',
          },
          {
            vi: 'Xem chi tiết BOM: click icon chi tiết để xem thông tin sản phẩm, hình ảnh, thành phần vật liệu.',
            en: 'View BOM details: click the detail icon to see product info, images, material components.',
          },
          {
            vi: 'In báo giá: click print icon → xem modal báo giá → click "IN / PDF" để in hoặc lưu PDF.',
            en: 'Print quotation: click print icon → view quotation modal → click "PRINT / PDF" to print or save PDF.',
          },
        ],
        tip: {
          vi: 'Sales Supervisor không thấy giá bán hay giá cost trong danh sách. Báo giá PDF dùng để cung cấp cho khách hàng.',
          en: 'Sales Supervisor cannot see sell or cost prices in the list. PDF quotations are for customer use.',
        },
      },
    ],
  },

  Sales: {
    roleName: { vi: 'Nhân Viên Bán Hàng (Sales)', en: 'Sales Staff' },
    overview: {
      vi: 'Sales xem lịch sử BOM của cửa hàng mình để hỗ trợ tư vấn khách hàng. Chỉ xem — không tạo, sửa hay xóa BOM, không thấy giá cost và giá bán.',
      en: 'Sales staff view BOM history for their store to support customer consultations. View-only — cannot create, edit or delete BOMs, cannot see cost or sell prices.',
    },
    sections: [
      {
        id: 'dashboard',
        icon: 'fa-house',
        title: { vi: 'Trang Chủ (Dashboard)', en: 'Dashboard' },
        steps: [
          {
            vi: 'Xem KPI cơ bản: tổng số BOM, BOM hôm nay, BOM tháng này của cửa hàng.',
            en: 'View basic KPIs: total BOMs, today\'s BOMs, this month\'s BOMs for your store.',
          },
        ],
      },
      {
        id: 'review',
        icon: 'fa-clock-rotate-left',
        title: { vi: 'Lịch Sử BOM', en: 'BOM History' },
        steps: [
          {
            vi: 'Xem danh sách BOM của cửa hàng mình.',
            en: 'View BOM list for your store.',
          },
          {
            vi: 'Tìm kiếm theo BOM ID, model, SO/MO hoặc lọc theo ngày, loại sản phẩm.',
            en: 'Search by BOM ID, model, SO/MO or filter by date, product type.',
          },
          {
            vi: 'Xem chi tiết BOM: thông tin sản phẩm, hình ảnh, thành phần vật liệu vàng và đá.',
            en: 'View BOM details: product info, images, gold and stone material components.',
          },
          {
            vi: 'In báo giá: click print icon → xem modal → click "IN / PDF" để cung cấp cho khách hàng.',
            en: 'Print quotation: click print icon → view modal → click "PRINT / PDF" for the customer.',
          },
        ],
        tip: {
          vi: 'Sales không thấy giá bán hay giá cost. Báo giá PDF dùng để tư vấn khách hàng mà không lộ giá nội bộ.',
          en: 'Sales staff cannot see sell or cost prices. PDF quotations are for customer consultation without exposing internal pricing.',
        },
      },
    ],
  },
}

export function getGuideForRole(role: Role): RoleGuide {
  return GUIDE_CONTENT[role] ?? GUIDE_CONTENT['Sales']
}

export const ALL_ROLES: Role[] = ['Admin', 'Manager', 'Order', 'Sales Supervisor', 'Sales']
