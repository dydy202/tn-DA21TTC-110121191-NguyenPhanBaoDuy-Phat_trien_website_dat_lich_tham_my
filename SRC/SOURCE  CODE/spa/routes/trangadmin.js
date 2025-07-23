const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { query } = require("../config/db");
const PDFDocument = require("pdfkit");
const exceljs = require("exceljs");

const isAdmin = (req, res, next) => {
  console.log("Kiểm tra admin, session user:", req.session.user);
  if (!req.session.user) {
    req.flash("error", "Vui lòng đăng nhập!");
    console.log("Chuyển hướng đến /dangnhap vì chưa đăng nhập");
    return res.redirect("/dangnhap");
  }
  if (req.session.user.roleId !== 3) {
    req.flash("error", "Bạn không có quyền truy cập!");
    console.log("Chuyển hướng đến /trangchu vì không phải admin");
    return res.redirect("/trangchu");
  }
  next();
};

// Trang chính
router.get("/", isAdmin, async (req, res, next) => {
  try {
    console.log("Đang xử lý route /admin");
    res.render("admin/admin", {
      user: req.session.user,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi trong route /admin:", err);
    next(err);
  }
});

// Routes cho quyền
// Hiển thị danh sách quyền
router.get("/quyen", isAdmin, async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM Quyen");
    res.render("admin/quyen/quyen", {
      user: req.session.user,
      quyen: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách quyền:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách quyền.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm quyền
router.get("/quyen/add", isAdmin, (req, res) => {
  res.render("admin/quyen/quyen_add", {
    user: req.session.user,
    message: req.flash("error"),
    csrfToken: res.locals.csrfToken,
  });
});

// Xử lý thêm quyền
router.post("/quyen/add", isAdmin, async (req, res) => {
  const { tenQ, moTaQ } = req.body;
  try {
    await query(
      `
      INSERT INTO Quyen (TenQ, MoTaQ)
      VALUES (@tenQ, @moTaQ)
    `,
      { tenQ, moTaQ }
    );
    req.flash("success", "Thêm quyền thành công!");
    res.redirect("/admin/quyen");
  } catch (err) {
    console.error("Lỗi thêm quyền:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm quyền.");
    res.redirect("/admin/quyen/add");
  }
});

// Hiển thị form sửa quyền
router.get("/quyen/edit/:maQ", isAdmin, async (req, res) => {
  const { maQ } = req.params;
  try {
    const result = await query("SELECT * FROM Quyen WHERE MaQ = @maQ", { maQ });
    if (result.recordset.length === 0) {
      req.flash("error", "Quyền không tồn tại!");
      return res.redirect("/admin/quyen");
    }
    res.render("admin/quyen/quyen_edit", {
      user: req.session.user,
      quyen: result.recordset[0],
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin quyền:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin quyền.");
    res.redirect("/admin/quyen");
  }
});

// Xử lý sửa quyền
router.post("/quyen/edit", isAdmin, async (req, res) => {
  const { maQ, tenQ, moTaQ } = req.body;
  try {
    await query(
      `
      UPDATE Quyen
      SET TenQ = @tenQ, MoTaQ = @moTaQ
      WHERE MaQ = @maQ
    `,
      { maQ, tenQ, moTaQ }
    );
    req.flash("success", "Sửa quyền thành công!");
    res.redirect("/admin/quyen");
  } catch (err) {
    console.error("Lỗi sửa quyền:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa quyền.");
    res.redirect(`/admin/quyen/edit/${maQ}`);
  }
});

// Xử lý xóa quyền
router.post("/quyen/delete", isAdmin, async (req, res) => {
  const { maQ } = req.body;
  try {
    await query("DELETE FROM Quyen WHERE MaQ = @maQ", { maQ });
    req.flash("success", "Xóa quyền thành công!");
    res.redirect("/admin/quyen");
  } catch (err) {
    console.error("Lỗi xóa quyền:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa quyền.");
    res.redirect("/admin/quyen");
  }
});

// Routes cho tài khoản
// Hiển thị danh sách tài khoản
// Hiển thị danh sách tài khoản
router.get("/taikhoan", isAdmin, async (req, res) => {
  try {
    // Lấy số trang từ query parameter, mặc định là 1
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Số tài khoản mỗi trang
    const offset = (page - 1) * pageSize;

    // Truy vấn danh sách tài khoản với phân trang và sắp xếp theo ngày tạo
    const result = await query(
      `
      SELECT t.MaTK, t.TenTK, q.TenQ, 
             COALESCE(k.NgayTaoKH, n.NgayTaoNV) as NgayTao
      FROM TaiKhoan t
      INNER JOIN Quyen q ON t.MaQ = q.MaQ
      LEFT JOIN KhachHang k ON t.MaTK = k.MaTK
      LEFT JOIN NhanVien n ON t.MaTK = n.MaTK
      ORDER BY COALESCE(k.NgayTaoKH, n.NgayTaoNV) DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    // Truy vấn tổng số tài khoản để tính tổng số trang
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM TaiKhoan t
      INNER JOIN Quyen q ON t.MaQ = q.MaQ
      LEFT JOIN KhachHang k ON t.MaTK = k.MaTK
      LEFT JOIN NhanVien n ON t.MaTK = n.MaTK
    `);
    const totalAccounts = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalAccounts / pageSize);

    res.render("admin/taikhoan/taikhoan", {
      user: req.session.user,
      taikhoan: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách tài khoản:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách tài khoản.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm tài khoản
router.get("/taikhoan/add", isAdmin, async (req, res) => {
  try {
    const quyen = await query("SELECT * FROM Quyen");
    res.render("admin/taikhoan/taikhoan_add", {
      user: req.session.user,
      quyen: quyen.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách quyền:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách quyền.");
    res.redirect("/admin/taikhoan");
  }
});

// Xử lý thêm tài khoản
router.post("/taikhoan/add", isAdmin, async (req, res) => {
  const { tenTK, matKhau, maQ } = req.body;
  try {
    // Kiểm tra trùng lặp tên tài khoản
    const check = await query("SELECT * FROM TaiKhoan WHERE TenTK = @tenTK", {
      tenTK,
    });
    if (check.recordset.length > 0) {
      req.flash("error", "Tên tài khoản đã tồn tại!");
      return res.redirect("/admin/taikhoan/add");
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(matKhau, 10);

    await query(
      `
      INSERT INTO TaiKhoan (TenTK, MatKhau, MaQ)
      VALUES (@tenTK, @matKhau, @maQ)
    `,
      { tenTK, matKhau: hashedPassword, maQ }
    );

    req.flash("success", "Thêm tài khoản thành công!");
    res.redirect("/admin/taikhoan");
  } catch (err) {
    console.error("Lỗi thêm tài khoản:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm tài khoản.");
    res.redirect("/admin/taikhoan/add");
  }
});

// Hiển thị form sửa tài khoản
router.get("/taikhoan/edit/:maTK", isAdmin, async (req, res) => {
  const { maTK } = req.params;
  try {
    const taikhoan = await query("SELECT * FROM TaiKhoan WHERE MaTK = @maTK", {
      maTK,
    });
    const quyen = await query("SELECT * FROM Quyen");
    if (taikhoan.recordset.length === 0) {
      req.flash("error", "Tài khoản không tồn tại!");
      return res.redirect("/admin/taikhoan");
    }
    res.render("admin/taikhoan/taikhoan_edit", {
      user: req.session.user,
      taikhoan: taikhoan.recordset[0],
      quyen: quyen.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin tài khoản:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin tài khoản.");
    res.redirect("/admin/taikhoan");
  }
});

// Xử lý sửa tài khoản
router.post("/taikhoan/edit", isAdmin, async (req, res) => {
  const { maTK, tenTK, matKhau, maQ } = req.body;
  try {
    // Kiểm tra trùng lặp tên tài khoản (ngoại trừ tài khoản hiện tại)
    const check = await query(
      "SELECT * FROM TaiKhoan WHERE TenTK = @tenTK AND MaTK != @maTK",
      { tenTK, maTK }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Tên tài khoản đã tồn tại!");
      return res.redirect(`/admin/taikhoan/edit/${maTK}`);
    }

    // Nếu không nhập mật khẩu mới, giữ mật khẩu cũ
    let updateQuery = `
      UPDATE TaiKhoan
      SET TenTK = @tenTK, MaQ = @maQ
      WHERE MaTK = @maTK
    `;
    let params = { maTK, tenTK, maQ };

    if (matKhau) {
      const hashedPassword = await bcrypt.hash(matKhau, 10);
      updateQuery = `
        UPDATE TaiKhoan
        SET TenTK = @tenTK, MatKhau = @matKhau, MaQ = @maQ
        WHERE MaTK = @maTK
      `;
      params.matKhau = hashedPassword;
    }

    await query(updateQuery, params);

    req.flash("success", "Sửa tài khoản thành công!");
    res.redirect("/admin/taikhoan");
  } catch (err) {
    console.error("Lỗi sửa tài khoản:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa tài khoản.");
    res.redirect(`/admin/taikhoan/edit/${maTK}`);
  }
});

// Xử lý xóa tài khoản
router.post("/taikhoan/delete", isAdmin, async (req, res) => {
  const { maTK } = req.body;
  try {
    await query("DELETE FROM TaiKhoan WHERE MaTK = @maTK", { maTK });
    req.flash("success", "Xóa tài khoản thành công!");
    res.redirect("/admin/taikhoan");
  } catch (err) {
    console.error("Lỗi xóa tài khoản:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa tài khoản.");
    res.redirect("/admin/taikhoan");
  }
});

// Routes cho khách hàng
// Hiển thị danh sách khách hàng
router.get("/khachhang", isAdmin, async (req, res) => {
  try {
    // Lấy số trang từ query parameter, mặc định là 1
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Số khách hàng mỗi trang
    const offset = (page - 1) * pageSize;

    // Truy vấn danh sách khách hàng với phân trang và sắp xếp theo ngày tạo
    const result = await query(
      `
      SELECT k.MaKH, k.HoTenKH, k.EmailKH, k.SoDienThoaiKH, t.TenTK, k.NgayTaoKH
      FROM KhachHang k
      LEFT JOIN TaiKhoan t ON k.MaTK = t.MaTK
      ORDER BY k.NgayTaoKH DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    // Truy vấn tổng số khách hàng để tính tổng số trang
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM KhachHang k
      LEFT JOIN TaiKhoan t ON k.MaTK = t.MaTK
    `);
    const totalCustomers = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalCustomers / pageSize);

    res.render("admin/khachhang/khachhang", {
      user: req.session.user,
      khachhang: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách khách hàng:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách khách hàng.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm khách hàng
router.get("/khachhang/add", isAdmin, async (req, res) => {
  try {
    const taikhoan = await query("SELECT MaTK, TenTK FROM TaiKhoan");
    res.render("admin/khachhang/khachhang_add", {
      user: req.session.user,
      taikhoan: taikhoan.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách tài khoản:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách tài khoản.");
    res.redirect("/admin/khachhang");
  }
});

// Xử lý thêm khách hàng
router.post("/khachhang/add", isAdmin, async (req, res) => {
  const { maTK, hoTenKH, emailKH, soDienThoaiKH } = req.body;
  try {
    // Kiểm tra tài khoản tồn tại
    const checkTK = await query("SELECT * FROM TaiKhoan WHERE MaTK = @maTK", {
      maTK,
    });
    if (checkTK.recordset.length === 0) {
      req.flash("error", "Tài khoản không tồn tại!");
      return res.redirect("/admin/khachhang/add");
    }

    // Kiểm tra email hoặc số điện thoại đã tồn tại
    const check = await query(
      `
      SELECT * FROM KhachHang 
      WHERE EmailKH = @emailKH OR SoDienThoaiKH = @soDienThoaiKH
    `,
      { emailKH, soDienThoaiKH }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Email hoặc số điện thoại đã được sử dụng!");
      return res.redirect("/admin/khachhang/add");
    }

    await query(
      `
      INSERT INTO KhachHang (MaTK, HoTenKH, EmailKH, SoDienThoaiKH, NgayTaoKH)
      VALUES (@maTK, @hoTenKH, @emailKH, @soDienThoaiKH, GETDATE())
    `,
      { maTK, hoTenKH, emailKH, soDienThoaiKH }
    );

    req.flash("success", "Thêm khách hàng thành công!");
    res.redirect("/admin/khachhang");
  } catch (err) {
    console.error("Lỗi thêm khách hàng:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm khách hàng.");
    res.redirect("/admin/khachhang/add");
  }
});

// Hiển thị form sửa khách hàng
router.get("/khachhang/edit/:maKH", isAdmin, async (req, res) => {
  const { maKH } = req.params;
  try {
    const khachhang = await query(
      "SELECT * FROM KhachHang WHERE MaKH = @maKH",
      { maKH }
    );
    const taikhoan = await query("SELECT MaTK, TenTK FROM TaiKhoan");
    if (khachhang.recordset.length === 0) {
      req.flash("error", "Khách hàng không tồn tại!");
      return res.redirect("/admin/khachhang");
    }
    res.render("admin/khachhang/khachhang_edit", {
      user: req.session.user,
      khachhang: khachhang.recordset[0],
      taikhoan: taikhoan.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin khách hàng:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin khách hàng.");
    res.redirect("/admin/khachhang");
  }
});

// Xử lý sửa khách hàng
router.post("/khachhang/edit", isAdmin, async (req, res) => {
  const { maKH, maTK, hoTenKH, emailKH, soDienThoaiKH } = req.body;
  try {
    // Kiểm tra tài khoản tồn tại
    const checkTK = await query("SELECT * FROM TaiKhoan WHERE MaTK = @maTK", {
      maTK,
    });
    if (checkTK.recordset.length === 0) {
      req.flash("error", "Tài khoản không tồn tại!");
      return res.redirect(`/admin/khachhang/edit/${maKH}`);
    }

    // Kiểm tra email hoặc số điện thoại đã tồn tại (ngoại trừ khách hàng hiện tại)
    const check = await query(
      `
      SELECT * FROM KhachHang 
      WHERE (EmailKH = @emailKH OR SoDienThoaiKH = @soDienThoaiKH) 
      AND MaKH != @maKH
    `,
      { emailKH, soDienThoaiKH, maKH }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Email hoặc số điện thoại đã được sử dụng!");
      return res.redirect(`/admin/khachhang/edit/${maKH}`);
    }

    await query(
      `
      UPDATE KhachHang
      SET MaTK = @maTK, HoTenKH = @hoTenKH, EmailKH = @emailKH, SoDienThoaiKH = @soDienThoaiKH
      WHERE MaKH = @maKH
    `,
      { maKH, maTK, hoTenKH, emailKH, soDienThoaiKH }
    );

    req.flash("success", "Sửa khách hàng thành công!");
    res.redirect("/admin/khachhang");
  } catch (err) {
    console.error("Lỗi sửa khách hàng:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa khách hàng.");
    res.redirect(`/admin/khachhang/edit/${maKH}`);
  }
});

// Xử lý xóa khách hàng
router.post("/khachhang/delete", isAdmin, async (req, res) => {
  const { maKH } = req.body;
  try {
    // Kiểm tra ràng buộc khóa ngoại
    const check = await query(
      `
      SELECT * FROM LichHen WHERE MaKH = @maKH
      UNION
      SELECT * FROM HoaDon WHERE MaKH = @maKH
      UNION
      SELECT * FROM DanhGia WHERE MaKH = @maKH
    `,
      { maKH }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Không thể xóa khách hàng vì đã được sử dụng!");
      return res.redirect("/admin/khachhang");
    }

    await query("DELETE FROM KhachHang WHERE MaKH = @maKH", { maKH });
    req.flash("success", "Xóa khách hàng thành công!");
    res.redirect("/admin/khachhang");
  } catch (err) {
    console.error("Lỗi xóa khách hàng:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa khách hàng.");
    res.redirect("/admin/khachhang");
  }
});

// Routes cho nhân viên
// Hiển thị danh sách nhân viên
router.get("/nhanvien", isAdmin, async (req, res) => {
  try {
    // Lấy số trang từ query parameter, mặc định là 1
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Số nhân viên mỗi trang
    const offset = (page - 1) * pageSize;

    // Truy vấn danh sách nhân viên với phân trang và sắp xếp theo ngày tạo
    const result = await query(
      `
      SELECT n.MaNV, n.HoTenNV, n.EmailNV, n.SodienthoaiNV, n.NgayTaoNV, t.TenTK
      FROM NhanVien n
      INNER JOIN TaiKhoan t ON n.MaTK = t.MaTK
      ORDER BY n.NgayTaoNV DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    // Truy vấn tổng số nhân viên để tính tổng số trang
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM NhanVien n
      INNER JOIN TaiKhoan t ON n.MaTK = t.MaTK
    `);
    const totalEmployees = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalEmployees / pageSize);

    res.render("admin/nhanvien/nhanvien", {
      user: req.session.user,
      nhanvien: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách nhân viên:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách nhân viên.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm nhân viên
router.get("/nhanvien/add", isAdmin, async (req, res) => {
  try {
    const taikhoan = await query("SELECT MaTK, TenTK FROM TaiKhoan");
    res.render("admin/nhanvien/nhanvien_add", {
      user: req.session.user,
      taikhoan: taikhoan.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách tài khoản:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách tài khoản.");
    res.redirect("/admin/nhanvien");
  }
});

// Xử lý thêm nhân viên
router.post("/nhanvien/add", isAdmin, async (req, res) => {
  const { maTK, hoTenNV, emailNV, sodienthoaiNV } = req.body;
  try {
    // Kiểm tra tài khoản tồn tại
    const checkTK = await query("SELECT * FROM TaiKhoan WHERE MaTK = @maTK", {
      maTK,
    });
    if (checkTK.recordset.length === 0) {
      req.flash("error", "Tài khoản không tồn tại!");
      return res.redirect("/admin/nhanvien/add");
    }

    // Kiểm tra email hoặc số điện thoại đã tồn tại
    const check = await query(
      `
      SELECT * FROM NhanVien 
      WHERE EmailNV = @emailNV OR SodienthoaiNV = @sodienthoaiNV
    `,
      { emailNV, sodienthoaiNV }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Email hoặc số điện thoại đã được sử dụng!");
      return res.redirect("/admin/nhanvien/add");
    }

    await query(
      `
      INSERT INTO NhanVien (MaTK, HoTenNV, EmailNV, SodienthoaiNV, NgayTaoNV)
      VALUES (@maTK, @hoTenNV, @emailNV, @sodienthoaiNV, GETDATE())
    `,
      { maTK, hoTenNV, emailNV, sodienthoaiNV }
    );

    req.flash("success", "Thêm nhân viên thành công!");
    res.redirect("/admin/nhanvien");
  } catch (err) {
    console.error("Lỗi thêm nhân viên:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm nhân viên.");
    res.redirect("/admin/nhanvien/add");
  }
});

// Hiển thị form sửa nhân viên
router.get("/nhanvien/edit/:maNV", isAdmin, async (req, res) => {
  const { maNV } = req.params;
  try {
    const nhanvien = await query("SELECT * FROM NhanVien WHERE MaNV = @maNV", {
      maNV,
    });
    const taikhoan = await query("SELECT MaTK, TenTK FROM TaiKhoan");
    if (nhanvien.recordset.length === 0) {
      req.flash("error", "Nhân viên không tồn tại!");
      return res.redirect("/admin/nhanvien");
    }
    res.render("admin/nhanvien/nhanvien_edit", {
      user: req.session.user,
      nhanvien: nhanvien.recordset[0],
      taikhoan: taikhoan.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin nhân viên:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin nhân viên.");
    res.redirect("/admin/nhanvien");
  }
});

// Xử lý sửa nhân viên
router.post("/nhanvien/edit", isAdmin, async (req, res) => {
  const { maNV, maTK, hoTenNV, emailNV, sodienthoaiNV } = req.body;
  try {
    // Kiểm tra tài khoản tồn tại
    const checkTK = await query("SELECT * FROM TaiKhoan WHERE MaTK = @maTK", {
      maTK,
    });
    if (checkTK.recordset.length === 0) {
      req.flash("error", "Tài khoản không tồn tại!");
      return res.redirect(`/admin/nhanvien/edit/${maNV}`);
    }

    // Kiểm tra email hoặc số điện thoại đã tồn tại (ngoại trừ nhân viên hiện tại)
    const check = await query(
      `
      SELECT * FROM NhanVien 
      WHERE (EmailNV = @emailNV OR SodienthoaiNV = @sodienthoaiNV) 
      AND MaNV != @maNV
    `,
      { emailNV, sodienthoaiNV, maNV }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Email hoặc số điện thoại đã được sử dụng!");
      return res.redirect(`/admin/nhanvien/edit/${maNV}`);
    }

    await query(
      `
      UPDATE NhanVien
      SET MaTK = @maTK, HoTenNV = @hoTenNV, EmailNV = @emailNV, SodienthoaiNV = @sodienthoaiNV
      WHERE MaNV = @maNV
    `,
      { maNV, maTK, hoTenNV, emailNV, sodienthoaiNV }
    );

    req.flash("success", "Sửa nhân viên thành công!");
    res.redirect("/admin/nhanvien");
  } catch (err) {
    console.error("Lỗi sửa nhân viên:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa nhân viên.");
    res.redirect(`/admin/nhanvien/edit/${maNV}`);
  }
});

// Xử lý xóa nhân viên
router.post("/nhanvien/delete", isAdmin, async (req, res) => {
  const { maNV } = req.body;
  try {
    // Kiểm tra ràng buộc khóa ngoại
    const check = await query(
      `
      SELECT * FROM LichHen WHERE MaNV = @maNV
    `,
      { maNV }
    );
    if (check.recordset.length > 0) {
      req.flash(
        "error",
        "Không thể xóa nhân viên vì đã được sử dụng trong lịch hẹn!"
      );
      return res.redirect("/admin/nhanvien");
    }

    await query("DELETE FROM NhanVien WHERE MaNV = @maNV", { maNV });
    req.flash("success", "Xóa nhân viên thành công!");
    res.redirect("/admin/nhanvien");
  } catch (err) {
    console.error("Lỗi xóa nhân viên:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa nhân viên.");
    res.redirect("/admin/nhanvien");
  }
});

// Routes cho LoaiSanPham
// Hiển thị danh sách loại sản phẩm
router.get("/loaisanpham", isAdmin, async (req, res) => {
  try {
    // Lấy số trang từ query parameter, mặc định là 1
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Số loại sản phẩm mỗi trang
    const offset = (page - 1) * pageSize;

    // Truy vấn danh sách loại sản phẩm với phân trang và sắp xếp theo tên
    const result = await query(
      `
      SELECT MaLSP, TenLSP
      FROM LoaiSanPham
      ORDER BY TenLSP ASC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    // Truy vấn tổng số loại sản phẩm để tính tổng số trang
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM LoaiSanPham
    `);
    const totalCategories = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalCategories / pageSize);

    res.render("admin/loaisanpham/loaisanpham", {
      user: req.session.user,
      loaisanpham: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách loại sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách loại sản phẩm.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm loại sản phẩm
router.get("/loaisanpham/add", isAdmin, async (req, res) => {
  res.render("admin/loaisanpham/loaisanpham_add", {
    user: req.session.user,
    message: req.flash("error"),
    csrfToken: res.locals.csrfToken,
  });
});

// Xử lý thêm loại sản phẩm
router.post("/loaisanpham/add", isAdmin, async (req, res) => {
  const { tenLSP } = req.body;
  try {
    // Kiểm tra tên loại sản phẩm đã tồn tại
    const check = await query(
      "SELECT * FROM LoaiSanPham WHERE TenLSP = @tenLSP",
      { tenLSP }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Tên loại sản phẩm đã tồn tại!");
      return res.redirect("/admin/loaisanpham/add");
    }

    await query(
      `
      INSERT INTO LoaiSanPham (TenLSP)
      VALUES (@tenLSP)
    `,
      { tenLSP }
    );

    req.flash("success", "Thêm loại sản phẩm thành công!");
    res.redirect("/admin/loaisanpham");
  } catch (err) {
    console.error("Lỗi thêm loại sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm loại sản phẩm.");
    res.redirect("/admin/loaisanpham/add");
  }
});

// Hiển thị form sửa loại sản phẩm
router.get("/loaisanpham/edit/:maLSP", isAdmin, async (req, res) => {
  const { maLSP } = req.params;
  try {
    const loaisanpham = await query(
      "SELECT * FROM LoaiSanPham WHERE MaLSP = @maLSP",
      { maLSP }
    );
    if (loaisanpham.recordset.length === 0) {
      req.flash("error", "Loại sản phẩm không tồn tại!");
      return res.redirect("/admin/loaisanpham");
    }
    res.render("admin/loaisanpham/loaisanpham_edit", {
      user: req.session.user,
      loaisanpham: loaisanpham.recordset[0],
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin loại sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin loại sản phẩm.");
    res.redirect("/admin/loaisanpham");
  }
});

// Xử lý sửa loại sản phẩm
router.post("/loaisanpham/edit", isAdmin, async (req, res) => {
  const { maLSP, tenLSP } = req.body;
  try {
    // Kiểm tra tên loại sản phẩm đã tồn tại (ngoại trừ loại sản phẩm hiện tại)
    const check = await query(
      `
      SELECT * FROM LoaiSanPham 
      WHERE TenLSP = @tenLSP AND MaLSP != @maLSP
    `,
      { tenLSP, maLSP }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Tên loại sản phẩm đã tồn tại!");
      return res.redirect(`/admin/loaisanpham/edit/${maLSP}`);
    }

    await query(
      `
      UPDATE LoaiSanPham
      SET TenLSP = @tenLSP
      WHERE MaLSP = @maLSP
    `,
      { maLSP, tenLSP }
    );

    req.flash("success", "Sửa loại sản phẩm thành công!");
    res.redirect("/admin/loaisanpham");
  } catch (err) {
    console.error("Lỗi sửa loại sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa loại sản phẩm.");
    res.redirect(`/admin/loaisanpham/edit/${maLSP}`);
  }
});

// Xử lý xóa loại sản phẩm
router.post("/loaisanpham/delete", isAdmin, async (req, res) => {
  const { maLSP } = req.body;
  try {
    // Kiểm tra ràng buộc khóa ngoại
    const check = await query(
      `
      SELECT * FROM SanPham WHERE MaLSP = @maLSP
    `,
      { maLSP }
    );
    if (check.recordset.length > 0) {
      req.flash(
        "error",
        "Không thể xóa loại sản phẩm vì đã được sử dụng trong sản phẩm!"
      );
      return res.redirect("/admin/loaisanpham");
    }

    await query("DELETE FROM LoaiSanPham WHERE MaLSP = @maLSP", { maLSP });
    req.flash("success", "Xóa loại sản phẩm thành công!");
    res.redirect("/admin/loaisanpham");
  } catch (err) {
    console.error("Lỗi xóa loại sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa loại sản phẩm.");
    res.redirect("/admin/loaisanpham");
  }
});

// Routes cho SanPham
// Hiển thị danh sách sản phẩm
router.get("/sanpham", isAdmin, async (req, res) => {
  try {
    // Lấy số trang từ query parameter, mặc định là 1
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Số sản phẩm mỗi trang
    const offset = (page - 1) * pageSize;

    // Truy vấn danh sách sản phẩm với phân trang và sắp xếp theo tên
    const result = await query(
      `
      SELECT s.MaSP, s.TenSP, s.GiaSP, s.PhamLoaiSP, s.TrangThaiSP, l.TenLSP
      FROM SanPham s
      INNER JOIN LoaiSanPham l ON s.MaLSP = l.MaLSP
      ORDER BY s.TenSP ASC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    // Truy vấn tổng số sản phẩm để tính tổng số trang
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM SanPham
    `);
    const totalProducts = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalProducts / pageSize);

    res.render("admin/sanpham/sanpham", {
      user: req.session.user,
      sanpham: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách sản phẩm.");
    res.redirect("/admin");
  }
});
// Hiển thị form thêm sản phẩm
router.get("/sanpham/add", isAdmin, async (req, res) => {
  try {
    const loaisanpham = await query("SELECT MaLSP, TenLSP FROM LoaiSanPham");
    res.render("admin/sanpham/sanpham_add", {
      user: req.session.user,
      loaisanpham: loaisanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách loại sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách loại sản phẩm.");
    res.redirect("/admin/sanpham");
  }
});

// Xử lý thêm sản phẩm
router.post("/sanpham/add", isAdmin, async (req, res) => {
  const { maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP } = req.body;
  try {
    // Kiểm tra loại sản phẩm tồn tại
    const checkLSP = await query(
      "SELECT * FROM LoaiSanPham WHERE MaLSP = @maLSP",
      { maLSP }
    );
    if (checkLSP.recordset.length === 0) {
      req.flash("error", "Loại sản phẩm không tồn tại!");
      return res.redirect("/admin/sanpham/add");
    }

    // Kiểm tra tên sản phẩm đã tồn tại
    const check = await query("SELECT * FROM SanPham WHERE TenSP = @tenSP", {
      tenSP,
    });
    if (check.recordset.length > 0) {
      req.flash("error", "Tên sản phẩm đã tồn tại!");
      return res.redirect("/admin/sanpham/add");
    }

    await query(
      `
      INSERT INTO SanPham (MaLSP, TenSP, GiaSP, PhamLoaiSP, TrangThaiSP)
      VALUES (@maLSP, @tenSP, @giaSP, @phamLoaiSP, @trangThaiSP)
    `,
      { maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP }
    );

    req.flash("success", "Thêm sản phẩm thành công!");
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Lỗi thêm sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm sản phẩm.");
    res.redirect("/admin/sanpham/add");
  }
});

// Hiển thị form sửa sản phẩm
router.get("/sanpham/edit/:maSP", isAdmin, async (req, res) => {
  const { maSP } = req.params;
  try {
    const sanpham = await query("SELECT * FROM SanPham WHERE MaSP = @maSP", {
      maSP,
    });
    const loaisanpham = await query("SELECT MaLSP, TenLSP FROM LoaiSanPham");
    if (sanpham.recordset.length === 0) {
      req.flash("error", "Sản phẩm không tồn tại!");
      return res.redirect("/admin/sanpham");
    }
    res.render("admin/sanpham/sanpham_edit", {
      user: req.session.user,
      sanpham: sanpham.recordset[0],
      loaisanpham: loaisanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin sản phẩm.");
    res.redirect("/admin/sanpham");
  }
});

// Xử lý sửa sản phẩm
router.post("/sanpham/edit", isAdmin, async (req, res) => {
  const { maSP, maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP } = req.body;
  try {
    // Kiểm tra loại sản phẩm tồn tại
    const checkLSP = await query(
      "SELECT * FROM LoaiSanPham WHERE MaLSP = @maLSP",
      { maLSP }
    );
    if (checkLSP.recordset.length === 0) {
      req.flash("error", "Loại sản phẩm không tồn tại!");
      return res.redirect(`/admin/sanpham/edit/${maSP}`);
    }

    // Kiểm tra tên sản phẩm đã tồn tại (ngoại trừ sản phẩm hiện tại)
    const check = await query(
      `
      SELECT * FROM SanPham 
      WHERE TenSP = @tenSP AND MaSP != @maSP
    `,
      { tenSP, maSP }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Tên sản phẩm đã tồn tại!");
      return res.redirect(`/admin/sanpham/edit/${maSP}`);
    }

    await query(
      `
      UPDATE SanPham
      SET MaLSP = @maLSP, TenSP = @tenSP, GiaSP = @giaSP, PhamLoaiSP = @phamLoaiSP, TrangThaiSP = @trangThaiSP
      WHERE MaSP = @maSP
    `,
      { maSP, maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP }
    );

    req.flash("success", "Sửa sản phẩm thành công!");
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Lỗi sửa sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa sản phẩm.");
    res.redirect(`/admin/sanpham/edit/${maSP}`);
  }
});

// Xử lý xóa sản phẩm
router.post("/sanpham/delete", isAdmin, async (req, res) => {
  const { maSP } = req.body;
  try {
    // Kiểm tra ràng buộc khóa ngoại
    const check = await query(
      `
      SELECT * FROM LichHen WHERE MaSP = @maSP
      UNION
      SELECT * FROM BaiViet WHERE MaSP = @maSP
      UNION
      SELECT * FROM ChiTietHoaDon WHERE MaSP = @maSP
    `,
      { maSP }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Không thể xóa sản phẩm vì đã được sử dụng!");
      return res.redirect("/admin/sanpham");
    }

    await query("DELETE FROM SanPham WHERE MaSP = @maSP", { maSP });
    req.flash("success", "Xóa sản phẩm thành công!");
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Lỗi xóa sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa sản phẩm.");
    res.redirect("/admin/sanpham");
  }
});

// Routes cho LichHen
// Hiển thị danh sách lịch hẹn
router.get("/lichhen", isAdmin, async (req, res) => {
  try {
    // Lấy số trang từ query parameter, mặc định là 1
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Số lịch hẹn mỗi trang
    const offset = (page - 1) * pageSize;

    // Truy vấn danh sách lịch hẹn với phân trang và sắp xếp theo ngày hẹn giảm dần
    const result = await query(
      `
      SELECT lh.MaLH, lh.NgayHen, lh.GioHen, lh.TrangThaiLH, lh.GhiChuLH, lh.HinhAnhLH,
             n.HoTenNV, k.HoTenKH, s.TenSP
      FROM LichHen lh
      INNER JOIN NhanVien n ON lh.MaNV = n.MaNV
      INNER JOIN KhachHang k ON lh.MaKH = k.MaKH
      INNER JOIN SanPham s ON lh.MaSP = s.MaSP
      ORDER BY lh.NgayHen DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    // Truy vấn tổng số lịch hẹn để tính tổng số trang
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM LichHen
    `);
    const totalAppointments = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalAppointments / pageSize);

    res.render("admin/lichhen/lichhen", {
      user: req.session.user,
      lichhen: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách lịch hẹn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách lịch hẹn.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm lịch hẹn
router.get("/lichhen/add", isAdmin, async (req, res) => {
  try {
    const nhanvien = await query("SELECT MaNV, HoTenNV FROM NhanVien");
    const khachhang = await query("SELECT MaKH, HoTenKH FROM KhachHang");
    const sanpham = await query("SELECT MaSP, TenSP FROM SanPham");
    res.render("admin/lichhen/lichhen_add", {
      user: req.session.user,
      nhanvien: nhanvien.recordset,
      khachhang: khachhang.recordset,
      sanpham: sanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu cho form lịch hẹn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy dữ liệu.");
    res.redirect("/admin/lichhen");
  }
});

// Xử lý thêm lịch hẹn
router.post("/lichhen/add", isAdmin, (req, res, next) => {
  const upload = req.app.get("upload");
  upload.single("hinhAnhLH")(req, res, async (err) => {
    if (err) {
      console.error("Lỗi upload:", err);
      req.flash("error", err.message || "Lỗi khi upload hình ảnh.");
      return res.redirect("/admin/lichhen/add");
    }
    const { maNV, maKH, maSP, ngayHen, gioHen, trangThaiLH, ghiChuLH } =
      req.body;
    const hinhAnhLH = req.file
      ? `/uploads/khachhang/${req.file.filename}`
      : null;
    try {
      // Kiểm tra nhân viên, khách hàng, sản phẩm tồn tại
      const checkNV = await query("SELECT * FROM NhanVien WHERE MaNV = @maNV", {
        maNV,
      });
      const checkKH = await query(
        "SELECT * FROM KhachHang WHERE MaKH = @maKH",
        { maKH }
      );
      const checkSP = await query("SELECT * FROM SanPham WHERE MaSP = @maSP", {
        maSP,
      });
      if (checkNV.recordset.length === 0) {
        req.flash("error", "Nhân viên không tồn tại!");
        return res.redirect("/admin/lichhen/add");
      }
      if (checkKH.recordset.length === 0) {
        req.flash("error", "Khách hàng không tồn tại!");
        return res.redirect("/admin/lichhen/add");
      }
      if (checkSP.recordset.length === 0) {
        req.flash("error", "Sản phẩm không tồn tại!");
        return res.redirect("/admin/lichhen/add");
      }

      await query(
        `
        INSERT INTO LichHen (MaNV, MaKH, MaSP, NgayHen, GioHen, TrangThaiLH, GhiChuLH, HinhAnhLH)
        VALUES (@maNV, @maKH, @maSP, @ngayHen, @gioHen, @trangThaiLH, @ghiChuLH, @hinhAnhLH)
      `,
        {
          maNV,
          maKH,
          maSP,
          ngayHen,
          gioHen,
          trangThaiLH,
          ghiChuLH,
          hinhAnhLH,
        }
      );

      req.flash("success", "Thêm lịch hẹn thành công!");
      res.redirect("/admin/lichhen");
    } catch (err) {
      console.error("Lỗi thêm lịch hẹn:", err);
      req.flash("error", "Có lỗi xảy ra khi thêm lịch hẹn.");
      res.redirect("/admin/lichhen/add");
    }
  });
});

// Hiển thị form sửa lịch hẹn
router.get("/lichhen/edit/:maLH", isAdmin, async (req, res) => {
  const { maLH } = req.params;
  try {
    const lichhen = await query("SELECT * FROM LichHen WHERE MaLH = @maLH", {
      maLH,
    });
    const nhanvien = await query("SELECT MaNV, HoTenNV FROM NhanVien");
    const khachhang = await query("SELECT MaKH, HoTenKH FROM KhachHang");
    const sanpham = await query("SELECT MaSP, TenSP FROM SanPham");
    if (lichhen.recordset.length === 0) {
      req.flash("error", "Lịch hẹn không tồn tại!");
      return res.redirect("/admin/lichhen");
    }
    res.render("admin/lichhen/lichhen_edit", {
      user: req.session.user,
      lichhen: lichhen.recordset[0],
      nhanvien: nhanvien.recordset,
      khachhang: khachhang.recordset,
      sanpham: sanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin lịch hẹn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin lịch hẹn.");
    res.redirect("/admin/lichhen");
  }
});

// Xử lý sửa lịch hẹn
router.post("/lichhen/edit", isAdmin, (req, res, next) => {
  const upload = req.app.get("upload");
  upload.single("hinhAnhLH")(req, res, async (err) => {
    if (err) {
      console.error("Lỗi upload:", err);
      req.flash("error", err.message || "Lỗi khi upload hình ảnh.");
      return res.redirect(`/admin/lichhen/edit/${req.body.maLH}`);
    }
    const {
      maLH,
      maNV,
      maKH,
      maSP,
      ngayHen,
      gioHen,
      trangThaiLH,
      ghiChuLH,
      currentHinhAnhLH,
    } = req.body;
    const hinhAnhLH = req.file
      ? `/uploads/khachhang/${req.file.filename}`
      : currentHinhAnhLH;
    try {
      // Kiểm tra nhân viên, khách hàng, sản phẩm tồn tại
      const checkNV = await query("SELECT * FROM NhanVien WHERE MaNV = @maNV", {
        maNV,
      });
      const checkKH = await query(
        "SELECT * FROM KhachHang WHERE MaKH = @maKH",
        { maKH }
      );
      const checkSP = await query("SELECT * FROM SanPham WHERE MaSP = @maSP", {
        maSP,
      });
      if (checkNV.recordset.length === 0) {
        req.flash("error", "Nhân viên không tồn tại!");
        return res.redirect(`/admin/lichhen/edit/${maLH}`);
      }
      if (checkKH.recordset.length === 0) {
        req.flash("error", "Khách hàng không tồn tại!");
        return res.redirect(`/admin/lichhen/edit/${maLH}`);
      }
      if (checkSP.recordset.length === 0) {
        req.flash("error", "Sản phẩm không tồn tại!");
        return res.redirect(`/admin/lichhen/edit/${maLH}`);
      }

      await query(
        `
        UPDATE LichHen
        SET MaNV = @maNV, MaKH = @maKH, MaSP = @maSP, NgayHen = @ngayHen, GioHen = @gioHen, 
            TrangThaiLH = @trangThaiLH, GhiChuLH = @ghiChuLH, HinhAnhLH = @hinhAnhLH
        WHERE MaLH = @maLH
      `,
        {
          maLH,
          maNV,
          maKH,
          maSP,
          ngayHen,
          gioHen,
          trangThaiLH,
          ghiChuLH,
          hinhAnhLH,
        }
      );

      req.flash("success", "Sửa lịch hẹn thành công!");
      res.redirect("/admin/lichhen");
    } catch (err) {
      console.error("Lỗi sửa lịch hẹn:", err);
      req.flash("error", "Có lỗi xảy ra khi sửa lịch hẹn.");
      res.redirect(`/admin/lichhen/edit/${maLH}`);
    }
  });
});

// Xử lý xóa lịch hẹn
router.post("/lichhen/delete", isAdmin, async (req, res) => {
  const { maLH } = req.body;
  try {
    // Kiểm tra ràng buộc khóa ngoại
    const check = await query(
      `
      SELECT * FROM HoaDon WHERE MaLH = @maLH
    `,
      { maLH }
    );
    if (check.recordset.length > 0) {
      req.flash(
        "error",
        "Không thể xóa lịch hẹn vì đã được sử dụng trong hóa đơn!"
      );
      return res.redirect("/admin/lichhen");
    }

    await query("DELETE FROM LichHen WHERE MaLH = @maLH", { maLH });
    req.flash("success", "Xóa lịch hẹn thành công!");
    res.redirect("/admin/lichhen");
  } catch (err) {
    console.error("Lỗi xóa lịch hẹn:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa lịch hẹn.");
    res.redirect("/admin/lichhen");
  }
});

// Xử lý lịch hẹn thành công và tạo hóa đơn
router.post("/lichhen/complete", async (req, res) => {
  try {
    const { maLH, _csrf } = req.body;

    if (!maLH || isNaN(parseInt(maLH))) {
      req.flash("error", "Mã lịch hẹn không hợp lệ.");
      return res.redirect("/admin/lichhen");
    }

    // Kiểm tra lịch hẹn
    const lichHenResult = await query(
      `
      SELECT lh.*, sp.GiaSP, sp.TenSP, nv.HoTenNV, kh.HoTenKH, kh.EmailKH
      FROM LichHen lh
      JOIN SanPham sp ON lh.MaSP = sp.MaSP
      JOIN NhanVien nv ON lh.MaNV = nv.MaNV
      JOIN KhachHang kh ON lh.MaKH = kh.MaKH
      WHERE lh.MaLH = @MaLH AND lh.TrangThaiLH IN (N'Chờ xác nhận', N'Đã xác nhận')
      `,
      { MaLH: parseInt(maLH) }
    );

    if (!lichHenResult.recordset || lichHenResult.recordset.length === 0) {
      req.flash("error", "Lịch hẹn không tồn tại hoặc không thể hoàn thành.");
      return res.redirect("/admin/lichhen");
    }

    const lichHen = lichHenResult.recordset[0];
    const totalAmount = lichHen.GiaSP; // Số lượng đã bị xóa, chỉ lấy giá sản phẩm

    // Tạo hóa đơn
    const hoaDonResult = await query(
      `
      INSERT INTO HoaDon (MaKH, MaLH, TongTien, PhuongThucThanhToan, TrangThaiHD, NgayLapHD)
      OUTPUT INSERTED.MaHD
      VALUES (@MaKH, @MaLH, @TongTien, @PhuongThucThanhToan, N'Hoàn thành', @NgayLapHD)
      `,
      {
        MaKH: lichHen.MaKH,
        MaLH: lichHen.MaLH,
        TongTien: totalAmount,
        PhuongThucThanhToan: lichHen.PhuongThucTT || "Chuyển khoản ngân hàng",
        NgayLapHD: new Date(),
      }
    );

    const maHD = hoaDonResult.recordset[0].MaHD;

    // Tạo chi tiết hóa đơn
    await query(
      `
      INSERT INTO ChiTietHoaDon (MaHD, MaSP, DonGia)
      VALUES (@MaHD, @MaSP, @DonGia)
      `,
      {
        MaHD: maHD,
        MaSP: lichHen.MaSP,
        DonGia: lichHen.GiaSP,
      }
    );

    // Cập nhật trạng thái lịch hẹn
    await query(
      "UPDATE LichHen SET TrangThaiLH = N'Hoàn thành' WHERE MaLH = @MaLH",
      { MaLH: parseInt(maLH) }
    );

    // Gửi email thông báo hoàn thành
    const mailOptions = {
      from: emailConfig.user,
      to: lichHen.EmailKH,
      subject: "Lịch Hẹn Hoàn Thành - Tiệm Nail Diamond",
      html: `
        <p>Xin chào ${lichHen.HoTenKH},</p>
        <p>Lịch hẹn của bạn đã hoàn thành với chi tiết:</p>
        <ul>
          <li><strong>Ngày hẹn:</strong> ${new Date(
            lichHen.NgayHen
          ).toLocaleDateString("vi-VN")}</li>
          <li><strong>Giờ hẹn:</strong> ${
            lichHen.GioHen
              ? new Date(lichHen.GioHen).toISOString().slice(11, 16)
              : "Không xác định"
          }</li>
          <li><strong>Dịch vụ:</strong> ${lichHen.TenSP}</li>
          <li><strong>Nhân viên:</strong> ${lichHen.HoTenNV}</li>
          <li><strong>Tổng tiền:</strong> ${totalAmount.toLocaleString(
            "vi-VN"
          )} VND</li>
        </ul>
        <p>Vui lòng đăng nhập vào <a href="http://${
          req.headers.host
        }/lichsu-lichhen">Lịch sử lịch hẹn</a> để đánh giá dịch vụ.</p>
        <p>Trân trọng,</p>
        <p>Tiệm Nail Diamond</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      "✅ Email thông báo hoàn thành đã được gửi đến:",
      lichHen.EmailKH
    );

    req.flash("success", "Lịch hẹn hoàn thành và hóa đơn đã được tạo!");
    res.redirect("/admin/lichhen");
  } catch (err) {
    console.error("Lỗi khi hoàn thành lịch hẹn:", err);
    req.flash("error", "Không thể hoàn thành lịch hẹn.");
    res.redirect("/admin/lichhen");
  }
});

// Routes cho SanPham
router.get("/sanpham", isAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT sp.*, lsp.TenLSP
      FROM SanPham sp
      INNER JOIN LoaiSanPham lsp ON sp.MaLSP = lsp.MaLSP
    `);
    res.render("admin/sanpham/sanpham", {
      user: req.session.user,
      sanpham: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách sản phẩm.");
    res.redirect("/admin");
  }
});

router.get("/sanpham/add", isAdmin, async (req, res) => {
  try {
    const loaisanpham = await query("SELECT MaLSP, TenLSP FROM LoaiSanPham");
    res.render("admin/sanpham/sanpham_add", {
      user: req.session.user,
      loaisanpham: loaisanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách loại sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy dữ liệu.");
    res.redirect("/admin/sanpham");
  }
});

router.post("/sanpham/add", isAdmin, async (req, res) => {
  const { maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP } = req.body;
  try {
    const checkLSP = await query(
      "SELECT * FROM LoaiSanPham WHERE MaLSP = @maLSP",
      { maLSP }
    );
    if (checkLSP.recordset.length === 0) {
      req.flash("error", "Loại sản phẩm không tồn tại!");
      return res.redirect("/admin/sanpham/add");
    }
    await query(
      `
      INSERT INTO SanPham (MaLSP, TenSP, GiaSP, PhamLoaiSP, TrangThaiSP)
      VALUES (@maLSP, @tenSP, @giaSP, @phamLoaiSP, @trangThaiSP)
    `,
      { maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP }
    );
    req.flash("success", "Thêm sản phẩm thành công!");
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Lỗi thêm sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm sản phẩm.");
    res.redirect("/admin/sanpham/add");
  }
});

router.get("/sanpham/edit/:maSP", isAdmin, async (req, res) => {
  const { maSP } = req.params;
  try {
    const sanpham = await query("SELECT * FROM SanPham WHERE MaSP = @maSP", {
      maSP,
    });
    const loaisanpham = await query("SELECT MaLSP, TenLSP FROM LoaiSanPham");
    if (sanpham.recordset.length === 0) {
      req.flash("error", "Sản phẩm không tồn tại!");
      return res.redirect("/admin/sanpham");
    }
    res.render("admin/sanpham/sanpham_edit", {
      user: req.session.user,
      sanpham: sanpham.recordset[0],
      loaisanpham: loaisanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin sản phẩm.");
    res.redirect("/admin/sanpham");
  }
});

router.post("/sanpham/edit", isAdmin, async (req, res) => {
  const { maSP, maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP } = req.body;
  try {
    const checkLSP = await query(
      "SELECT * FROM LoaiSanPham WHERE MaLSP = @maLSP",
      { maLSP }
    );
    if (checkLSP.recordset.length === 0) {
      req.flash("error", "Loại sản phẩm không tồn tại!");
      return res.redirect(`/admin/sanpham/edit/${maSP}`);
    }
    await query(
      `
      UPDATE SanPham
      SET MaLSP = @maLSP, TenSP = @tenSP, GiaSP = @giaSP, PhamLoaiSP = @phamLoaiSP, 
          TrangThaiSP = @trangThaiSP
      WHERE MaSP = @maSP
    `,
      { maSP, maLSP, tenSP, giaSP, phamLoaiSP, trangThaiSP }
    );
    req.flash("success", "Sửa sản phẩm thành công!");
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Lỗi sửa sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa sản phẩm.");
    res.redirect(`/admin/sanpham/edit/${maSP}`);
  }
});

router.post("/sanpham/delete", isAdmin, async (req, res) => {
  const { maSP } = req.body;
  try {
    const check = await query(
      `
      SELECT * FROM BaiViet WHERE MaSP = @maSP
      UNION
      SELECT * FROM LichHen WHERE MaSP = @maSP
      UNION
      SELECT * FROM ChiTietHoaDon WHERE MaSP = @maSP
    `,
      { maSP }
    );
    if (check.recordset.length > 0) {
      req.flash("error", "Không thể xóa sản phẩm vì đã được sử dụng!");
      return res.redirect("/admin/sanpham");
    }
    await query("DELETE FROM SanPham WHERE MaSP = @maSP", { maSP });
    req.flash("success", "Xóa sản phẩm thành công!");
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Lỗi xóa sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa sản phẩm.");
    res.redirect("/admin/sanpham");
  }
});

// Routes cho BaiViet
// Hiển thị danh sách bài viết
router.get("/baiviet", isAdmin, async (req, res) => {
  try {
    // Lấy số trang từ query parameter, mặc định là 1
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10; // Số bài viết mỗi trang
    const offset = (page - 1) * pageSize;

    // Truy vấn danh sách bài viết với phân trang
    const result = await query(
      `
      SELECT bv.*, sp.TenSP
      FROM BaiViet bv
      INNER JOIN SanPham sp ON bv.MaSP = sp.MaSP
      ORDER BY bv.MaBV ASC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    // Truy vấn tổng số bài viết để tính tổng số trang
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM BaiViet
    `);
    const totalPosts = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalPosts / pageSize);

    res.render("admin/baiviet/baiviet", {
      user: req.session.user,
      baiviet: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách bài viết:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách bài viết.");
    res.redirect("/admin");
  }
});

router.get("/baiviet/add", isAdmin, async (req, res) => {
  try {
    const sanpham = await query("SELECT MaSP, TenSP FROM SanPham");
    res.render("admin/baiviet/baiviet_add", {
      user: req.session.user,
      sanpham: sanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách sản phẩm:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy dữ liệu.");
    res.redirect("/admin/baiviet");
  }
});

router.post("/baiviet/add", isAdmin, (req, res, next) => {
  const upload = req.app.get("upload");
  upload.single("hinhAnhBV")(req, res, async (err) => {
    if (err) {
      req.flash("error", err.message || "Lỗi khi upload hình ảnh.");
      return res.redirect("/admin/baiviet/add");
    }
    const { maSP, moTaBV } = req.body;
    const hinhAnhBV = req.file
      ? `/uploads/khachhang/${req.file.filename}`
      : null;
    try {
      const checkSP = await query("SELECT * FROM SanPham WHERE MaSP = @maSP", {
        maSP,
      });
      if (checkSP.recordset.length === 0) {
        req.flash("error", "Sản phẩm không tồn tại!");
        return res.redirect("/admin/baiviet/add");
      }
      await query(
        `
        INSERT INTO BaiViet (MaSP, MoTaBV, HinhAnhBV)
        VALUES (@maSP, @moTaBV, @hinhAnhBV)
      `,
        { maSP, moTaBV, hinhAnhBV }
      );
      req.flash("success", "Thêm bài viết thành công!");
      res.redirect("/admin/baiviet");
    } catch (err) {
      console.error("Lỗi thêm bài viết:", err);
      req.flash("error", "Có lỗi xảy ra khi thêm bài viết.");
      res.redirect("/admin/baiviet/add");
    }
  });
});

router.get("/baiviet/edit/:maBV", isAdmin, async (req, res) => {
  const { maBV } = req.params;
  try {
    const baiviet = await query("SELECT * FROM BaiViet WHERE MaBV = @maBV", {
      maBV,
    });
    const sanpham = await query("SELECT MaSP, TenSP FROM SanPham");
    if (baiviet.recordset.length === 0) {
      req.flash("error", "Bài viết không tồn tại!");
      return res.redirect("/admin/baiviet");
    }
    res.render("admin/baiviet/baiviet_edit", {
      user: req.session.user,
      baiviet: baiviet.recordset[0],
      sanpham: sanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin bài viết:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin bài viết.");
    res.redirect("/admin/baiviet");
  }
});

router.post("/baiviet/edit", isAdmin, (req, res, next) => {
  const upload = req.app.get("upload");
  upload.single("hinhAnhBV")(req, res, async (err) => {
    if (err) {
      req.flash("error", err.message || "Lỗi khi upload hình ảnh.");
      return res.redirect(`/admin/baiviet/edit/${req.body.maBV}`);
    }
    const { maBV, maSP, moTaBV, currentHinhAnhBV } = req.body;
    const hinhAnhBV = req.file
      ? `/uploads/khachhang/${req.file.filename}`
      : currentHinhAnhBV;
    try {
      const checkSP = await query("SELECT * FROM SanPham WHERE MaSP = @maSP", {
        maSP,
      });
      if (checkSP.recordset.length === 0) {
        req.flash("error", "Sản phẩm không tồn tại!");
        return res.redirect(`/admin/baiviet/edit/${maBV}`);
      }
      // Xóa ảnh cũ nếu có ảnh mới
      if (req.file && currentHinhAnhBV) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "public",
          currentHinhAnhBV
        );
        try {
          await fs.unlink(oldImagePath);
        } catch (err) {
          console.error("Lỗi xóa ảnh cũ:", err);
        }
      }
      await query(
        `
        UPDATE BaiViet
        SET MaSP = @maSP, MoTaBV = @moTaBV, HinhAnhBV = @hinhAnhBV
        WHERE MaBV = @maBV
      `,
        { maBV, maSP, moTaBV, hinhAnhBV }
      );
      req.flash("success", "Sửa bài viết thành công!");
      res.redirect("/admin/baiviet");
    } catch (err) {
      console.error("Lỗi sửa bài viết:", err);
      req.flash("error", "Có lỗi xảy ra khi sửa bài viết.");
      res.redirect(`/admin/baiviet/edit/${maBV}`);
    }
  });
});

router.post("/baiviet/delete", isAdmin, async (req, res) => {
  const { maBV } = req.body;
  try {
    // Kiểm tra ràng buộc khóa ngoại (giả sử có bảng BinhLuan)
    const check = await query("SELECT * FROM BinhLuan WHERE MaBV = @maBV", {
      maBV,
    });
    if (check.recordset.length > 0) {
      req.flash(
        "error",
        "Không thể xóa bài viết vì đã có bình luận liên quan!"
      );
      return res.redirect("/admin/baiviet");
    }
    // Xóa ảnh nếu tồn tại
    const baiviet = await query(
      "SELECT HinhAnhBV FROM BaiViet WHERE MaBV = @maBV",
      { maBV }
    );
    if (baiviet.recordset[0]?.HinhAnhBV) {
      const imagePath = path.join(
        __dirname,
        "..",
        "public",
        baiviet.recordset[0].HinhAnhBV
      );
      try {
        await fs.unlink(imagePath);
      } catch (err) {
        console.error("Lỗi xóa ảnh bài viết:", err);
      }
    }
    await query("DELETE FROM BaiViet WHERE MaBV = @maBV", { maBV });
    req.flash("success", "Xóa bài viết thành công!");
    res.redirect("/admin/baiviet");
  } catch (err) {
    console.error("Lỗi xóa bài viết:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa bài viết.");
    res.redirect("/admin/baiviet");
  }
});

// Routes cho HoaDon
// Hiển thị danh sách hóa đơn
router.get("/hoadon", isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const result = await query(
      `
      SELECT hd.*, kh.HoTenKH
      FROM HoaDon hd
      INNER JOIN KhachHang kh ON hd.MaKH = kh.MaKH
      ORDER BY hd.NgayLapHD DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM HoaDon
    `);
    const totalInvoices = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalInvoices / pageSize);

    res.render("admin/hoadon/hoadon", {
      user: req.session.user,
      hoadon: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách hóa đơn.");
    res.redirect("/admin");
  }
});

router.get("/hoadon/add", isAdmin, async (req, res) => {
  try {
    const khachhang = await query("SELECT MaKH, HoTenKH FROM KhachHang");
    const lichhen = await query("SELECT MaLH, NgayHen FROM LichHen");
    res.render("admin/hoadon/hoadon_add", {
      user: req.session.user,
      khachhang: khachhang.recordset,
      lichhen: lichhen.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy dữ liệu.");
    res.redirect("/admin/hoadon");
  }
});

router.post("/hoadon/add", isAdmin, async (req, res) => {
  const { maKH, maLH, tongTien, phuongThucThanhToan, trangThaiHD, ngayLapHD } =
    req.body;
  try {
    const checkKH = await query("SELECT * FROM KhachHang WHERE MaKH = @maKH", {
      maKH,
    });
    const checkLH = await query("SELECT * FROM LichHen WHERE MaLH = @maLH", {
      maLH,
    });
    if (checkKH.recordset.length === 0 || checkLH.recordset.length === 0) {
      req.flash("error", "Khách hàng hoặc lịch hẹn không tồn tại!");
      return res.redirect("/admin/hoadon/add");
    }
    await query(
      `
      INSERT INTO HoaDon (MaKH, MaLH, TongTien, PhuongThucThanhToan, TrangThaiHD, NgayLapHD)
      VALUES (@maKH, @maLH, @tongTien, @phuongThucThanhToan, @trangThaiHD, @ngayLapHD)
    `,
      { maKH, maLH, tongTien, phuongThucThanhToan, trangThaiHD, ngayLapHD }
    );
    req.flash("success", "Thêm hóa đơn thành công!");
    res.redirect("/admin/hoadon");
  } catch (err) {
    console.error("Lỗi thêm hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm hóa đơn.");
    res.redirect("/admin/hoadon/add");
  }
});

router.get("/hoadon/edit/:maHD", isAdmin, async (req, res) => {
  const { maHD } = req.params;
  try {
    const hobicity = await query("SELECT * FROM HoaDon WHERE MaHD = @maHD", {
      maHD,
    });
    const khachhang = await query("SELECT MaKH, HoTenKH FROM KhachHang");
    const lichhen = await query("SELECT MaLH, NgayHen FROM LichHen");
    if (hoadon.recordset.length === 0) {
      req.flash("error", "Hóa đơn không tồn tại!");
      return res.redirect("/admin/hoadon");
    }
    res.render("admin/hoadon/hoadon_edit", {
      user: req.session.user,
      hoadon: hoadon.recordset[0],
      khachhang: khachhang.recordset,
      lichhen: lichhen.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin hóa đơn.");
    res.redirect("/admin/hoadon");
  }
});

router.post("/hoadon/edit", isAdmin, async (req, res) => {
  const {
    maHD,
    maKH,
    maLH,
    tongTien,
    phuongThucThanhToan,
    trangThaiHD,
    ngayLapHD,
  } = req.body;
  try {
    const checkKH = await query("SELECT * FROM KhachHang WHERE MaKH = @maKH", {
      maKH,
    });
    const checkLH = await query("SELECT * FROM LichHen WHERE MaLH = @maLH", {
      maLH,
    });
    if (checkKH.recordset.length === 0 || checkLH.recordset.length === 0) {
      req.flash("error", "Khách hàng hoặc lịch hẹn không tồn tại!");
      return res.redirect(`/admin/hoadon/edit/${maHD}`);
    }
    await query(
      `
      UPDATE HoaDon
      SET MaKH = @maKH, MaLH = @maLH, TongTien = @tongTien, PhuongThucThanhToan = @phuongThucThanhToan, 
          TrangThaiHD = @trangThaiHD, NgayLapHD = @ngayLapHD
      WHERE MaHD = @maHD
    `,
      {
        maHD,
        maKH,
        maLH,
        tongTien,
        phuongThucThanhToan,
        trangThaiHD,
        ngayLapHD,
      }
    );
    req.flash("success", "Sửa hóa đơn thành công!");
    res.redirect("/admin/hoadon");
  } catch (err) {
    console.error("Lỗi sửa hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa hóa đơn.");
    res.redirect(`/admin/hoadon/edit/${maHD}`);
  }
});

router.post("/hoadon/delete", isAdmin, async (req, res) => {
  const { maHD } = req.body;
  try {
    const check = await query(
      "SELECT * FROM ChiTietHoaDon WHERE MaHD = @maHD",
      { maHD }
    );
    if (check.recordset.length > 0) {
      req.flash(
        "error",
        "Không thể xóa hóa đơn vì đã có chi tiết hóa đơn liên quan!"
      );
      return res.redirect("/admin/hoadon");
    }
    await query("DELETE FROM HoaDon WHERE MaHD = @maHD", { maHD });
    req.flash("success", "Xóa hóa đơn thành công!");
    res.redirect("/admin/hoadon");
  } catch (err) {
    console.error("Lỗi xóa hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa hóa đơn.");
    res.redirect("/admin/hoadon");
  }
});

// Xem chi tiết hóa đơn
router.get("/hoadon/view/:maHD", isAdmin, async (req, res) => {
  const { maHD } = req.params;
  try {
    const hoadonResult = await query(
      `
      SELECT hd.*, kh.HoTenKH
      FROM HoaDon hd
      INNER JOIN KhachHang kh ON hd.MaKH = kh.MaKH
      WHERE hd.MaHD = @maHD
    `,
      { maHD }
    );

    const chitiethoadonResult = await query(
      `
      SELECT cthd.*, sp.TenSP
      FROM ChiTietHoaDon cthd
      INNER JOIN SanPham sp ON cthd.MaSP = sp.MaSP
      WHERE cthd.MaHD = @maHD
    `,
      { maHD }
    );

    if (hoadonResult.recordset.length === 0) {
      req.flash("error", "Hóa đơn không tồn tại!");
      return res.redirect("/admin/hoadon");
    }

    res.render("admin/hoadon/hoadon_view", {
      user: req.session.user,
      hoadon: hoadonResult.recordset[0],
      chitiethoadon: chitiethoadonResult.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy chi tiết hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy chi tiết hóa đơn.");
    res.redirect("/admin/hoadon");
  }
});

// In hóa đơn
router.get("/hoadon/print/:maHD", isAdmin, async (req, res) => {
  const { maHD } = req.params;
  try {
    const hoadonResult = await query(
      `
      SELECT hd.*, kh.HoTenKH
      FROM HoaDon hd
      INNER JOIN KhachHang kh ON hd.MaKH = kh.MaKH
      WHERE hd.MaHD = @maHD
    `,
      { maHD }
    );

    const chitiethoadonResult = await query(
      `
      SELECT cthd.*, sp.TenSP
      FROM ChiTietHoaDon cthd
      INNER JOIN SanPham sp ON cthd.MaSP = sp.MaSP
      WHERE cthd.MaHD = @maHD
    `,
      { maHD }
    );

    if (hoadonResult.recordset.length === 0) {
      req.flash("error", "Hóa đơn không tồn tại!");
      return res.redirect("/admin/hoadon");
    }

    res.render("admin/hoadon/hoadon_print", {
      hoadon: hoadonResult.recordset[0],
      chitiethoadon: chitiethoadonResult.recordset,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin in hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin in hóa đơn.");
    res.redirect("/admin/hoadon");
  }
});

// Xuất PDF hóa đơn
router.get("/hoadon/pdf/:maHD", isAdmin, async (req, res) => {
  const { maHD } = req.params;
  try {
    const hoadonResult = await query(
      `
      SELECT hd.*, kh.HoTenKH
      FROM HoaDon hd
      INNER JOIN KhachHang kh ON hd.MaKH = kh.MaKH
      WHERE hd.MaHD = @maHD
    `,
      { maHD }
    );

    const chitiethoadonResult = await query(
      `
      SELECT cthd.*, sp.TenSP
      FROM ChiTietHoaDon cthd
      INNER JOIN SanPham sp ON cthd.MaSP = sp.MaSP
      WHERE cthd.MaHD = @maHD
    `,
      { maHD }
    );

    if (hoadonResult.recordset.length === 0) {
      req.flash("error", "Hóa đơn không tồn tại!");
      return res.redirect("/admin/hoadon");
    }

    const hoadon = hoadonResult.recordset[0];
    const chitiethoadon = chitiethoadonResult.recordset;

    // Tạo PDF
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `HoaDon_${maHD}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Tiêu đề
    doc.fontSize(20).text(`HÓA ĐƠN #${hoadon.MaHD}`, { align: "center" });
    doc.fontSize(12).text("Tiệm Nail Diamond", { align: "center" });
    doc.text("Hẻm 300 Khóm 1, Phường 8, TP. Trà Vinh", { align: "center" });
    doc.text("Điện thoại: 0784265668", { align: "center" });
    doc.moveDown();

    // Thông tin hóa đơn
    doc.fontSize(12).text(`Khách Hàng: ${hoadon.HoTenKH}`);
    doc.text(`Mã Lịch Hẹn: ${hoadon.MaLH}`);
    doc.text(
      `Ngày Lập: ${new Date(hoadon.NgayLapHD).toLocaleDateString("vi-VN")}`
    );
    doc.text(
      `Phương Thức Thanh Toán: ${hoadon.PhuongThucThanhToan || "Chưa xác định"}`
    );
    doc.text(`Trạng Thái: ${hoadon.TrangThaiHD}`);
    doc.moveDown();

    // Bảng chi tiết
    doc.text("Chi Tiết Sản Phẩm", { underline: true });
    doc.moveDown(0.5);

    // Vẽ bảng thủ công
    const tableTop = doc.y;
    const itemWidth = [200, 100, 100, 100];
    const headers = ["Sản Phẩm", "Số Lượng", "Đơn Giá", "Thành Tiền"];
    let currentX = 50;

    // Header bảng
    doc.fontSize(10).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, currentX, tableTop, { width: itemWidth[i] });
      currentX += itemWidth[i];
    });
    doc.moveDown(0.5);

    // Vẽ đường kẻ ngang
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();
    doc.moveDown(0.5);

    // Nội dung bảng
    doc.font("Helvetica");
    chitiethoadon.forEach((item) => {
      currentX = 50;
      const rowTop = doc.y;
      doc.text(item.TenSP, currentX, rowTop, { width: itemWidth[0] });
      currentX += itemWidth[0];
      doc.text(item.SoLuong, currentX, rowTop, { width: itemWidth[1] });
      currentX += itemWidth[1];
      doc.text(item.DonGia.toFixed(2), currentX, rowTop, {
        width: itemWidth[2],
      });
      currentX += itemWidth[2];
      doc.text((item.SoLuong * item.DonGia).toFixed(2), currentX, rowTop, {
        width: itemWidth[3],
      });
      doc.moveDown(0.5);
    });

    // Tổng tiền
    doc.moveDown();
    doc
      .font("Helvetica-Bold")
      .text(`Tổng Tiền: ${hoadon.TongTien.toFixed(2)} VND`, {
        align: "right",
      });

    doc.end();
  } catch (err) {
    console.error("Lỗi xuất PDF hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi xuất PDF hóa đơn.");
    res.redirect("/admin/hoadon");
  }
});

// Routes cho ChiTietHoaDon
// Hiển thị danh sách chi tiết hóa đơn
router.get("/chitiethoadon", isAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT cthd.MaCTHD, cthd.SoLuong, cthd.DonGia, hd.MaHD, sp.TenSP
      FROM ChiTietHoaDon cthd
      INNER JOIN HoaDon hd ON cthd.MaHD = hd.MaHD
      INNER JOIN SanPham sp ON cthd.MaSP = sp.MaSP
    `);
    res.render("admin/chitiethoadon/chitiethoadon", {
      user: req.session.user,
      chitiethoadon: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách chi tiết hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách chi tiết hóa đơn.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm chi tiết hóa đơn
router.get("/chitiethoadon/add", isAdmin, async (req, res) => {
  try {
    const hoadon = await query("SELECT MaHD FROM HoaDon");
    const sanpham = await query("SELECT MaSP, TenSP FROM SanPham");
    res.render("admin/chitiethoadon/chitiethoadon_add", {
      user: req.session.user,
      hoadon: hoadon.recordset,
      sanpham: sanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu cho form chi tiết hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy dữ liệu.");
    res.redirect("/admin/chitiethoadon");
  }
});

// Xử lý thêm chi tiết hóa đơn
router.post("/chitiethoadon/add", isAdmin, async (req, res) => {
  const { maHD, maSP, soLuong, donGia } = req.body;
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!maHD || !maSP || isNaN(soLuong) || isNaN(donGia)) {
      req.flash("error", "Dữ liệu không hợp lệ!");
      return res.redirect("/admin/chitiethoadon/add");
    }
    if (soLuong < 1) {
      req.flash("error", "Số lượng phải lớn hơn 0!");
      return res.redirect("/admin/chitiethoadon/add");
    }
    if (donGia < 0) {
      req.flash("error", "Đơn giá không được âm!");
      return res.redirect("/admin/chitiethoadon/add");
    }

    // Kiểm tra hóa đơn và sản phẩm tồn tại
    const checkHD = await query("SELECT MaHD FROM HoaDon WHERE MaHD = @maHD", {
      maHD,
    });
    const checkSP = await query("SELECT MaSP FROM SanPham WHERE MaSP = @maSP", {
      maSP,
    });
    if (checkHD.recordset.length === 0 || checkSP.recordset.length === 0) {
      req.flash("error", "Hóa đơn hoặc sản phẩm không tồn tại!");
      return res.redirect("/admin/chitiethoadon/add");
    }

    await query(
      `
      INSERT INTO ChiTietHoaDon (MaHD, MaSP, SoLuong, DonGia)
      VALUES (@maHD, @maSP, @soLuong, @donGia)
    `,
      { maHD, maSP, soLuong: parseInt(soLuong), donGia: parseFloat(donGia) }
    );

    req.flash("success", "Thêm chi tiết hóa đơn thành công!");
    res.redirect("/admin/chitiethoadon");
  } catch (err) {
    console.error("Lỗi thêm chi tiết hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm chi tiết hóa đơn.");
    res.redirect("/admin/chitiethoadon/add");
  }
});

// Hiển thị form sửa chi tiết hóa đơn
router.get("/chitiethoadon/edit/:maCTHD", isAdmin, async (req, res) => {
  const { maCTHD } = req.params;
  try {
    const chitiethoadon = await query(
      "SELECT * FROM ChiTietHoaDon WHERE MaCTHD = @maCTHD",
      { maCTHD }
    );
    const hoadon = await query("SELECT MaHD FROM HoaDon");
    const sanpham = await query("SELECT MaSP, TenSP FROM SanPham");
    if (chitiethoadon.recordset.length === 0) {
      req.flash("error", "Chi tiết hóa đơn không tồn tại!");
      return res.redirect("/admin/chitiethoadon");
    }
    res.render("admin/chitiethoadon/chitiethoadon_edit", {
      user: req.session.user,
      chitiethoadon: chitiethoadon.recordset[0],
      hoadon: hoadon.recordset,
      sanpham: sanpham.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin chi tiết hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin chi tiết hóa đơn.");
    res.redirect("/admin/chitiethoadon");
  }
});

// Xử lý sửa chi tiết hóa đơn
router.post("/chitiethoadon/edit", isAdmin, async (req, res) => {
  const { maCTHD, maHD, maSP, soLuong, donGia } = req.body;
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!maCTHD || !maHD || !maSP || isNaN(soLuong) || isNaN(donGia)) {
      req.flash("error", "Dữ liệu không hợp lệ!");
      return res.redirect(`/admin/chitiethoadon/edit/${maCTHD}`);
    }
    if (soLuong < 1) {
      req.flash("error", "Số lượng phải lớn hơn 0!");
      return res.redirect(`/admin/chitiethoadon/edit/${maCTHD}`);
    }
    if (donGia < 0) {
      req.flash("error", "Đơn giá không được âm!");
      return res.redirect(`/admin/chitiethoadon/edit/${maCTHD}`);
    }

    // Kiểm tra hóa đơn và sản phẩm tồn tại
    const checkHD = await query("SELECT MaHD FROM HoaDon WHERE MaHD = @maHD", {
      maHD,
    });
    const checkSP = await query("SELECT MaSP FROM SanPham WHERE MaSP = @maSP", {
      maSP,
    });
    if (checkHD.recordset.length === 0 || checkSP.recordset.length === 0) {
      req.flash("error", "Hóa đơn hoặc sản phẩm không tồn tại!");
      return res.redirect(`/admin/chitiethoadon/edit/${maCTHD}`);
    }

    await query(
      `
      UPDATE ChiTietHoaDon
      SET MaHD = @maHD, MaSP = @maSP, SoLuong = @soLuong, DonGia = @donGia
      WHERE MaCTHD = @maCTHD
    `,
      {
        maCTHD,
        maHD,
        maSP,
        soLuong: parseInt(soLuong),
        donGia: parseFloat(donGia),
      }
    );

    req.flash("success", "Sửa chi tiết hóa đơn thành công!");
    res.redirect("/admin/chitiethoadon");
  } catch (err) {
    console.error("Lỗi sửa chi tiết hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa chi tiết hóa đơn.");
    res.redirect(`/admin/chitiethoadon/edit/${maCTHD}`);
  }
});

// Xử lý xóa chi tiết hóa đơn
router.post("/chitiethoadon/delete", isAdmin, async (req, res) => {
  const { maCTHD } = req.body;
  try {
    // Kiểm tra ràng buộc khóa ngoại
    const check = await query(
      `
      SELECT * FROM DanhGia WHERE MaCTHD = @maCTHD
    `,
      { maCTHD }
    );
    if (check.recordset.length > 0) {
      req.flash(
        "error",
        "Không thể xóa chi tiết hóa đơn vì đã có đánh giá liên quan!"
      );
      return res.redirect("/admin/chitiethoadon");
    }

    await query("DELETE FROM ChiTietHoaDon WHERE MaCTHD = @maCTHD", { maCTHD });
    req.flash("success", "Xóa chi tiết hóa đơn thành công!");
    res.redirect("/admin/chitiethoadon");
  } catch (err) {
    console.error("Lỗi xóa chi tiết hóa đơn:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa chi tiết hóa đơn.");
    res.redirect("/admin/chitiethoadon");
  }
});

// Routes cho DanhGia
// Hiển thị danh sách đánh giá
router.get("/danhgia", isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const result = await query(
      `
      SELECT dg.MaDG, dg.DiemDG, dg.BinhLuan, dg.ChatLuong, dg.ThaiDo, dg.NgayDG, kh.HoTenKH, cthd.MaCTHD
      FROM DanhGia dg
      INNER JOIN KhachHang kh ON dg.MaKH = kh.MaKH
      INNER JOIN ChiTietHoaDon cthd ON dg.MaCTHD = cthd.MaCTHD
      ORDER BY dg.NgayDG DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM DanhGia
    `);
    const totalReviews = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalReviews / pageSize);

    res.render("admin/danhgia/danhgia", {
      user: req.session.user,
      danhgia: result.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách đánh giá:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách đánh giá.");
    res.redirect("/admin");
  }
});

// Hiển thị form thêm đánh giá
router.get("/danhgia/add", isAdmin, async (req, res) => {
  try {
    const khachhang = await query("SELECT MaKH, HoTenKH FROM KhachHang");
    const chitiethoadon = await query("SELECT MaCTHD FROM ChiTietHoaDon");
    res.render("admin/danhgia/danhgia_add", {
      user: req.session.user,
      khachhang: khachhang.recordset,
      chitiethoadon: chitiethoadon.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu cho form đánh giá:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy dữ liệu.");
    res.redirect("/admin/danhgia");
  }
});

// Xử lý thêm đánh giá
router.post("/danhgia/add", isAdmin, async (req, res) => {
  const { maKH, maCTHD, diemDG, binhLuan, chatLuong, thaiDo, ngayDG } =
    req.body;
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!maKH || !maCTHD || isNaN(diemDG) || !ngayDG) {
      req.flash("error", "Dữ liệu không hợp lệ!");
      return res.redirect("/admin/danhgia/add");
    }
    const diem = parseInt(diemDG);
    if (diem < 1 || diem > 5) {
      req.flash("error", "Điểm đánh giá phải từ 1 đến 5!");
      return res.redirect("/admin/danhgia/add");
    }
    if (binhLuan && binhLuan.length > 500) {
      req.flash("error", "Bình luận không được vượt quá 500 ký tự!");
      return res.redirect("/admin/danhgia/add");
    }
    // Kiểm tra định dạng datetime
    if (isNaN(Date.parse(ngayDG))) {
      req.flash("error", "Ngày đánh giá không hợp lệ!");
      return res.redirect("/admin/danhgia/add");
    }

    // Kiểm tra khách hàng và chi tiết hóa đơn tồn tại
    const checkKH = await query(
      "SELECT MaKH FROM KhachHang WHERE MaKH = @maKH",
      {
        maKH,
      }
    );
    const checkCTHD = await query(
      "SELECT MaCTHD FROM ChiTietHoaDon WHERE MaCTHD = @maCTHD",
      { maCTHD }
    );
    if (checkKH.recordset.length === 0 || checkCTHD.recordset.length === 0) {
      req.flash("error", "Khách hàng hoặc chi tiết hóa đơn không tồn tại!");
      return res.redirect("/admin/danhgia/add");
    }

    await query(
      `
      INSERT INTO DanhGia (MaKH, MaCTHD, DiemDG, BinhLuan, ChatLuong, ThaiDo, NgayDG)
      VALUES (@maKH, @maCTHD, @diemDG, @binhLuan, @chatLuong, @thaiDo, @ngayDG)
    `,
      { maKH, maCTHD, diemDG: diem, binhLuan, chatLuong, thaiDo, ngayDG }
    );

    req.flash("success", "Thêm đánh giá thành công!");
    res.redirect("/admin/danhgia");
  } catch (err) {
    console.error("Lỗi thêm đánh giá:", err);
    req.flash("error", "Có lỗi xảy ra khi thêm đánh giá.");
    res.redirect("/admin/danhgia/add");
  }
});

// Hiển thị form sửa đánh giá
router.get("/danhgia/edit/:maDG", isAdmin, async (req, res) => {
  const { maDG } = req.params;
  try {
    const danhgia = await query("SELECT * FROM DanhGia WHERE MaDG = @maDG", {
      maDG,
    });
    const khachhang = await query("SELECT MaKH, HoTenKH FROM KhachHang");
    const chitiethoadon = await query("SELECT MaCTHD FROM ChiTietHoaDon");
    if (danhgia.recordset.length === 0) {
      req.flash("error", "Đánh giá không tồn tại!");
      return res.redirect("/admin/danhgia");
    }
    res.render("admin/danhgia/danhgia_edit", {
      user: req.session.user,
      danhgia: danhgia.recordset[0],
      khachhang: khachhang.recordset,
      chitiethoadon: chitiethoadon.recordset,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy thông tin đánh giá:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy thông tin đánh giá.");
    res.redirect("/admin/danhgia");
  }
});

// Xử lý sửa đánh giá
router.post("/danhgia/edit", isAdmin, async (req, res) => {
  const { maDG, maKH, maCTHD, diemDG, binhLuan, chatLuong, thaiDo, ngayDG } =
    req.body;
  try {
    // Kiểm tra dữ liệu đầu vào
    if (!maDG || !maKH || !maCTHD || isNaN(diemDG) || !ngayDG) {
      req.flash("error", "Dữ liệu không hợp lệ!");
      return res.redirect(`/admin/danhgia/edit/${maDG}`);
    }
    const diem = parseInt(diemDG);
    if (diem < 1 || diem > 5) {
      req.flash("error", "Điểm đánh giá phải từ 1 đến 5!");
      return res.redirect(`/admin/danhgia/edit/${maDG}`);
    }
    if (binhLuan && binhLuan.length > 500) {
      req.flash("error", "Bình luận không được vượt quá 500 ký tự!");
      return res.redirect(`/admin/danhgia/edit/${maDG}`);
    }
    if (isNaN(Date.parse(ngayDG))) {
      req.flash("error", "Ngày đánh giá không hợp lệ!");
      return res.redirect(`/admin/danhgia/edit/${maDG}`);
    }

    // Kiểm tra khách hàng và chi tiết hóa đơn tồn tại
    const checkKH = await query(
      "SELECT MaKH FROM KhachHang WHERE MaKH = @maKH",
      {
        maKH,
      }
    );
    const checkCTHD = await query(
      "SELECT MaCTHD FROM ChiTietHoaDon WHERE MaCTHD = @maCTHD",
      { maCTHD }
    );
    if (checkKH.recordset.length === 0 || checkCTHD.recordset.length === 0) {
      req.flash("error", "Khách hàng hoặc chi tiết hóa đơn không tồn tại!");
      return res.redirect(`/admin/danhgia/edit/${maDG}`);
    }

    await query(
      `
      UPDATE DanhGia
      SET MaKH = @maKH, MaCTHD = @maCTHD, DiemDG = @diemDG, BinhLuan = @binhLuan, 
          ChatLuong = @chatLuong, ThaiDo = @thaiDo, NgayDG = @ngayDG
      WHERE MaDG = @maDG
    `,
      { maDG, maKH, maCTHD, diemDG: diem, binhLuan, chatLuong, thaiDo, ngayDG }
    );

    req.flash("success", "Sửa đánh giá thành công!");
    res.redirect("/admin/danhgia");
  } catch (err) {
    console.error("Lỗi sửa đánh giá:", err);
    req.flash("error", "Có lỗi xảy ra khi sửa đánh giá.");
    res.redirect(`/admin/danhgia/edit/${maDG}`);
  }
});

// Xử lý xóa đánh giá
router.post("/danhgia/delete", isAdmin, async (req, res) => {
  const { maDG } = req.body;
  try {
    await query("DELETE FROM DanhGia WHERE MaDG = @maDG", { maDG });
    req.flash("success", "Xóa đánh giá thành công!");
    res.redirect("/admin/danhgia");
  } catch (err) {
    console.error("Lỗi xóa đánh giá:", err);
    req.flash("error", "Có lỗi xảy ra khi xóa đánh giá.");
    res.redirect("/admin/danhgia");
  }
});

// Route thống kê
router.get("/thongke", isAdmin, async (req, res) => {
  try {
    // Thống kê dịch vụ được đặt nhiều nhất
    const topServices = await query(`
      SELECT TOP 5 s.TenSP, COUNT(lh.MaSP) as SoLanDat
      FROM LichHen lh
      INNER JOIN SanPham s ON lh.MaSP = s.MaSP
      GROUP BY s.TenSP
      ORDER BY SoLanDat DESC
    `);

    // Thống kê lịch hẹn trong ngày
    const dailyAppointments = await query(`
      SELECT COUNT(*) as SoLuong
      FROM LichHen
      WHERE CAST(NgayHen AS DATE) = CAST(GETDATE() AS DATE)
    `);

    // Thống kê lịch hẹn trong tháng
    const monthlyAppointments = await query(`
      SELECT COUNT(*) as SoLuong
      FROM LichHen
      WHERE YEAR(NgayHen) = YEAR(GETDATE())
      AND MONTH(NgayHen) = MONTH(GETDATE())
    `);

    // Thống kê lịch hẹn trong năm
    const yearlyAppointments = await query(`
      SELECT COUNT(*) as SoLuong
      FROM LichHen
      WHERE YEAR(NgayHen) = YEAR(GETDATE())
    `);

    // Thống kê lịch nghỉ của nhân viên
    const employeeLeaves = await query(`
      SELECT n.HoTenNV, COUNT(np.MaNghiPhep) as SoNgayNghi
      FROM NhanVien n
      LEFT JOIN NghiPhep np ON n.MaNV = np.MaNV
      WHERE np.NgayNghi IS NULL OR YEAR(np.NgayNghi) = YEAR(GETDATE())
      GROUP BY n.HoTenNV
    `);

    // Thống kê khách hàng dùng dịch vụ nhiều nhất
    const topCustomers = await query(`
      SELECT TOP 5 k.HoTenKH, COUNT(lh.MaKH) as SoLanDat
      FROM LichHen lh
      INNER JOIN KhachHang k ON lh.MaKH = k.MaKH
      GROUP BY k.HoTenKH
      ORDER BY SoLanDat DESC
    `);

    // Thống kê doanh thu trong ngày
    const dailyRevenue = await query(`
      SELECT SUM(hd.TongTien) as DoanhThu
      FROM HoaDon hd
      WHERE CAST(hd.NgayLapHD AS DATE) = CAST(GETDATE() AS DATE)
    `);

    // Thống kê doanh thu trong tháng
    const monthlyRevenue = await query(`
      SELECT SUM(hd.TongTien) as DoanhThu
      FROM HoaDon hd
      WHERE YEAR(hd.NgayLapHD) = YEAR(GETDATE())
      AND MONTH(hd.NgayLapHD) = MONTH(GETDATE())
    `);

    // Thống kê doanh thu trong năm
    const yearlyRevenue = await query(`
      SELECT SUM(hd.TongTien) as DoanhThu
      FROM HoaDon hd
      WHERE YEAR(hd.NgayLapHD) = YEAR(GETDATE())
    `);

    res.render("admin/thongke/thongke", {
      user: req.session.user,
      topServices: topServices.recordset,
      dailyAppointments: dailyAppointments.recordset[0].SoLuong,
      monthlyAppointments: monthlyAppointments.recordset[0].SoLuong,
      yearlyAppointments: yearlyAppointments.recordset[0].SoLuong,
      employeeLeaves: employeeLeaves.recordset,
      topCustomers: topCustomers.recordset,
      dailyRevenue: dailyRevenue.recordset[0].DoanhThu || 0,
      monthlyRevenue: monthlyRevenue.recordset[0].DoanhThu || 0,
      yearlyRevenue: yearlyRevenue.recordset[0].DoanhThu || 0,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  } catch (err) {
    console.error("Lỗi lấy dữ liệu thống kê:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy dữ liệu thống kê.");
    res.redirect("/admin");
  }
});

// Route xuất Excel
router.get("/thongke/export-excel", isAdmin, async (req, res) => {
  try {
    console.log("Bắt đầu xử lý /admin/thongke/export-excel");

    // Kiểm tra quyền admin
    if (!req.session.user || req.session.user.roleId !== 3) {
      console.log("Không có quyền admin hoặc chưa đăng nhập");
      req.flash("error", "Bạn không có quyền truy cập hoặc chưa đăng nhập!");
      return res.redirect("/dangnhap");
    }

    // Truy vấn dữ liệu
    const topServices = await query(`
      SELECT TOP 5 s.TenSP, COUNT(lh.MaSP) as SoLanDat
      FROM LichHen lh
      INNER JOIN SanPham s ON lh.MaSP = s.MaSP
      GROUP BY s.TenSP
      ORDER BY SoLanDat DESC
    `);
    console.log("topServices:", topServices.recordset);

    const dailyAppointments = await query(`
      SELECT COUNT(*) as SoLuong
      FROM LichHen
      WHERE CAST(NgayHen AS DATE) = CAST(GETDATE() AS DATE)
    `);
    console.log("dailyAppointments:", dailyAppointments.recordset);

    const monthlyAppointments = await query(`
      SELECT COUNT(*) as SoLuong
      FROM LichHen
      WHERE YEAR(NgayHen) = YEAR(GETDATE())
      AND MONTH(NgayHen) = MONTH(GETDATE())
    `);
    console.log("monthlyAppointments:", monthlyAppointments.recordset);

    const yearlyAppointments = await query(`
      SELECT COUNT(*) as SoLuong
      FROM LichHen
      WHERE YEAR(NgayHen) = YEAR(GETDATE())
    `);
    console.log("yearlyAppointments:", yearlyAppointments.recordset);

    const employeeLeaves = await query(`
      SELECT n.HoTenNV, COUNT(np.MaNghiPhep) as SoNgayNghi
      FROM NhanVien n
      LEFT JOIN NghiPhep np ON n.MaNV = np.MaNV
      WHERE np.NgayNghi IS NULL OR YEAR(np.NgayNghi) = YEAR(GETDATE())
      GROUP BY n.HoTenNV
    `);
    console.log("employeeLeaves:", employeeLeaves.recordset);

    const topCustomers = await query(`
      SELECT TOP 5 k.HoTenKH, COUNT(lh.MaKH) as SoLanDat
      FROM LichHen lh
      INNER JOIN KhachHang k ON lh.MaKH = k.MaKH
      GROUP BY k.HoTenKH
      ORDER BY SoLanDat DESC
    `);
    console.log("topCustomers:", topCustomers.recordset);

    const dailyRevenue = await query(`
      SELECT SUM(hd.TongTien) as DoanhThu
      FROM HoaDon hd
      WHERE CAST(hd.NgayLapHD AS DATE) = CAST(GETDATE() AS DATE)
    `);
    console.log("dailyRevenue:", dailyRevenue.recordset);

    const monthlyRevenue = await query(`
      SELECT SUM(hd.TongTien) as DoanhThu
      FROM HoaDon hd
      WHERE YEAR(hd.NgayLapHD) = YEAR(GETDATE())
      AND MONTH(hd.NgayLapHD) = MONTH(GETDATE())
    `);
    console.log("monthlyRevenue:", monthlyRevenue.recordset);

    const yearlyRevenue = await query(`
      SELECT SUM(hd.TongTien) as DoanhThu
      FROM HoaDon hd
      WHERE YEAR(hd.NgayLapHD) = YEAR(GETDATE())
    `);
    console.log("yearlyRevenue:", yearlyRevenue.recordset);

    // Tạo workbook Excel
    const workbook = new exceljs.Workbook();
    workbook.creator = "Tiệm Nail Diamond";
    workbook.created = new Date();

    // Worksheet: Dịch vụ được đặt nhiều nhất
    const servicesSheet = workbook.addWorksheet("Dịch Vụ Được Đặt Nhiều Nhất");
    servicesSheet.columns = [
      { header: "Tên Dịch Vụ", key: "TenSP", width: 30 },
      { header: "Số Lần Đặt", key: "SoLanDat", width: 15 },
    ];
    topServices.recordset.forEach((service) => {
      servicesSheet.addRow({
        TenSP: service.TenSP,
        SoLanDat: service.SoLanDat,
      });
    });

    // Worksheet: Thống kê lịch hẹn
    const appointmentsSheet = workbook.addWorksheet("Thống Kê Lịch Hẹn");
    appointmentsSheet.columns = [
      { header: "Thời Gian", key: "ThoiGian", width: 20 },
      { header: "Số Lượng", key: "SoLuong", width: 15 },
    ];
    appointmentsSheet.addRows([
      {
        ThoiGian: "Trong Ngày",
        SoLuong: dailyAppointments.recordset[0].SoLuong,
      },
      {
        ThoiGian: "Trong Tháng",
        SoLuong: monthlyAppointments.recordset[0].SoLuong,
      },
      {
        ThoiGian: "Trong Năm",
        SoLuong: yearlyAppointments.recordset[0].SoLuong,
      },
    ]);

    // Worksheet: Lịch nghỉ nhân viên
    const leavesSheet = workbook.addWorksheet("Lịch Nghỉ Nhân Viên");
    leavesSheet.columns = [
      { header: "Tên Nhân Viên", key: "HoTenNV", width: 30 },
      { header: "Số Ngày Nghỉ", key: "SoNgayNghi", width: 15 },
    ];
    employeeLeaves.recordset.forEach((leave) => {
      leavesSheet.addRow({
        HoTenNV: leave.HoTenNV,
        SoNgayNghi: leave.SoNgayNghi,
      });
    });

    // Worksheet: Khách hàng đặt nhiều nhất
    const customersSheet = workbook.addWorksheet("Khách Hàng Đặt Nhiều Nhất");
    customersSheet.columns = [
      { header: "Tên Khách Hàng", key: "HoTenKH", width: 30 },
      { header: "Số Lần Đặt", key: "SoLanDat", width: 15 },
    ];
    topCustomers.recordset.forEach((customer) => {
      customersSheet.addRow({
        HoTenKH: customer.HoTenKH,
        SoLanDat: customer.SoLanDat,
      });
    });

    // Worksheet: Doanh thu
    const revenueSheet = workbook.addWorksheet("Thống Kê Doanh Thu");
    revenueSheet.columns = [
      { header: "Thời Gian", key: "ThoiGian", width: 20 },
      { header: "Doanh Thu (VND)", key: "DoanhThu", width: 20 },
    ];
    revenueSheet.addRows([
      {
        ThoiGian: "Trong Ngày",
        DoanhThu: dailyRevenue.recordset[0].DoanhThu || 0,
      },
      {
        ThoiGian: "Trong Tháng",
        DoanhThu: monthlyRevenue.recordset[0].DoanhThu || 0,
      },
      {
        ThoiGian: "Trong Năm",
        DoanhThu: yearlyRevenue.recordset[0].DoanhThu || 0,
      },
    ]);

    // Định dạng header
    [
      servicesSheet,
      appointmentsSheet,
      leavesSheet,
      customersSheet,
      revenueSheet,
    ].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD8BEA2" },
      };
    });

    // Thiết lập header để tải file
    res.status(200);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ThongKe_TiemNailDiamond.xlsx"
    );

    console.log("Gửi file Excel");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Lỗi chi tiết trong /admin/thongke/export-excel:", err);
    req.flash("error", "Có lỗi xảy ra khi xuất file Excel: " + err.message);
    res.redirect("/admin/thongke");
  }
});

// Route danh sách yêu cầu nghỉ phép
router.get("/nghiphep", isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const leaveRequests = await query(
      `
      SELECT np.MaNghiPhep, np.MaNV, np.NgayNghi, np.LyDo, np.TrangThaiNghi, n.HoTenNV, n.EmailNV
      FROM NghiPhep np
      INNER JOIN NhanVien n ON np.MaNV = n.MaNV
      ORDER BY np.NgayNghi DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
      { offset, pageSize }
    );

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM NghiPhep
    `);
    const totalLeaves = countResult.recordset[0].total;
    const totalPages = Math.ceil(totalLeaves / pageSize);

    res.render("admin/nghiphep/nghiphep", {
      user: req.session.user,
      leaveRequests: leaveRequests.recordset,
      message: req.flash("success") || req.flash("error"),
      csrfToken: res.locals.csrfToken,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error("Lỗi lấy danh sách yêu cầu nghỉ phép:", err);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách yêu cầu nghỉ phép.");
    res.redirect("/admin");
  }
});

// Route duyệt yêu cầu nghỉ phép
router.post("/nghiphep/approve", isAdmin, async (req, res) => {
  try {
    const { maNghiPhep } = req.body;

    // Cập nhật trạng thái thành Đã duyệt
    await query(
      `
      UPDATE NghiPhep
      SET TrangThaiNghi = N'Đã duyệt'
      WHERE MaNghiPhep = @MaNghiPhep
    `,
      { MaNghiPhep: maNghiPhep }
    );

    req.flash("success", "Duyệt yêu cầu nghỉ phép thành công!");
    res.redirect("/admin/nghiphep");
  } catch (err) {
    console.error("Lỗi khi duyệt yêu cầu nghỉ phép:", err);
    req.flash("error", "Có lỗi xảy ra khi duyệt yêu cầu nghỉ phép.");
    res.redirect("/admin/nghiphep");
  }
});

// Route từ chối yêu cầu nghỉ phép
router.post("/nghiphep/reject", isAdmin, async (req, res) => {
  try {
    const { maNghiPhep } = req.body;

    // Lấy thông tin yêu cầu nghỉ để gửi email
    const leaveRequest = await query(
      `
      SELECT np.NgayNghi, np.LyDo, n.HoTenNV, n.EmailNV
      FROM NghiPhep np
      INNER JOIN NhanVien n ON np.MaNV = n.MaNV
      WHERE np.MaNghiPhep = @MaNghiPhep
    `,
      { MaNghiPhep: maNghiPhep }
    );

    if (leaveRequest.recordset.length === 0) {
      req.flash("error", "Không tìm thấy yêu cầu nghỉ phép!");
      return res.redirect("/admin/nghiphep");
    }

    const { NgayNghi, LyDo, HoTenNV, EmailNV } = leaveRequest.recordset[0];

    // Cập nhật trạng thái thành Từ chối
    await query(
      `
      UPDATE NghiPhep
      SET TrangThaiNghi = N'Từ chối'
      WHERE MaNghiPhep = @MaNghiPhep
    `,
      { MaNghiPhep: maNghiPhep }
    );

    // Gửi email thông báo từ chối đến nhân viên
    const mailOptions = {
      from: "your-email@gmail.com", // Thay bằng email của bạn
      to: EmailNV,
      subject: "Thông Báo Từ Chối Yêu Cầu Nghỉ Phép - Tiệm Nail Diamond",
      html: `
        <h3>Yêu cầu xin nghỉ bị từ chối</h3>
        <p><strong>Nhân viên:</strong> ${HoTenNV}</p>
        <p><strong>Ngày nghỉ:</strong> ${new Date(NgayNghi).toLocaleDateString(
          "vi-VN"
        )}</p>
        <p><strong>Lý do xin nghỉ:</strong> ${LyDo}</p>
        <p>Yêu cầu xin nghỉ của bạn không được chủ tiệm đồng ý. Vui lòng liên hệ để biết thêm chi tiết.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    req.flash("success", "Từ chối yêu cầu nghỉ phép thành công!");
    res.redirect("/admin/nghiphep");
  } catch (err) {
    console.error("Lỗi khi từ chối yêu cầu nghỉ phép:", err);
    req.flash("error", "Có lỗi xảy ra khi từ chối yêu cầu nghỉ phép.");
    res.redirect("/admin/nghiphep");
  }
});

module.exports = router;
