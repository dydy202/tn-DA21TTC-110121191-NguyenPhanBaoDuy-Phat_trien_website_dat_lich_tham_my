const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sql } = require("../../config/db");

// Trang chính quản trị
router.get("/", (req, res) => {
  res.render("admin"); // Hiện thị trang admin.ejs
});

// Khách Hàng
router.get("/khachhang", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM khachhang`;
    res.render("khachhang", { khachhang: result.recordset });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Nhân Viên
router.get("/nhanvien", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM nhanvien`;
    res.render("nhanvien", { nhanvien: result.recordset });
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    req.flash("error", "Vui lòng đăng nhập với tài khoản admin.");
    return res.redirect("/dangnhap");
  }
  next();
};

// Cấu hình multer để upload hình ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
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
      cb(new Error("Chỉ chấp nhận file JPG, PNG!"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Route GET: Trang quản lý bài viết
router.get("/baiviet", requireAdmin, async (req, res) => {
  try {
    const services = await query("SELECT MaSP, TenSP FROM SanPham");
    const posts = await query(`
      SELECT bv.*, sp.TenSP 
      FROM BaiViet bv 
      JOIN SanPham sp ON bv.MaSP = sp.MaSP
    `);
    res.render("admin/baiviet", {
      services: services || [],
      posts: posts || [],
      message:
        req.flash("success") || req.flash("error")
          ? {
              type: req.flash("success") ? "success" : "danger",
              text: req.flash("success") || req.flash("error"),
            }
          : null,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Lỗi khi tải trang bài viết:", err);
    req.flash("error", "Không thể tải trang bài viết.");
    res.redirect("/trangchu");
  }
});

// Route POST: Tạo bài viết mới
router.post(
  "/baiviet",
  requireAdmin,
  upload.single("hinhAnhBV"),
  async (req, res) => {
    const { maSP, moTaBV } = req.body;
    const hinhAnhBV = req.file ? `/uploads/${req.file.filename}` : null;

    if (!maSP || !moTaBV) {
      req.flash("error", "Vui lòng điền đầy đủ thông tin.");
      return res.redirect("/admin/baiviet");
    }

    try {
      await query(
        `
      INSERT INTO BaiViet (MaSP, MoTaBV, HinhAnhBV) 
      VALUES (@maSP, @moTaBV, @hinhAnhBV)
    `,
        { maSP, moTaBV, hinhAnhBV }
      );
      req.flash("success", "Tạo bài viết thành công!");
      res.redirect("/admin/baiviet");
    } catch (err) {
      console.error("Lỗi khi tạo bài viết:", err);
      req.flash("error", "Không thể tạo bài viết.");
      res.redirect("/admin/baiviet");
    }
  }
);

// Route GET: Sửa bài viết
router.get("/baiviet/edit/:id", requireAdmin, async (req, res) => {
  try {
    const post = await query("SELECT * FROM BaiViet WHERE MaBV = @id", {
      id: req.params.id,
    });
    const services = await query("SELECT MaSP, TenSP FROM SanPham");
    if (!post || post.length === 0) {
      req.flash("error", "Bài viết không tồn tại.");
      return res.redirect("/admin/baiviet");
    }
    res.render("admin/edit_baiviet", {
      post: post[0],
      services: services || [],
      message: null,
      user: req.session.user,
    });
  } catch (err) {
    console.error("Lỗi khi tải trang sửa bài viết:", err);
    req.flash("error", "Không thể tải trang sửa bài viết.");
    res.redirect("/admin/baiviet");
  }
});

// Route POST: Cập nhật bài viết
router.post(
  "/baiviet/edit/:id",
  requireAdmin,
  upload.single("hinhAnhBV"),
  async (req, res) => {
    const { maSP, moTaBV } = req.body;
    const hinhAnhBV = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.hinhAnhCu;

    if (!maSP || !moTaBV) {
      req.flash("error", "Vui lòng điền đầy đủ thông tin.");
      return res.redirect(`/admin/baiviet/edit/${req.params.id}`);
    }

    try {
      await query(
        `
      UPDATE BaiViet 
      SET MaSP = @maSP, MoTaBV = @moTaBV, HinhAnhBV = @hinhAnhBV 
      WHERE MaBV = @id
    `,
        { maSP, moTaBV, hinhAnhBV, id: req.params.id }
      );
      req.flash("success", "Cập nhật bài viết thành công!");
      res.redirect("/admin/baiviet");
    } catch (err) {
      console.error("Lỗi khi cập nhật bài viết:", err);
      req.flash("error", "Không thể cập nhật bài viết.");
      res.redirect(`/admin/baiviet/edit/${req.params.id}`);
    }
  }
);

// Route POST: Xóa bài viết
router.post("/baiviet/delete/:id", requireAdmin, async (req, res) => {
  try {
    const post = await query("SELECT HinhAnhBV FROM BaiViet WHERE MaBV = @id", {
      id: req.params.id,
    });
    if (post && post[0].HinhAnhBV) {
      fs.unlinkSync(path.join(__dirname, "../", post[0].HinhAnhBV));
    }
    await query("DELETE FROM BaiViet WHERE MaBV = @id", { id: req.params.id });
    req.flash("success", "Xóa bài viết thành công!");
    res.redirect("/admin/baiviet");
  } catch (err) {
    console.error("Lỗi khi xóa bài viết:", err);
    req.flash("error", "Không thể xóa bài viết.");
    res.redirect("/admin/baiviet");
  }
});

module.exports = router;
