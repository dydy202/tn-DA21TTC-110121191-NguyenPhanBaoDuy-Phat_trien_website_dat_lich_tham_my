const sql = require("mssql");
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const { query, emailConfig } = require("../config/db");
const multer = require("multer");
const fsPromises = require("fs").promises;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: emailConfig.user, pass: emailConfig.pass },
});

const verificationCodes = {};

// Cấu hình multer để upload hình ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/khachhang");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Khởi tạo middleware upload
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh JPG, PNG!"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Trang khách hàng
router.get("/trangchu", async (req, res) => {
  try {
    res.render("khachhang/trangchu", {
      services: [],
      success: req.flash("success"),
      error: req.flash("error"),
      user: req.session.user,
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Error loading homepage:", err);
    req.flash("error", "Không thể tải trang chủ. Vui lòng thử lại.");
    res.redirect("/dangnhap");
  }
});

// Middleware kiểm tra đăng nhập
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    const redirect = req.query.redirect || "/datlich";
    req.flash("error", "Vui lòng đăng nhập để đặt lịch.");
    return res.redirect(`/dangnhap?redirect=${encodeURIComponent(redirect)}`);
  }
  next();
};

// Route lấy giá dịch vụ
router.get("/get-service-price", async (req, res) => {
  const { maSP } = req.query;

  if (!maSP || isNaN(parseInt(maSP))) {
    return res.status(400).json({ error: "Mã dịch vụ không hợp lệ!" });
  }

  try {
    const result = await query(
      "SELECT TenSP, GiaSP FROM SanPham WHERE MaSP = @MaSP",
      { MaSP: parseInt(maSP) }
    );

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ error: "Dịch vụ không tồn tại!" });
    }

    const { TenSP, GiaSP } = result.recordset[0];
    res.json({ TenSP, GiaSP });
  } catch (err) {
    console.error("Lỗi khi lấy giá dịch vụ:", err);
    res.status(500).json({ error: "Không thể lấy thông tin dịch vụ." });
  }
});

// Route GET /datlich
router.get("/datlich", requireLogin, async (req, res) => {
  try {
    const services = await query("SELECT * FROM SanPham");
    const employees = await query("SELECT * FROM NhanVien");
    console.log("Employees:", employees);
    res.render("khachhang/datlich", {
      services: { recordset: services.recordset || [] },
      employees: { recordset: employees.recordset || [] },
      success: req.flash("success") || [],
      error: req.flash("error") || [],
      user: req.session.user,
      csrfToken: "", // Không cần CSRF
      formData: {},
      bookingDetails: {},
    });
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu đặt lịch:", err);
    req.flash("error", "Không thể tải trang đặt lịch.");
    res.redirect("/trangchu");
  }
});

// Route POST /datlich
router.post(
  "/datlich",
  requireLogin,
  upload.single("hinhanh"),
  async (req, res) => {
    try {
      const {
        ngayhen,
        thoigian,
        dichvu,
        nhanvien,
        ghichu,
        paymentType,
        paymentMethod,
      } = req.body;
      const hinhanh = req.file
        ? `/uploads/khachhang/${req.file.filename}`
        : null;

      console.log("Request body:", req.body);
      console.log(
        "nhanvien:",
        nhanvien,
        "dichvu:",
        dichvu,
        "paymentType:",
        paymentType,
        "paymentMethod:",
        paymentMethod
      );

      if (!req.session.user || !req.session.user.MaKH) {
        req.flash(
          "error",
          "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
        );
        return res.redirect("/dangnhap?redirect=/datlich");
      }

      // Kiểm tra định dạng thoigian
      if (!thoigian || !/^\d{2}:\d{2}$/.test(thoigian)) {
        req.flash("error", "Giờ đặt lịch không hợp lệ. Vui lòng chọn lại.");
        const services = await query("SELECT * FROM SanPham");
        const employees = await query("SELECT * FROM NhanVien");
        return res.render("khachhang/datlich", {
          services: { recordset: services.recordset || [] },
          employees: { recordset: employees.recordset || [] },
          success: [],
          error: req.flash("error"),
          user: req.session.user,
          csrfToken: "",
          formData: req.body,
          bookingDetails: {},
        });
      }

      // Kiểm tra nhanvien và dichvu
      if (!nhanvien || isNaN(parseInt(nhanvien))) {
        req.flash("error", "Nhân viên không hợp lệ.");
        const services = await query("SELECT * FROM SanPham");
        const employees = await query("SELECT * FROM NhanVien");
        return res.render("khachhang/datlich", {
          services: { recordset: services.recordset || [] },
          employees: { recordset: employees.recordset || [] },
          success: [],
          error: req.flash("error"),
          user: req.session.user,
          csrfToken: "",
          formData: req.body,
          bookingDetails: {},
        });
      }

      if (!dichvu || isNaN(parseInt(dichvu))) {
        req.flash("error", "Dịch vụ không hợp lệ.");
        const services = await query("SELECT * FROM SanPham");
        const employees = await query("SELECT * FROM NhanVien");
        return res.render("khachhang/datlich", {
          services: { recordset: services.recordset || [] },
          employees: { recordset: employees.recordset || [] },
          success: [],
          error: req.flash("error"),
          user: req.session.user,
          csrfToken: "",
          formData: req.body,
          bookingDetails: {},
        });
      }

      // Kiểm tra paymentType
      if (!["deposit10", "full100"].includes(paymentType)) {
        req.flash("error", "Hình thức thanh toán không hợp lệ.");
        const services = await query("SELECT * FROM SanPham");
        const employees = await query("SELECT * FROM NhanVien");
        return res.render("khachhang/datlich", {
          services: { recordset: services.recordset || [] },
          employees: { recordset: employees.recordset || [] },
          success: [],
          error: req.flash("error"),
          user: req.session.user,
          csrfToken: "",
          formData: req.body,
          bookingDetails: {},
        });
      }

      // Kiểm tra paymentMethod
      if (!["bank", "momo"].includes(paymentMethod)) {
        req.flash("error", "Phương thức thanh toán không hợp lệ.");
        const services = await query("SELECT * FROM SanPham");
        const employees = await query("SELECT * FROM NhanVien");
        return res.render("khachhang/datlich", {
          services: { recordset: services.recordset || [] },
          employees: { recordset: employees.recordset || [] },
          success: [],
          error: req.flash("error"),
          user: req.session.user,
          csrfToken: "",
          formData: req.body,
          bookingDetails: {},
        });
      }

      // Lấy giá dịch vụ để tính số tiền thanh toán
      const serviceResult = await query(
        "SELECT TenSP, GiaSP FROM SanPham WHERE MaSP = @MaSP",
        { MaSP: parseInt(dichvu) }
      );

      if (!serviceResult.recordset || serviceResult.recordset.length === 0) {
        req.flash("error", "Dịch vụ không tồn tại.");
        const services = await query("SELECT * FROM SanPham");
        const employees = await query("SELECT * FROM NhanVien");
        return res.render("khachhang/datlich", {
          services: { recordset: services.recordset || [] },
          employees: { recordset: employees.recordset || [] },
          success: [],
          error: req.flash("error"),
          user: req.session.user,
          csrfToken: "",
          formData: req.body,
          bookingDetails: {},
        });
      }

      const { TenSP, GiaSP } = serviceResult.recordset[0];
      const totalAmount = GiaSP;
      const paymentAmount =
        paymentType === "deposit10" ? totalAmount * 0.1 : totalAmount;

      // Chuyển đổi thoigian (HH:mm) thành đối tượng Date
      const [hours, minutes] = thoigian.split(":");
      const timeDate = new Date();
      timeDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Kiểm tra giờ đã đặt
      const request = new sql.Request();
      request.input("MaNV", sql.Int, parseInt(nhanvien));
      request.input("NgayHen", sql.Date, ngayhen);
      request.input("GioHen", sql.Time, timeDate);
      const existingBooking = await request.query(
        `SELECT 1 FROM LichHen
        WHERE MaNV = @MaNV 
        AND NgayHen = @NgayHen 
        AND GioHen = @GioHen 
        AND TrangThaiLH != N'Đã hủy'`
      );

      if (existingBooking.recordset.length > 0) {
        req.flash("error", "Giờ này đã được đặt. Vui lòng chọn giờ khác.");
        const services = await query("SELECT * FROM SanPham");
        const employees = await query("SELECT * FROM NhanVien");
        return res.render("khachhang/datlich", {
          services: { recordset: services.recordset || [] },
          employees: { recordset: employees.recordset || [] },
          success: [],
          error: req.flash("error"),
          user: req.session.user,
          csrfToken: "",
          formData: req.body,
          bookingDetails: {},
        });
      }

      // Lấy tên nhân viên
      const employeeResult = await query(
        "SELECT HoTenNV FROM NhanVien WHERE MaNV = @MaNV",
        { MaNV: parseInt(nhanvien) }
      );

      console.log("employeeResult:", employeeResult);
      console.log("serviceResult:", serviceResult);

      const hoTenNV =
        employeeResult.recordset && employeeResult.recordset[0]?.HoTenNV
          ? employeeResult.recordset[0].HoTenNV
          : "Không xác định";
      const tenSP =
        serviceResult.recordset && serviceResult.recordset[0]?.TenSP
          ? serviceResult.recordset[0].TenSP
          : "Không xác định";

      // Tạo token xác nhận
      const confirmationToken = uuidv4();

      // Lưu lịch hẹn với thông tin thanh toán
      await query(
        `INSERT INTO LichHen (
          MaKH, MaNV, MaSP, NgayHen, GioHen,
          TrangThaiLH, GhiChuLH, HinhAnhLH, ConfirmationToken,
          HinhThucThanhToan, PhuongThucTT, SoTienThanhToan
        ) VALUES (
          @MaKH, @MaNV, @MaSP, @NgayHen, @GioHen,
          @TrangThaiLH, @GhiChuLH, @HinhAnhLH, @ConfirmationToken,
          @HinhThucThanhToan, @PhuongThucTT, @SoTienThanhToan
        )`,
        {
          MaKH: req.session.user.MaKH,
          MaNV: parseInt(nhanvien),
          MaSP: parseInt(dichvu),
          NgayHen: ngayhen,
          GioHen: timeDate,
          TrangThaiLH: "Chờ xác nhận",
          GhiChuLH: ghichu || null,
          HinhAnhLH: hinhanh,
          ConfirmationToken: confirmationToken,
          HinhThucThanhToan:
            paymentType === "deposit10" ? "Đặt cọc 10%" : "Thanh toán 100%",
          PhuongThucTT:
            paymentMethod === "bank"
              ? "Chuyển khoản ngân hàng"
              : "Ví điện tử (Momo)",
          SoTienThanhToan: paymentAmount,
        }
      );

      // Chuẩn bị chi tiết lịch hẹn
      const bookingDetails = {
        ngayhen,
        thoigian,
        nhanvien: hoTenNV,
        dichvu: tenSP,
        ghichu: ghichu || "Không có ghi chú",
        hinhanh: hinhanh || null,
        paymentType:
          paymentType === "deposit10" ? "Đặt cọc 10%" : "Thanh toán 100%",
        paymentMethod:
          paymentMethod === "bank"
            ? "Chuyển khoản ngân hàng"
            : "Ví điện tử (Momo)",
        paymentAmount,
        totalAmount,
      };

      // Gửi email xác nhận
      const confirmationLink = `http://${req.headers.host}/confirm-booking?token=${confirmationToken}`;
      const mailOptions = {
        from: emailConfig.user,
        to: req.session.user.EmailKH,
        subject: "Xác nhận lịch hẹn tại Tiệm Nail Diamond",
        html: `
          <p>Xin chào ${req.session.user.HoTenKH},</p>
          <p>Bạn đã đặt lịch hẹn thành công với các chi tiết sau:</p>
          <ul>
            <li><strong>Ngày hẹn:</strong> ${new Date(
              ngayhen
            ).toLocaleDateString("vi-VN")}</li>
            <li><strong>Giờ hẹn:</strong> ${thoigian}</li>
            <li><strong>Nhân viên:</strong> ${hoTenNV}</li>
            <li><strong>Dịch vụ:</strong> ${tenSP}</li>
            <li><strong>Ghi chú:</strong> ${ghichu || "Không có ghi chú"}</li>
            ${
              hinhanh
                ? `<li><strong>Hình ảnh:</strong> <img src="http://${req.headers.host}${hinhanh}" alt="Hình ảnh lịch hẹn" style="max-width: 200px;"></li>`
                : ""
            }
            <li><strong>Hình thức thanh toán:</strong> ${
              paymentType === "deposit10" ? "Đặt cọc 10%" : "Thanh toán 100%"
            }</li>
            <li><strong>Phương thức thanh toán:</strong> ${
              paymentMethod === "bank"
                ? "Chuyển khoản ngân hàng"
                : "Ví điện tử (Momo)"
            }</li>
            <li><strong>Số tiền thanh toán:</strong> ${paymentAmount.toLocaleString(
              "vi-VN"
            )} VND</li>
            <li><strong>Tổng tiền:</strong> ${totalAmount.toLocaleString(
              "vi-VN"
            )} VND</li>
          </ul>
          <p>Vui lòng xác nhận lịch hẹn bằng cách nhấn vào liên kết sau: <a href="${confirmationLink}">Xác nhận lịch hẹn</a></p>
          <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
          <p>Trân trọng,</p>
          <p>Tiệm Nail Diamond</p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(
          "✅ Email xác nhận đã được gửi đến:",
          req.session.user.EmailKH
        );
      } catch (emailError) {
        console.error("❌ Lỗi khi gửi email xác nhận:", emailError);
        req.flash(
          "error",
          "Lịch hẹn đã được đặt nhưng không thể gửi email xác nhận."
        );
      }

      // Render lại với thông báo thành công và chi tiết lịch hẹn
      const services = await query("SELECT * FROM SanPham");
      const employees = await query("SELECT * FROM NhanVien");
      req.flash(
        "success",
        "Đặt lịch thành công! Vui lòng kiểm tra email để xác nhận lịch hẹn bạn đã đặt."
      );
      res.render("khachhang/datlich", {
        services: { recordset: services.recordset || [] },
        employees: { recordset: employees.recordset || [] },
        success: req.flash("success"),
        error: [],
        user: req.session.user,
        csrfToken: "",
        formData: {},
        bookingDetails,
      });
    } catch (err) {
      console.error("Lỗi khi xử lý đặt lịch:", err);
      req.flash("error", `Không thể đặt lịch: ${err.message}`);
      const services = await query("SELECT * FROM SanPham");
      const employees = await query("SELECT * FROM NhanVien");
      res.render("khachhang/datlich", {
        services: { recordset: services.recordset || [] },
        employees: { recordset: employees.recordset || [] },
        success: [],
        error: req.flash("error"),
        user: req.session.user,
        csrfToken: "",
        formData: req.body,
        bookingDetails: {},
      });
    }
  }
);

// Route để lấy danh sách giờ đã đặt theo ngày
router.get("/get-booked-times", async (req, res) => {
  const { date, maNV } = req.query;
  console.log("Nhận yêu cầu /get-booked-times:", { date, maNV });

  if (!date || !maNV) {
    console.error("Thiếu date hoặc maNV");
    return res
      .status(400)
      .json({ error: "Vui lòng cung cấp ngày và nhân viên!" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error("Định dạng ngày không hợp lệ:", date);
    return res
      .status(400)
      .json({ error: "Định dạng ngày phải là YYYY-MM-DD!" });
  }
  const maNVInt = parseInt(maNV);
  if (isNaN(maNVInt)) {
    console.error("Định dạng maNV không hợp lệ:", maNV);
    return res.status(400).json({ error: "Mã nhân viên phải là số!" });
  }

  try {
    const request = new sql.Request();
    request.input("date", sql.Date, date);
    request.input("maNV", sql.Int, maNVInt);
    console.log("Thực hiện truy vấn:", { date, maNV: maNVInt });

    const result = await request.query(
      `SELECT GioHen
       FROM LichHen
       WHERE NgayHen = @date 
       AND MaNV = @maNV 
       AND GioHen IS NOT NULL 
       AND TrangThaiLH != N'Đã hủy'`
    );

    const bookedTimes = result.recordset
      .map((record) => {
        // Chuyển đổi TIME thành HH:mm
        const time = new Date(record.GioHen);
        return `${String(time.getUTCHours()).padStart(2, "0")}:${String(
          time.getUTCMinutes()
        ).padStart(2, "0")}`;
      })
      .filter((time) => time && /^\d{2}:\d{2}$/.test(time));

    console.log("Giờ đã đặt:", bookedTimes);
    res.json({ bookedTimes });
  } catch (err) {
    console.error("Lỗi khi truy vấn giờ đã đặt:", err);
    res
      .status(500)
      .json({ error: `Không thể lấy danh sách giờ đã đặt: ${err.message}` });
  }
});

// Route lấy danh sách ngày trống
router.get("/get-available-dates", async (req, res) => {
  const { maNV } = req.query;
  if (!maNV) {
    return res.status(400).json({ error: "Vui lòng cung cấp nhân viên!" });
  }

  try {
    const allTimes = [
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ];
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 30);

    const request = new sql.Request();
    request.input("maNV", sql.Int, parseInt(maNV));
    request.input("startDate", sql.Date, startDate.toISOString().split("T")[0]);
    request.input("endDate", sql.Date, endDate.toISOString().split("T")[0]);
    const result = await request.query(
      `SELECT NgayHen, FORMAT(GioHen, 'HH:mm') AS GioHen
       FROM LichHen
       WHERE MaNV = @maNV 
       AND NgayHen BETWEEN @startDate AND @endDate
       AND TrangThaiLH != N'Đã hủy'`
    );

    const bookedDates = {};
    result.recordset.forEach((record) => {
      const dateStr = record.NgayHen.toISOString().split("T")[0];
      if (!bookedDates[dateStr]) {
        bookedDates[dateStr] = [];
      }
      bookedDates[dateStr].push(record.GioHen);
    });

    let availableDates = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      const bookedTimes = bookedDates[dateStr] || [];
      const availableTimes = allTimes.filter(
        (time) => !bookedTimes.includes(time)
      );
      if (availableTimes.length > 0) {
        availableDates.push(dateStr);
      }
    }

    console.log("Available dates for MaNV:", maNV, availableDates);
    res.json({ availableDates });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách ngày trống:", err);
    res.status(500).json({ error: "Không thể lấy danh sách ngày trống." });
  }
});

//Route xác nhận qua email
router.get("/confirm-booking", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    req.flash("error", "Mã xác nhận không hợp lệ.");
    return res.redirect("/trangchu");
  }

  try {
    const request = new sql.Request();
    request.input("ConfirmationToken", sql.NVarChar, token);
    const result = await request.query(
      `UPDATE LichHen
       SET TrangThaiLH = N'Đã xác nhận'
       WHERE ConfirmationToken = @ConfirmationToken
       SELECT @@ROWCOUNT AS rowsAffected`
    );

    if (result.recordset[0].rowsAffected === 0) {
      req.flash("error", "Mã xác nhận không tồn tại hoặc đã được sử dụng.");
      return res.redirect("/trangchu");
    }

    req.flash("success", "Lịch hẹn đã được xác nhận thành công!");
    res.redirect("/trangchu");
  } catch (err) {
    console.error("Lỗi khi xác nhận lịch hẹn:", err);
    req.flash("error", "Không thể xác nhận lịch hẹn.");
    res.redirect("/trangchu");
  }
});

// Route quên mật khẩu
router.get("/quenmatkhau", (req, res) => {
  res.render("quenmatkhau", {
    message: {
      type: req.flash("error")
        ? "danger"
        : req.flash("success")
        ? "success"
        : "",
      text: req.flash("error") || req.flash("success") || "",
    },
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/quenmatkhau", async (req, res) => {
  const { email, _csrf } = req.body;

  if (!email) {
    req.flash("error", "Vui lòng nhập email!");
    return res.redirect("/quenmatkhau");
  }

  try {
    const result = await query(
      "SELECT EmailKH FROM KhachHang WHERE EmailKH = @email",
      { email }
    );
    if (result.length === 0) {
      req.flash("error", "Email không tồn tại!");
      return res.redirect("/quenmatkhau");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = { code, expires: Date.now() + 5 * 60 * 1000 };

    const mailOptions = {
      from: emailConfig.user,
      to: email,
      subject: "Mã xác nhận khôi phục mật khẩu",
      text: `Xin chào, mã xác nhận của bạn là: ${code}. Mã này có hiệu lực trong 5 phút.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email mã xác nhận đã được gửi đến:", email);
    req.flash("success", "Mã xác nhận đã được gửi đến email của bạn.");
    res.render("verify", {
      email,
      message: req.flash("success"),
      action: "reset",
      csrfToken: res.locals.csrfToken,
    });
  } catch (error) {
    console.error("❌ Error sending reset code:", error);
    req.flash("error", "Có lỗi xảy ra khi gửi mã xác nhận.");
    res.redirect("/quenmatkhau");
  }
});

// Route đổi mật khẩu
router.get("/doimatkhau", (req, res) => {
  if (!req.session.resetEmail) {
    req.flash("error", "Vui lòng xác thực mã trước khi đổi mật khẩu!");
    return res.redirect("/quenmatkhau");
  }
  res.render("doimatkhau", {
    email: req.session.resetEmail,
    message: {
      type: req.flash("error")
        ? "danger"
        : req.flash("success")
        ? "success"
        : "",
      text: req.flash("error") || req.flash("success") || "",
    },
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/doimatkhau", async (req, res) => {
  const { email, newPassword, _csrf } = req.body;

  if (!email || !newPassword || email !== req.session.resetEmail) {
    req.flash("error", "Thông tin không hợp lệ!");
    return res.redirect("/doimatkhau");
  }

  try {
    await query(
      "UPDATE TaiKhoan SET MatKhau = @password WHERE TenTK = @email",
      { password: await bcrypt.hash(newPassword, 10), email }
    );

    delete req.session.resetEmail;
    req.flash("success", "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
    res.redirect("/dangnhap");
  } catch (error) {
    console.error("Error updating password:", error);
    req.flash("error", "Có lỗi xảy ra khi đổi mật khẩu.");
    res.redirect("/doimatkhau");
  }
});

// Route cho trang giới thiệu
router.get("/gioithieu", async (req, res) => {
  const successMsg = req.flash("success") || [];
  const errorMsg = req.flash("error") || [];
  let message = null;

  if (successMsg.length > 0) {
    message = { type: "success", text: successMsg.join(", ") };
  } else if (errorMsg.length > 0) {
    message = { type: "danger", text: errorMsg.join(", ") };
  }

  try {
    // Sử dụng fsPromises để đọc danh sách file
    const roomDir = path.join(__dirname, "..", "uploads", "room");
    console.log("Checking directory:", roomDir); // Debug đường dẫn
    const roomImages = await fsPromises.readdir(roomDir);
    const imageFiles = roomImages.filter((file) =>
      /\.(jpg|jpeg|png)$/i.test(file)
    );
    console.log("Room images found:", imageFiles); // Debug danh sách file

    res.render("khachhang/gioithieu", {
      user: req.session.user || null,
      message: message,
      roomImages: imageFiles,
    });
  } catch (error) {
    console.error("Error reading room images:", error.message);
    res.render("khachhang/gioithieu", {
      user: req.session.user || null,
      message: message,
      roomImages: [],
    });
  }
});

// Route cho trang Dịch Vụ
router.get("/dichvu", async (req, res) => {
  try {
    console.log("Đang xử lý route /dichvu...");
    const result = await query("SELECT * FROM SanPham");
    const products = result.recordset;

    res.render("khachhang/dichvu", {
      // Thay "dichvu" bằng "khachhang/dichvu"
      products: products,
      message: req.flash("message") || { type: "", text: "" },
      user: req.session.user || null,
    });
  } catch (err) {
    console.error("Lỗi truy vấn dịch vụ:", err);
    req.flash("message", {
      type: "danger",
      text: "Có lỗi xảy ra. Vui lòng thử lại.",
    });
    res.render("khachhang/dichvu", {
      // Thay "dichvu" bằng "khachhang/dichvu"
      products: [],
      message: req.flash("message"),
      user: req.session.user || null,
    });
  }
});

// Route cho trang học viện
router.get("/hocvien", async (req, res) => {
  try {
    res.render("khachhang/hocvien", {
      user: req.session.user || null,
      message: req.flash("message") || { type: "", text: "" },
    });
  } catch (err) {
    console.error("Lỗi render hocvien:", err);
    req.flash("message", {
      type: "danger",
      text: "Có lỗi xảy ra. Vui lòng thử lại.",
    });
    res.render("khachhang/hocvien", {
      user: req.session.user || null,
      message: req.flash("message"),
    });
  }
});

// Route cho trang tin tức
router.get("/tintuc", async (req, res) => {
  try {
    const postsPerPage = 6; // Số bài viết mỗi trang
    const currentPage = parseInt(req.query.page) || 1; // Trang hiện tại từ query string
    const offset = (currentPage - 1) * postsPerPage; // Vị trí bắt đầu

    // Đếm tổng số bài viết
    const countResult = await query(`
      SELECT COUNT(*) AS total
      FROM BaiViet bv
      JOIN SanPham sp ON bv.MaSP = sp.MaSP
    `);
    const totalPosts = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalPosts / postsPerPage);

    // Lấy bài viết cho trang hiện tại
    const postsResult = await query(
      `
      SELECT bv.*, sp.TenSP 
      FROM BaiViet bv 
      JOIN SanPham sp ON bv.MaSP = sp.MaSP
      ORDER BY bv.MaBV DESC
      OFFSET @offset ROWS FETCH NEXT @postsPerPage ROWS ONLY
    `,
      { offset, postsPerPage }
    );
    const posts = postsResult.recordset || [];

    console.log("Posts result:", postsResult); // Debug dữ liệu trả về
    console.log("Pagination:", { currentPage, totalPages, totalPosts }); // Debug phân trang

    const successMsg = req.flash("success") || [];
    const errorMsg = req.flash("error") || [];
    let message = null;

    if (successMsg.length > 0) {
      message = { type: "success", text: successMsg.join(", ") };
    } else if (errorMsg.length > 0) {
      message = { type: "danger", text: errorMsg.join(", ") };
    }

    res.render("khachhang/tintuc", {
      posts: posts,
      user: req.session.user || null,
      message: message,
      currentPage: currentPage,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi khi tải trang tin tức:", err);
    req.flash("error", "Không thể tải trang tin tức.");
    res.render("khachhang/tintuc", {
      posts: [],
      user: req.session.user || null,
      message: { type: "danger", text: "Không thể tải trang tin tức." },
      currentPage: 1,
      totalPages: 0,
    });
  }
});

// Route cho trang chi tiết tin tức
router.get("/tintuc/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      req.flash("error", "ID tin tức không hợp lệ.");
      return res.redirect("/tintuc");
    }

    // Thực hiện truy vấn SQL
    const result = await query(
      `
      SELECT bv.*, sp.TenSP 
      FROM BaiViet bv 
      LEFT JOIN SanPham sp ON bv.MaSP = sp.MaSP 
      WHERE bv.MaBV = @id
      `,
      { id }
    );

    // Kiểm tra kết quả truy vấn
    console.log("Kết quả truy vấn:", result);

    // Với mssql, dữ liệu nằm trong result.recordset
    const post =
      result.recordset && result.recordset.length > 0
        ? result.recordset[0]
        : null;

    if (!post) {
      req.flash("error", "Tin tức không tồn tại.");
      return res.redirect("/tintuc");
    }

    // Log dữ liệu post để kiểm tra
    console.log("Dữ liệu post:", post);

    // Xử lý flash messages
    const successMsg = req.flash("success") || [];
    const errorMsg = req.flash("error") || [];
    let message = null;

    if (successMsg.length > 0) {
      message = { type: "success", text: successMsg.join(", ") };
    } else if (errorMsg.length > 0) {
      message = { type: "danger", text: errorMsg.join(", ") };
    }

    // Render template với dữ liệu đã kiểm tra
    res.render("khachhang/tintuc_chi_tiet", {
      post: post,
      user: req.session.user || null,
      message: message,
    });
  } catch (err) {
    console.error("Lỗi khi tải trang chi tiết tin tức:", err);
    req.flash("error", "Không thể tải tin tức.");
    res.redirect("/tintuc");
  }
});

// GET /album route
router.get("/album", async (req, res) => {
  try {
    // Đường dẫn tới các thư mục ảnh
    const nailDir = path.join(__dirname, "../uploads/nail");
    const miDir = path.join(__dirname, "../uploads/mi");

    // Đọc danh sách tệp ảnh từ thư mục nail
    let nailFiles;
    try {
      nailFiles = await fsPromises.readdir(nailDir);
    } catch (err) {
      if (err.code === "ENOENT") {
        nailFiles = [];
      } else {
        throw err;
      }
    }
    const nailImages = nailFiles.filter((file) =>
      /\.(jpg|jpeg|png|gif)$/i.test(file)
    ); // Lọc chỉ các tệp ảnh

    // Đọc danh sách tệp ảnh từ thư mục mi
    let miFiles;
    try {
      miFiles = await fsPromises.readdir(miDir);
    } catch (err) {
      if (err.code === "ENOENT") {
        miFiles = [];
      } else {
        throw err;
      }
    }
    const eyelashImages = miFiles.filter((file) =>
      /\.(jpg|jpeg|png|gif)$/i.test(file)
    ); // Lọc chỉ các tệp ảnh

    // Logic phân trang cho Nail Gallery
    const imagesPerPage = 20; // 20 ảnh mỗi trang
    const nailTotalImages = nailImages.length;
    const nailTotalPages = Math.ceil(nailTotalImages / imagesPerPage);
    const nailCurrentPage = parseInt(req.query.nailPage) || 1;
    const nailStartIndex = (nailCurrentPage - 1) * imagesPerPage;
    const nailEndIndex = Math.min(
      nailStartIndex + imagesPerPage,
      nailTotalImages
    ); // Đảm bảo không vượt quá số ảnh
    const nailImagesPaginated = nailImages.slice(nailStartIndex, nailEndIndex);

    // Logic phân trang cho Eyelash Gallery
    const eyelashTotalImages = eyelashImages.length;
    const eyelashTotalPages = Math.ceil(eyelashTotalImages / imagesPerPage);
    const eyelashCurrentPage = parseInt(req.query.eyelashPage) || 1;
    const eyelashStartIndex = (eyelashCurrentPage - 1) * imagesPerPage;
    const eyelashEndIndex = Math.min(
      eyelashStartIndex + imagesPerPage,
      eyelashTotalImages
    ); // Đảm bảo không vượt quá số ảnh
    const eyelashImagesPaginated = eyelashImages.slice(
      eyelashStartIndex,
      eyelashEndIndex
    );

    // Render template với biến phân trang và user
    res.render("khachhang/album", {
      nailImages: nailImagesPaginated,
      nailCurrentPage: nailCurrentPage,
      nailTotalPages: nailTotalPages,
      eyelashImages: eyelashImagesPaginated,
      eyelashCurrentPage: eyelashCurrentPage,
      eyelashTotalPages: eyelashTotalPages,
      message: req.session.message || null,
      user: req.session.user || null, // Thêm biến user
    });

    // Xóa thông báo nếu có
    if (req.session.message) {
      delete req.session.message;
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu album:", error);
    if (error.code === "ENOENT") {
      // Xử lý trường hợp thư mục không tồn tại
      res.render("khachhang/album", {
        nailImages: [],
        nailCurrentPage: 1,
        nailTotalPages: 0,
        eyelashImages: [],
        eyelashCurrentPage: 1,
        eyelashTotalPages: 0,
        message: { text: "Thư mục ảnh không tồn tại.", type: "danger" },
        user: req.session.user || null, // Thêm biến user trong trường hợp lỗi
      });
    } else {
      res.status(500).send("Lỗi máy chủ nội bộ");
    }
  }
});

// Route cho trang liên hệ
router.get("/lienhe", (req, res) => {
  const successMsg = req.flash("success") || [];
  const errorMsg = req.flash("error") || [];
  let message = null;

  if (successMsg.length > 0) {
    message = { type: "success", text: successMsg.join(", ") };
  } else if (errorMsg.length > 0) {
    message = { type: "danger", text: errorMsg.join(", ") };
  }

  res.render("khachhang/lienhe", {
    user: req.session.user || null,
    message: message,
  });
});

router.post("/lienhe", async (req, res) => {
  const {
    "your-name": name,
    "your-phone": phone,
    "your-email": email,
    message,
  } = req.body;

  // Kiểm tra dữ liệu
  if (!name || !phone || !email || !message) {
    req.flash("error", "Vui lòng điền đầy đủ thông tin.");
    return res.redirect("/lienhe");
  }

  try {
    // Lưu vào database (giả sử có bảng ContactMessages)
    await query(
      "INSERT INTO ContactMessages (HoTen, SoDienThoai, Email, NoiDung, NgayGui) VALUES (@name, @phone, @email, @message, @ngayGui)",
      { name, phone, email, message, ngayGui: new Date() }
    );

    // Gửi email thông báo (tùy chọn)
    const mailOptions = {
      from: emailConfig.user,
      to: emailConfig.user, // Gửi đến email của tiệm
      subject: "Tin nhắn liên hệ mới",
      html: `
        <p><strong>Tên:</strong> ${name}</p>
        <p><strong>Số điện thoại:</strong> ${phone}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Nội dung:</strong> ${message}</p>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log("✅ Email liên hệ đã được gửi.");

    req.flash("success", "Tin nhắn của bạn đã được gửi!");
    res.redirect("/lienhe");
  } catch (error) {
    console.error("Lỗi khi xử lý form liên hệ:", error);
    req.flash("error", "Có lỗi xảy ra khi gửi tin nhắn.");
    res.redirect("/lienhe");
  }
});

// Route cho trang lịch sử lịch hẹn
router.get("/lichsu-lichhen", requireLogin, async (req, res) => {
  try {
    const maKH = req.session.user.MaKH;
    if (!maKH) {
      req.flash("error", "Thông tin khách hàng không hợp lệ.");
      return res.redirect("/dangnhap");
    }

    // Phân trang
    const appointmentsPerPage = 10;
    const currentPage = parseInt(req.query.page) || 1;
    const offset = (currentPage - 1) * appointmentsPerPage;

    // Đếm tổng số lịch hẹn
    const countResult = await query(
      "SELECT COUNT(*) AS total FROM LichHen WHERE MaKH = @MaKH",
      { MaKH: maKH }
    );
    const totalAppointments = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalAppointments / appointmentsPerPage);

    // Truy vấn danh sách lịch hẹn với phân trang, thêm MaCTHD và kiểm tra HasDanhGia
    const result = await query(
      `
      SELECT lh.*, 
             sp.TenSP, 
             nv.HoTenNV, 
             cthd.MaCTHD,
             CASE WHEN EXISTS (
               SELECT 1 FROM DanhGia dg WHERE dg.MaCTHD = cthd.MaCTHD
             ) THEN 1 ELSE 0 END AS HasDanhGia
      FROM LichHen lh
      LEFT JOIN SanPham sp ON lh.MaSP = sp.MaSP
      LEFT JOIN NhanVien nv ON lh.MaNV = nv.MaNV
      LEFT JOIN HoaDon hd ON lh.MaLH = hd.MaLH
      LEFT JOIN ChiTietHoaDon cthd ON hd.MaHD = cthd.MaHD
      WHERE lh.MaKH = @MaKH
      ORDER BY lh.NgayHen DESC, lh.GioHen DESC
      OFFSET @offset ROWS FETCH NEXT @appointmentsPerPage ROWS ONLY
      `,
      { MaKH: maKH, offset, appointmentsPerPage }
    );

    const appointments = result.recordset || [];

    // Xử lý flash messages
    const successMsg = req.flash("success") || [];
    const errorMsg = req.flash("error") || [];
    let message = null;

    if (successMsg.length > 0) {
      message = { type: "success", text: successMsg.join(", ") };
    } else if (errorMsg.length > 0) {
      message = { type: "danger", text: errorMsg.join(", ") };
    }

    // Render template lịch sử lịch hẹn
    res.render("khachhang/lichsu_lichhen", {
      appointments: appointments,
      user: req.session.user || null,
      message: message,
      currentPage: currentPage,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi khi tải lịch sử lịch hẹn:", err);
    req.flash("error", "Không thể tải lịch sử lịch hẹn.");
    res.redirect("/trangchu");
  }
});

// Route hủy lịch hẹn
router.get("/huy-lichhen", requireLogin, async (req, res) => {
  try {
    const { maLH } = req.query;
    const maKH = req.session.user.MaKH;

    if (!maLH || isNaN(parseInt(maLH))) {
      req.flash("error", "Mã lịch hẹn không hợp lệ.");
      return res.redirect("/lichsu-lichhen");
    }

    // Truy vấn lịch hẹn
    const result = await query(
      `
      SELECT MaKH, NgayHen, GioHen, TrangThaiLH, HinhAnhLH, 
             sp.TenSP, nv.HoTenNV
      FROM LichHen lh
      LEFT JOIN SanPham sp ON lh.MaSP = sp.MaSP
      LEFT JOIN NhanVien nv ON lh.MaNV = nv.MaNV
      WHERE MaLH = @MaLH
      `,
      { MaLH: parseInt(maLH) }
    );

    if (!result.recordset || result.recordset.length === 0) {
      req.flash("error", "Lịch hẹn không tồn tại.");
      return res.redirect("/lichsu-lichhen");
    }

    const appointment = result.recordset[0];

    // Kiểm tra quyền sở hữu
    if (appointment.MaKH !== maKH) {
      req.flash("error", "Bạn không có quyền hủy lịch hẹn này.");
      return res.redirect("/lichsu-lichhen");
    }

    // Kiểm tra trạng thái
    if (!["Chờ xác nhận", "Đã xác nhận"].includes(appointment.TrangThaiLH)) {
      req.flash("error", "Lịch hẹn này không thể hủy.");
      return res.redirect("/lichsu-lichhen");
    }

    // Kiểm tra thời gian (trước 24 giờ)
    const appointmentDateTime = new Date(appointment.NgayHen);
    if (appointment.GioHen) {
      const time = new Date(appointment.GioHen);
      appointmentDateTime.setUTCHours(time.getUTCHours(), time.getUTCMinutes());
    }
    const currentDateTime = new Date();
    const timeDiff = (appointmentDateTime - currentDateTime) / (1000 * 60 * 60); // Chênh lệch giờ

    if (timeDiff < 24) {
      req.flash(
        "error",
        "Không thể hủy lịch hẹn trong vòng 24 giờ trước giờ hẹn."
      );
      return res.redirect("/lichsu-lichhen");
    }

    // Cập nhật trạng thái lịch hẹn
    await query(
      "UPDATE LichHen SET TrangThaiLH = N'Đã hủy' WHERE MaLH = @MaLH",
      { MaLH: parseInt(maLH) }
    );

    // Xóa hình ảnh nếu có
    if (appointment.HinhAnhLH) {
      const imagePath = path.join(__dirname, "..", appointment.HinhAnhLH);
      try {
        await fsPromises.unlink(imagePath);
        console.log("Đã xóa hình ảnh:", imagePath);
      } catch (err) {
        console.error("Lỗi khi xóa hình ảnh:", err);
      }
    }

    // Gửi email thông báo hủy (tùy chọn)
    const mailOptions = {
      from: emailConfig.user,
      to: req.session.user.EmailKH,
      subject: "Thông báo hủy lịch hẹn tại Tiệm Nail Diamond",
      html: `
        <p>Xin chào ${req.session.user.HoTenKH},</p>
        <p>Lịch hẹn của bạn đã được hủy thành công với các chi tiết sau:</p>
        <ul>
          <li><strong>Ngày hẹn:</strong> ${new Date(
            appointment.NgayHen
          ).toLocaleDateString("vi-VN")}</li>
          <li><strong>Giờ hẹn:</strong> ${
            appointment.GioHen
              ? new Date(appointment.GioHen).toISOString().slice(11, 16)
              : "Không xác định"
          }</li>
          <li><strong>Dịch vụ:</strong> ${
            appointment.TenSP || "Không xác định"
          }</li>
          <li><strong>Nhân viên:</strong> ${
            appointment.HoTenNV || "Không xác định"
          }</li>
        </ul>
        <p>Nếu bạn có thắc mắc, vui lòng liên hệ qua email hoặc số điện thoại 0784265668.</p>
        <p>Trân trọng,</p>
        <p>Tiệm Nail Diamond</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(
        "✅ Email thông báo hủy đã được gửi đến:",
        req.session.user.EmailKH
      );
    } catch (emailError) {
      console.error("❌ Lỗi khi gửi email thông báo hủy:", emailError);
    }

    req.flash("success", "Lịch hẹn đã được hủy thành công!");
    res.redirect("/lichsu-lichhen");
  } catch (err) {
    console.error("Lỗi khi hủy lịch hẹn:", err);
    req.flash("error", "Không thể hủy lịch hẹn.");
    res.redirect("/lichsu-lichhen");
  }
});

// Route hiển thị trang thông tin tài khoản
router.get("/taikhoan", requireLogin, async (req, res) => {
  try {
    const maKH = req.session.user.MaKH;
    if (!maKH) {
      req.flash("error", "Thông tin khách hàng không hợp lệ.");
      return res.redirect("/dangnhap");
    }

    // Lấy thông tin khách hàng
    const result = await query(
      "SELECT HoTenKH, EmailKH, SoDienThoaiKH FROM KhachHang WHERE MaKH = @MaKH",
      { MaKH: maKH }
    );

    if (!result.recordset || result.recordset.length === 0) {
      req.flash("error", "Không tìm thấy thông tin khách hàng.");
      return res.redirect("/trangchu");
    }

    const userInfo = result.recordset[0];

    // Xử lý flash messages
    const successMsg = req.flash("success") || [];
    const errorMsg = req.flash("error") || [];
    let message = null;

    if (successMsg.length > 0) {
      message = { type: "success", text: successMsg.join(", ") };
    } else if (errorMsg.length > 0) {
      message = { type: "danger", text: errorMsg.join(", ") };
    }

    // Render trang thông tin tài khoản
    res.render("khachhang/taikhoan", {
      userInfo: userInfo,
      user: req.session.user,
      message: message,
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi khi tải trang thông tin tài khoản:", err);
    req.flash("error", "Không thể tải trang thông tin tài khoản.");
    res.redirect("/trangchu");
  }
});

// Route xử lý cập nhật thông tin tài khoản
router.post("/taikhoan", requireLogin, async (req, res) => {
  try {
    const { fullname, phone, _csrf } = req.body;
    const maKH = req.session.user.MaKH;

    if (!fullname || !phone) {
      req.flash("error", "Vui lòng điền đầy đủ họ tên và số điện thoại.");
      return res.redirect("/taikhoan");
    }

    // Kiểm tra định dạng số điện thoại
    if (!/^\d{10}$/.test(phone)) {
      req.flash("error", "Số điện thoại phải có đúng 10 chữ số.");
      return res.redirect("/taikhoan");
    }

    // Cập nhật thông tin khách hàng
    await query(
      "UPDATE KhachHang SET HoTenKH = @HoTenKH, SoDienThoaiKH = @SoDienThoaiKH WHERE MaKH = @MaKH",
      {
        HoTenKH: fullname,
        SoDienThoaiKH: phone,
        MaKH: maKH,
      }
    );

    // Cập nhật session
    req.session.user.HoTenKH = fullname;
    req.session.user.SoDienThoaiKH = phone;

    // Gửi email thông báo (tùy chọn)
    const mailOptions = {
      from: emailConfig.user,
      to: req.session.user.EmailKH,
      subject: "Thông báo cập nhật thông tin tài khoản",
      html: `
        <p>Xin chào ${fullname},</p>
        <p>Thông tin tài khoản của bạn tại Tiệm Nail Diamond đã được cập nhật thành công:</p>
        <ul>
          <li><strong>Họ và tên:</strong> ${fullname}</li>
          <li><strong>Số điện thoại:</strong> ${phone}</li>
        </ul>
        <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ qua email hoặc số điện thoại 0784265668.</p>
        <p>Trân trọng,</p>
        <p>Tiệm Nail Diamond</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(
        "✅ Email thông báo cập nhật đã được gửi đến:",
        req.session.user.EmailKH
      );
    } catch (emailError) {
      console.error("❌ Lỗi khi gửi email thông báo cập nhật:", emailError);
    }

    req.flash("success", "Cập nhật thông tin tài khoản thành công!");
    res.redirect("/taikhoan");
  } catch (err) {
    console.error("Lỗi khi cập nhật thông tin tài khoản:", err);
    req.flash("error", "Không thể cập nhật thông tin tài khoản.");
    res.redirect("/taikhoan");
  }
});

// Route hiển thị form đánh giá
router.get("/danhgia", requireLogin, async (req, res) => {
  try {
    const { maCTHD } = req.query;
    const maKH = req.session.user.MaKH;

    if (!maCTHD || isNaN(parseInt(maCTHD))) {
      req.flash("error", "Mã chi tiết hóa đơn không hợp lệ.");
      return res.redirect("/lichsu-lichhen");
    }

    // Kiểm tra xem chi tiết hóa đơn có tồn tại và thuộc về khách hàng không
    const result = await query(
      `
      SELECT cthd.MaCTHD, lh.MaKH
      FROM ChiTietHoaDon cthd
      JOIN HoaDon hd ON cthd.MaHD = hd.MaHD
      JOIN LichHen lh ON hd.MaLH = lh.MaLH
      WHERE cthd.MaCTHD = @MaCTHD
      `,
      { MaCTHD: parseInt(maCTHD) }
    );

    if (!result.recordset || result.recordset.length === 0) {
      req.flash("error", "Chi tiết hóa đơn không tồn tại.");
      return res.redirect("/lichsu-lichhen");
    }

    if (result.recordset[0].MaKH !== maKH) {
      req.flash("error", "Bạn không có quyền đánh giá dịch vụ này.");
      return res.redirect("/lichsu-lichhen");
    }

    // Kiểm tra xem đã có đánh giá chưa
    const danhGiaResult = await query(
      "SELECT 1 FROM DanhGia WHERE MaCTHD = @MaCTHD",
      { MaCTHD: parseInt(maCTHD) }
    );

    if (danhGiaResult.recordset && danhGiaResult.recordset.length > 0) {
      req.flash("error", "Dịch vụ này đã được đánh giá.");
      return res.redirect("/lichsu-lichhen");
    }

    // Render form đánh giá
    res.render("khachhang/danhgia", {
      maCTHD: parseInt(maCTHD),
      user: req.session.user,
      message: null,
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi khi hiển thị form đánh giá:", err);
    req.flash("error", "Không thể hiển thị form đánh giá.");
    res.redirect("/lichsu-lichhen");
  }
});

// Route xử lý gửi đánh giá
router.post("/danhgia", requireLogin, async (req, res) => {
  try {
    const { maCTHD, maKH, diemDG, binhLuan, chatLuong, thaiDo, _csrf } =
      req.body;

    // Kiểm tra dữ liệu
    if (
      !maCTHD ||
      !maKH ||
      !diemDG ||
      isNaN(parseInt(maCTHD)) ||
      isNaN(parseInt(maKH)) ||
      isNaN(parseInt(diemDG))
    ) {
      req.flash("error", "Dữ liệu không hợp lệ.");
      return res.redirect("/lichsu-lichhen");
    }

    if (parseInt(maKH) !== req.session.user.MaKH) {
      req.flash("error", "Bạn không có quyền đánh giá dịch vụ này.");
      return res.redirect("/lichsu-lichhen");
    }

    if (parseInt(diemDG) < 1 || parseInt(diemDG) > 5) {
      req.flash("error", "Điểm đánh giá phải từ 1 đến 5.");
      return res.redirect(`/danhgia?maCTHD=${maCTHD}`);
    }

    // Kiểm tra chi tiết hóa đơn
    const cthdResult = await query(
      `
      SELECT cthd.MaCTHD, lh.MaKH
      FROM ChiTietHoaDon cthd
      JOIN HoaDon hd ON cthd.MaHD = hd.MaHD
      JOIN LichHen lh ON hd.MaLH = lh.MaLH
      WHERE cthd.MaCTHD = @MaCTHD
      `,
      { MaCTHD: parseInt(maCTHD) }
    );

    if (!cthdResult.recordset || cthdResult.recordset.length === 0) {
      req.flash("error", "Chi tiết hóa đơn không tồn tại.");
      return res.redirect("/lichsu-lichhen");
    }

    if (cthdResult.recordset[0].MaKH !== parseInt(maKH)) {
      req.flash("error", "Bạn không có quyền đánh giá dịch vụ này.");
      return res.redirect("/lichsu-lichhen");
    }

    // Kiểm tra xem đã có đánh giá chưa
    const danhGiaResult = await query(
      "SELECT 1 FROM DanhGia WHERE MaCTHD = @MaCTHD",
      { MaCTHD: parseInt(maCTHD) }
    );

    if (danhGiaResult.recordset && danhGiaResult.recordset.length > 0) {
      req.flash("error", "Dịch vụ này đã được đánh giá.");
      return res.redirect("/lichsu-lichhen");
    }

    // Lưu đánh giá vào bảng DanhGia
    await query(
      `
      INSERT INTO DanhGia (MaKH, MaCTHD, DiemDG, BinhLuan, ChatLuong, ThaiDo, NgayDG)
      VALUES (@MaKH, @MaCTHD, @DiemDG, @BinhLuan, @ChatLuong, @ThaiDo, @NgayDG)
      `,
      {
        MaKH: parseInt(maKH),
        MaCTHD: parseInt(maCTHD),
        DiemDG: parseInt(diemDG),
        BinhLuan: binhLuan || null,
        ChatLuong: chatLuong || null,
        ThaiDo: thaiDo || null,
        NgayDG: new Date(),
      }
    );

    req.flash("success", "Đánh giá của bạn đã được gửi thành công!");
    res.redirect("/lichsu-lichhen");
  } catch (err) {
    console.error("Lỗi khi lưu đánh giá:", err);
    req.flash("error", "Không thể lưu đánh giá.");
    res.redirect(`/danhgia?maCTHD=${req.body.maCTHD}`);
  }
});

module.exports = router;
