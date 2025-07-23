const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const sql = require("mssql");
const { query, emailConfig } = require("../config/db");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: emailConfig.user, pass: emailConfig.pass },
});

const verificationCodes = {};

// Route đăng ký
router.get("/dangky", (req, res) => {
  res.render("dangky", {
    user: req.session.user || null,
    message: req.flash("error") || req.flash("success"),
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/dangky", async (req, res) => {
  const { fullname, email, phone, password, _csrf } = req.body;

  if (!fullname || !email || !phone || !password) {
    req.flash("error", "Thiếu thông tin cần thiết.");
    return res.redirect("/dangky");
  }

  try {
    const taiKhoanCheck = await query(
      "SELECT * FROM TaiKhoan WHERE TenTK = @email",
      { email }
    );
    if (taiKhoanCheck.recordset.length > 0) {
      req.flash("error", "Email đã được sử dụng trong hệ thống!");
      return res.redirect("/dangky");
    }

    const result = await query(
      "SELECT * FROM KhachHang WHERE EmailKH = @email",
      { email }
    );
    if (result.recordset.length > 0) {
      req.flash("error", "Email đã được đăng ký!");
      return res.redirect("/dangky");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = { code, expires: Date.now() + 5 * 60 * 1000 };

    const hashedPassword = await bcrypt.hash(password, 10);
    req.session.userData = { fullname, email, phone, hashedPassword };

    const mailOptions = {
      from: emailConfig.user,
      to: email,
      subject: "Mã xác nhận đăng ký",
      text: `[Mã xác nhận đăng ký]

Xin chào ${fullname},

Cảm ơn bạn đã đăng ký. Mã xác nhận của bạn là: ${code}

Mã này có hiệu lực trong 5 phút.
Vui lòng không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn thông tin.

Trân trọng,
Tiệm Nail Diamond`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email đã được gửi đến:", email);
    res.render("verify", {
      user: req.session.user || null,
      email,
      message: null,
      csrfToken: res.locals.csrfToken,
    });
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    req.flash("error", "Có lỗi xảy ra khi gửi email.");
    return res.redirect("/dangky");
  }
});

// Route xác minh đăng ký
router.get("/verify", (req, res) => {
  const { email, redirect } = req.query;
  if (!email) {
    req.flash("error", "Vui lòng cung cấp email!");
    return res.redirect("/dangky");
  }
  res.render("verify", {
    user: req.session.user || null,
    email,
    redirect,
    message: req.flash("error") || req.flash("success"),
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/verify", async (req, res) => {
  const { email, code, _csrf, redirect } = req.body;

  const storedData = verificationCodes[email];
  if (!storedData || storedData.expires < Date.now()) {
    delete verificationCodes[email];
    req.flash("error", "Mã xác nhận không tồn tại hoặc đã hết hạn!");
    return res.render("verify", {
      user: req.session.user || null,
      email,
      redirect,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  }

  if (storedData.code !== code) {
    req.flash("error", "Mã xác nhận không đúng!");
    return res.render("verify", {
      user: req.session.user || null,
      email,
      redirect,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  }

  const { fullname, phone, hashedPassword } = req.session.userData || {};
  if (!fullname || !phone || !hashedPassword) {
    req.flash("error", "Thông tin không đầy đủ. Vui lòng đăng ký lại.");
    return res.redirect("/dangky");
  }

  try {
    const taiKhoanResult = await query(
      "INSERT INTO TaiKhoan (TenTK, MatKhau, MaQ) OUTPUT INSERTED.MaTK VALUES (@email, @password, @maQ)",
      { email, password: hashedPassword, maQ: 1 }
    );
    const maTK = taiKhoanResult.recordset[0].MaTK;

    await query(
      "INSERT INTO KhachHang (MaTK, HoTenKH, EmailKH, SoDienThoaiKH, NgayTaoKH) VALUES (@maTK, @fullname, @email, @phone, @ngayTao)",
      { maTK, fullname, email, phone, ngayTao: new Date() }
    );

    req.session.user = {
      id: maTK,
      username: email,
      HoTenKH: fullname,
    };
    delete verificationCodes[email];
    delete req.session.userData;
    req.flash("success", "Đăng ký thành công!");
    const redirectUrl = redirect || "/trangchu";
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error inserting user:", error);
    req.flash("error", "Có lỗi xảy ra khi lưu thông tin.");
    res.render("verify", {
      user: req.session.user || null,
      email,
      redirect,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  }
});

// Route quên mật khẩu
router.get("/quenmatkhau", (req, res) => {
  res.render("quenmatkhau", {
    user: req.session.user || null,
    message: req.flash("error") || req.flash("success"),
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
      "SELECT k.HoTenKH, t.MaTK FROM KhachHang k INNER JOIN TaiKhoan t ON k.MaTK = t.MaTK WHERE k.EmailKH = @email",
      { email }
    );

    if (result.recordset.length === 0) {
      req.flash("error", "Email không tồn tại trong hệ thống!");
      return res.redirect("/quenmatkhau");
    }

    const { HoTenKH, MaTK } = result.recordset[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = {
      code,
      expires: Date.now() + 5 * 60 * 1000,
      MaTK,
    };

    const mailOptions = {
      from: emailConfig.user,
      to: email,
      subject: "Mã xác nhận đặt lại mật khẩu",
      text: `[Mã xác nhận đặt lại mật khẩu]

Xin chào ${HoTenKH},

Cảm ơn bạn đã yêu cầu đặt lại mật khẩu. Mã xác nhận của bạn là: ${code}

Mã này có hiệu lực trong 5 phút.
Vui lòng không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn thông tin.

Trân trọng,
Tiệm Nail Diamond`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email đặt lại mật khẩu đã được gửi đến:", email);
    res.render("verify-email", {
      user: req.session.user || null,
      email,
      message: null,
      csrfToken: res.locals.csrfToken,
    });
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    req.flash("error", "Có lỗi xảy ra khi gửi email.");
    return res.redirect("/quenmatkhau");
  }
});

// Route xác minh email (quên mật khẩu)
router.get("/verify-email", (req, res) => {
  const { email } = req.query;
  if (!email) {
    req.flash("error", "Vui lòng cung cấp email!");
    return res.redirect("/quenmatkhau");
  }
  res.render("verify-email", {
    user: req.session.user || null,
    email,
    message: req.flash("error") || req.flash("success"),
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/verify-email", async (req, res) => {
  const { email, code, _csrf } = req.body;

  const storedData = verificationCodes[email];
  if (!storedData || storedData.expires < Date.now()) {
    delete verificationCodes[email];
    req.flash("error", "Mã xác nhận không tồn tại hoặc đã hết hạn!");
    return res.render("verify-email", {
      user: req.session.user || null,
      email,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  }

  if (storedData.code !== code) {
    req.flash("error", "Mã xác nhận không đúng!");
    return res.render("verify-email", {
      user: req.session.user || null,
      email,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  }

  req.session.resetPasswordData = { email, MaTK: storedData.MaTK };
  delete verificationCodes[email];
  res.render("reset-password", {
    user: req.session.user || null,
    email,
    message: null,
    csrfToken: res.locals.csrfToken,
  });
});

// Route đặt lại mật khẩu
router.get("/reset-password", (req, res) => {
  const { email } = req.query;
  if (
    !email ||
    !req.session.resetPasswordData ||
    req.session.resetPasswordData.email !== email
  ) {
    req.flash("error", "Yêu cầu không hợp lệ. Vui lòng thử lại!");
    return res.redirect("/quenmatkhau");
  }
  res.render("reset-password", {
    user: req.session.user || null,
    email,
    message: req.flash("error") || req.flash("success"),
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/reset-password", async (req, res) => {
  const { email, password, _csrf } = req.body;

  const resetData = req.session.resetPasswordData || {};
  if (!resetData.email || resetData.email !== email || !resetData.MaTK) {
    req.flash("error", "Yêu cầu không hợp lệ. Vui lòng thử lại!");
    return res.redirect("/quenmatkhau");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await query("UPDATE TaiKhoan SET MatKhau = @password WHERE MaTK = @maTK", {
      password: hashedPassword,
      maTK: resetData.MaTK,
    });

    // Truy vấn thông tin người dùng để thiết lập session
    const result = await query(
      "SELECT k.HoTenKH, t.MaTK, t.TenTK, t.MaQ, q.TenQ FROM KhachHang k INNER JOIN TaiKhoan t ON k.MaTK = t.MaTK INNER JOIN Quyen q ON t.MaQ = q.MaQ WHERE k.EmailKH = @email",
      { email }
    );

    if (result.recordset.length === 0) {
      req.flash("error", "Không tìm thấy thông tin người dùng!");
      return res.redirect("/quenmatkhau");
    }

    const user = result.recordset[0];
    req.session.user = {
      id: user.MaTK,
      username: user.TenTK,
      HoTenKH: user.HoTenKH,
      roleId: user.MaQ,
      roleName: user.TenQ,
    };
    console.log("Session user after reset password:", req.session.user);

    delete req.session.resetPasswordData;
    req.flash("success", "Đặt lại mật khẩu thành công!");
    res.redirect("/trangchu");
  } catch (error) {
    console.error("Error resetting password:", error);
    req.flash("error", "Có lỗi xảy ra khi đặt lại mật khẩu.");
    res.render("reset-password", {
      user: req.session.user || null,
      email,
      message: req.flash("error"),
      csrfToken: res.locals.csrfToken,
    });
  }
});

// Route đăng nhập
router.get("/dangnhap", (req, res) => {
  const { redirect } = req.query;
  res.render("dangnhap", {
    user: req.session.user || null,
    message: req.flash("error") || req.flash("success"),
    redirect: redirect || "",
    csrfToken: res.locals.csrfToken,
  });
});

router.post("/dangnhap", async (req, res) => {
  const { username, password, redirect, _csrf } = req.body;
  console.log("Yêu cầu đăng nhập:", { username, redirect });
  if (!username || !password) {
    req.flash("error", "Vui lòng nhập tên đăng nhập và mật khẩu!");
    return res.redirect(
      redirect
        ? `/dangnhap?redirect=${encodeURIComponent(redirect)}`
        : "/dangnhap"
    );
  }
  try {
    const request = new sql.Request();
    request.input("username", sql.NVarChar, username);
    const result = await request.query(
      `SELECT t.MaTK, t.TenTK, t.MatKhau, t.MaQ, q.TenQ, k.MaKH, k.HoTenKH, k.EmailKH, k.SoDienThoaiKH, nv.MaNV, nv.HoTenNV, nv.EmailNV, nv.SoDienThoaiNV
       FROM TaiKhoan t
       LEFT JOIN KhachHang k ON k.MaTK = t.MaTK
       LEFT JOIN NhanVien nv ON nv.MaTK = t.MaTK
       INNER JOIN Quyen q ON t.MaQ = q.MaQ
       WHERE t.TenTK = @username`
    );
    console.log("Kết quả truy vấn:", result.recordset);
    if (result.recordset.length === 0) {
      req.flash("error", "Tên đăng nhập không tồn tại!");
      return res.redirect(
        redirect
          ? `/dangnhap?redirect=${encodeURIComponent(redirect)}`
          : "/dangnhap"
      );
    }
    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.MatKhau);
    console.log("Mật khẩu khớp:", match);
    if (!match) {
      req.flash("error", "Mật khẩu không đúng!");
      return res.redirect(
        redirect
          ? `/dangnhap?redirect=${encodeURIComponent(redirect)}`
          : "/dangnhap"
      );
    }
    req.session.user = {
      id: user.MaTK,
      username: user.TenTK,
      roleId: user.MaQ,
      roleName: user.TenQ,
      MaKH: user.MaKH,
      HoTenKH: user.HoTenKH,
      EmailKH: user.EmailKH,
      SoDienThoaiKH: user.SoDienThoaiKH,
      MaNV: user.MaNV,
      HoTenNV: user.HoTenNV,
      EmailNV: user.EmailNV,
      SoDienThoaiNV: user.SoDienThoaiNV,
    };
    console.log("Session user:", req.session.user);
    req.flash("success", "Đăng nhập thành công!");
    let redirectUrl;
    if (user.MaQ === 3) {
      redirectUrl = "/admin"; // Quyền Admin
    } else if (user.MaQ === 2) {
      redirectUrl = "/nhanvien"; // Quyền Nhân viên
    } else {
      redirectUrl = redirect || "/trangchu"; // Quyền Khách hàng
    }
    console.log("Chuyển hướng đến:", redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    req.flash("error", "Có lỗi xảy ra khi đăng nhập.");
    res.redirect(
      redirect
        ? `/dangnhap?redirect=${encodeURIComponent(redirect)}`
        : "/dangnhap"
    );
  }
});

// Route đăng xuất
router.get("/dangxuat", (req, res) => {
  req.flash("success", "Đăng xuất thành công!");
  req.session.destroy((err) => {
    if (err) {
      req.flash("error", "Có lỗi xảy ra khi đăng xuất.");
      return res.redirect("/trangchu");
    }
    res.clearCookie("connect.sid");
    res.redirect("/trangchu");
  });
});

module.exports = router;
