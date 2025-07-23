# tn-DA21TTC-110121191-NguyenPhanBaoDuy-Phat_trien_website_dat_lich_tham_my

## PHÁT TRIỂN WEBSITE ĐẶT LỊCH DỊCH VỤ THẨM MỸ

### Giảng viên hướng dẫn

- Nguyễn Ngọc Đan Thanh
- Email: ngocdanthanhdt@tvu.edu.vn

### Sinh viên thực hiện

- Nguyễn Phan Bảo Duy
- Email: npb.duy.2002@gmail.com
- Số điện thoại: 0348119380

## MỤC TIÊU

- Xây dựng một hệ thống website đặt lịch dịch vụ thẩm mỹ với các chức năng cơ bản như: hiển thị danh sách dịch vụ, thông tin chuyên viên, đặt lịch hẹn theo thời gian thực, quản lý lịch sử đặt lịch và hỗ trợ tương tác giữa khách hàng và doanh nghiệp.
- Đáp ứng nhu cầu số hóa hoạt động quản lý dịch vụ thẩm mỹ, giúp doanh nghiệp tối ưu hóa quy trình làm việc, giảm thiểu thời gian chờ đợi của khách hàng, đồng thời nâng cao trải nghiệm người dùng.
- Thiết kế giao diện người dùng thân thiện, trực quan, dễ sử dụng cho cả khách hàng và quản trị viên, phù hợp với mọi đối tượng người dùng.

## KIẾN TRÚC

- Frontend: Sử dụng HTML, CSS, và JAVASCRIPT để xây dựng giao diện người dùng trực quan.
- Backend: Xây dựng bằng Node.js, Express.js, API RESTful cùng với các thư viện hỗ trợ giúp bảo mật thông tin người dùng, quản lý phiên làm việc và hiển thị thông báo giữa các trang.

## PHẦN MỀM CẦN THIẾT

- Figma: Công cụ thiết kế giao diện người dùng (UI), thiết kế UX và tạo prototype trên nền tảng web.

- Git: Dùng để clone và quản lý mã nguồn từ repository (hệ thống kiểm soát phiên bản phân tán).

- Node.js: Dùng để biên dịch và chạy các công cụ phân tích mã như ESLint, cũng như xây dựng backend.

- PowerDesigner: Dùng để thiết kế lược đồ cơ sở dữ liệu, mô hình hóa dữ liệu (ERD), và phân tích hệ thống.

- SQL Server Management Studio (SSMS): Dùng để quản lý, truy vấn và thiết kế cơ sở dữ liệu SQL Server.

- Visual Paradigm: Phần mềm mô hình hóa UML, thiết kế hệ thống, tạo sơ đồ và quản lý quy trình phần mềm.

- Visual Studio Code (VS Code): Trình soạn thảo mã nguồn nhẹ, hỗ trợ nhiều ngôn ngữ lập trình và mở rộng bằng tiện ích.

## CÁCH THỨC CHẠY CHƯƠNG TRÌNH

### Clone Repository

- Mở terminal hoặc command prompt
- Chạy lệnh sau để tải mã nguồn từ GitHub
  - git clone https://github.com/KimHa7356/tn-DA21TTC-110121020-AuKimHa-KTma_HTML_CSS_JAVASCRIPT.git

### Chạy Backend

- Mở terminal, di chuyển đến thư mục dự án, và chạy server FastAPI:
  - uvicorn main:app --reload
- Mở Frontend
  - http://127.0.0.1:8000
