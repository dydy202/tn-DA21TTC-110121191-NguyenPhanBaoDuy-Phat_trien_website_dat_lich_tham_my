const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const nodemailer = require("nodemailer");

// Cấu hình nodemailer để gửi email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "npb.duy.2002@gmail.com", // Thay bằng email Gmail của bạn
    pass: "fccgihkagjrlmvdx", // Thay bằng App Password của Gmail
  },
});

// Middleware kiểm tra đăng nhập và quyền Nhân viên
const requireEmployee = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "Vui lòng đăng nhập!");
    return res.redirect(
      `/dangnhap?redirect=${encodeURIComponent(req.originalUrl)}`
    );
  }
  if (req.session.user.roleId !== 2) {
    req.flash("error", "Bạn không có quyền truy cập trang này!");
    return res.redirect("/trangchu");
  }
  next();
};

// Route xử lý GET /nhanvien/request-leave
router.get("/nhanvien/request-leave", requireEmployee, (req, res) => {
  req.flash("error", "Yêu cầu không hợp lệ. Vui lòng sử dụng form xin nghỉ!");
  res.redirect("/nhanvien");
});

// Route dashboard Nhân viên
router.get("/nhanvien", requireEmployee, async (req, res) => {
  try {
    const { MaNV } = req.session.user;
    console.log("MaNV từ session:", MaNV);

    // Lấy danh sách lịch hẹn của nhân viên
    const appointmentsResult = await query(
      `
      SELECT lh.MaLH, lh.NgayHen, lh.GioHen, lh.TrangThaiLH, lh.MaSP, lh.MaKH, sp.TenSP, kh.HoTenKH
      FROM LichHen lh
      LEFT JOIN SanPham sp ON lh.MaSP = sp.MaSP
      LEFT JOIN KhachHang kh ON lh.MaKH = kh.MaKH
      WHERE lh.MaNV = @MaNV AND lh.TrangThaiLH IN (N'Chờ xác nhận', N'Đã xác nhận')
      ORDER BY lh.NgayHen DESC, lh.GioHen DESC
      `,
      { MaNV }
    );
    const appointments = appointmentsResult.recordset || [];

    // Lấy danh sách ngày nghỉ
    const leaveDatesResult = await query(
      `
      SELECT NgayNghi, TrangThaiNghi
      FROM NghiPhep
      WHERE MaNV = @MaNV
      `,
      { MaNV }
    );
    const leaveDates = leaveDatesResult.recordset.map((row) => ({
      NgayNghi: new Date(row.NgayNghi).toISOString().split("T")[0],
      TrangThaiNghi: row.TrangThaiNghi,
    }));

    // Thống kê
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Số ngày làm việc (distinct ngày có lịch hẹn đã xác nhận hoặc chờ xác nhận)
    const workingDaysResult = await query(
      `
      SELECT COUNT(DISTINCT CAST(NgayHen AS DATE)) AS workingDays
      FROM LichHen
      WHERE MaNV = @MaNV 
      AND NgayHen BETWEEN @startDate AND @endDate
      AND TrangThaiLH IN (N'Chờ xác nhận', N'Đã xác nhận')
      `,
      {
        MaNV,
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: endOfMonth.toISOString().split("T")[0],
      }
    );
    const workingDays = workingDaysResult.recordset[0]?.workingDays || 0;

    // Số ngày nghỉ (từ bảng NghiPhep, trạng thái Đã duyệt)
    const leaveDaysResult = await query(
      `
      SELECT COUNT(*) AS leaveDays
      FROM NghiPhep
      WHERE MaNV = @MaNV 
      AND NgayNghi BETWEEN @startDate AND @endDate
      AND TrangThaiNghi = N'Đã duyệt'
      `,
      {
        MaNV,
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: endOfMonth.toISOString().split("T")[0],
      }
    );
    const leaveDays = leaveDaysResult.recordset[0]?.leaveDays || 0;

    // Số đơn hàng hoàn thành
    const completedAppointmentsResult = await query(
      `
      SELECT COUNT(*) AS completedAppointments
      FROM LichHen
      WHERE MaNV = @MaNV 
      AND TrangThaiLH = N'Đã xác nhận'
      AND NgayHen BETWEEN @startDate AND @endDate
      `,
      {
        MaNV,
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: endOfMonth.toISOString().split("T")[0],
      }
    );
    const completedAppointments =
      completedAppointmentsResult.recordset[0]?.completedAppointments || 0;

    // Số đơn hàng bị hủy
    const cancelledAppointmentsResult = await query(
      `
      SELECT COUNT(*) AS cancelledAppointments
      FROM LichHen
      WHERE MaNV = @MaNV 
      AND TrangThaiLH = N'Đã hủy'
      AND NgayHen BETWEEN @startDate AND @endDate
      `,
      {
        MaNV,
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: endOfMonth.toISOString().split("T")[0],
      }
    );
    const cancelledAppointments =
      cancelledAppointmentsResult.recordset[0]?.cancelledAppointments || 0;

    // Gửi dữ liệu thống kê và lịch hẹn
    const stats = {
      workingDays,
      leaveDays,
      completedAppointments,
      cancelledAppointments,
    };

    res.render("nhanvien/nhanvien", {
      user: req.session.user,
      appointments,
      stats,
      leaveDates,
      message: req.flash("success").length
        ? { type: "success", text: req.flash("success").join(", ") }
        : req.flash("error").length
        ? { type: "danger", text: req.flash("error").join(", ") }
        : null,
      csrfToken: res.locals.csrfToken,
    });
  } catch (error) {
    console.error("Lỗi khi tải dashboard nhân viên:", error);
    req.flash("error", "Có lỗi xảy ra khi tải trang.");
    res.redirect("/trangchu");
  }
});

// Route sửa thông tin nhân viên
router.post("/nhanvien/edit-profile", requireEmployee, async (req, res) => {
  try {
    const { MaNV } = req.session.user;
    const { hoTenNV, soDienThoaiNV } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!hoTenNV || !soDienThoaiNV) {
      req.flash("error", "Vui lòng điền đầy đủ thông tin!");
      return res.redirect("/nhanvien");
    }

    // Kiểm tra định dạng số điện thoại
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(soDienThoaiNV)) {
      req.flash("error", "Số điện thoại phải có đúng 10 chữ số!");
      return res.redirect("/nhanvien");
    }

    // Cập nhật thông tin nhân viên
    await query(
      `
      UPDATE NhanVien
      SET HoTenNV = @HoTenNV, SoDienThoaiNV = @SoDienThoaiNV
      WHERE MaNV = @MaNV
      `,
      {
        MaNV,
        HoTenNV: hoTenNV,
        SoDienThoaiNV: soDienThoaiNV,
      }
    );

    // Cập nhật session
    req.session.user.HoTenNV = hoTenNV;
    req.session.user.SoDienThoaiNV = soDienThoaiNV;

    req.flash("success", "Cập nhật thông tin thành công!");
    res.redirect("/nhanvien");
  } catch (error) {
    console.error("Lỗi khi sửa thông tin nhân viên:", error);
    req.flash("error", "Có lỗi xảy ra khi cập nhật thông tin.");
    res.redirect("/nhanvien");
  }
});

// Route đăng ký xin nghỉ
router.post("/nhanvien/request-leave", requireEmployee, async (req, res) => {
  try {
    const { MaNV } = req.session.user;
    const { leaveDate, reason } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!leaveDate || !reason) {
      req.flash("error", "Vui lòng điền đầy đủ ngày nghỉ và lý do!");
      return res.redirect("/nhanvien");
    }

    // Kiểm tra ngày nghỉ phải từ 5 ngày sau trở đi
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 5);
    const selectedDate = new Date(leaveDate);

    if (selectedDate < minDate) {
      req.flash("error", "Ngày nghỉ phải từ 5 ngày sau trở đi!");
      return res.redirect("/nhanvien");
    }

    // Kiểm tra xem ngày nghỉ đã được đăng ký chưa
    const existingLeave = await query(
      `
      SELECT 1
      FROM NghiPhep
      WHERE MaNV = @MaNV AND NgayNghi = @NgayNghi
      `,
      {
        MaNV,
        NgayNghi: leaveDate,
      }
    );

    if (existingLeave.recordset.length > 0) {
      req.flash("error", "Bạn đã đăng ký nghỉ ngày này rồi!");
      return res.redirect("/nhanvien");
    }

    // Lưu yêu cầu nghỉ
    await query(
      `
      INSERT INTO NghiPhep (MaNV, NgayNghi, LyDo, TrangThaiNghi)
      VALUES (@MaNV, @NgayNghi, @LyDo, N'Chờ duyệt')
      `,
      {
        MaNV,
        NgayNghi: leaveDate,
        LyDo: reason,
      }
    );

    // Lấy thông tin nhân viên để gửi email
    const employeeResult = await query(
      `
      SELECT HoTenNV, EmailNV
      FROM NhanVien
      WHERE MaNV = @MaNV
      `,
      { MaNV }
    );
    const employee = employeeResult.recordset[0];

    if (!employee || !employee.EmailNV) {
      throw new Error(
        "Không tìm thấy thông tin nhân viên hoặc email không hợp lệ!"
      );
    }

    // Gửi email thông báo đến admin
    const mailOptions = {
      from: "your-email@gmail.com", // Thay bằng email của bạn
      to: "npb.duy.2002@gmail.com",
      subject: "Yêu Cầu Xin Nghỉ - Tiệm Nail Diamond",
      html: `
        <h3>Yêu cầu xin nghỉ mới</h3>
        <p><strong>Nhân viên:</strong> ${employee.HoTenNV}</p>
        <p><strong>Ngày nghỉ:</strong> ${new Date(leaveDate).toLocaleDateString(
          "vi-VN"
        )}</p>
        <p><strong>Lý do:</strong> ${reason}</p>
        <p><strong>Trạng thái:</strong> Chờ duyệt</p>
        <p>Vui lòng truy cập <a href="http://localhost:3000/admin/nghiphep">trang quản lý nghỉ phép</a> để duyệt yêu cầu.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    req.flash("success", "Yêu cầu xin nghỉ đã được gửi thành công!");
    res.redirect("/nhanvien");
  } catch (error) {
    console.error("Lỗi khi đăng ký xin nghỉ:", error);
    req.flash(
      "error",
      "Có lỗi xảy ra khi gửi yêu cầu xin nghỉ: " + error.message
    );
    res.redirect("/nhanvien");
  }
});

module.exports = router;
