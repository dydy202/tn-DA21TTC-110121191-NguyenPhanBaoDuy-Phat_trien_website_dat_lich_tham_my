const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const { sql } = require("../../config/db");

// Cấu hình multer để lưu trữ tệp
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Đặt tên tệp duy nhất
  },
});

const upload = multer({ storage: storage });

// Lấy danh sách sản phẩm
router.get("/sanpham", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT sp.*, l.tenloainhomsanpham 
      FROM SanPham sp
      LEFT JOIN LoaiNhomSanPham l ON sp.loainhomsanpham_id = l.loainhomsanpham_id
      ORDER BY sp.sanpham_id ASC
    `;
    res.render("sanpham", { sanpham: result.recordset });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Thêm sản phẩm
router.get("/sanpham/themsanpham", async (req, res) => {
  const loaiSanPhamResult = await sql.query`SELECT * FROM LoaiNhomSanPham`; // Lấy loại sản phẩm
  res.render("themsanpham", { loaiSanPham: loaiSanPhamResult.recordset });
});

router.post("/sanpham/themsanpham", async (req, res) => {
  const {
    tensanpham,
    gia,
    phanloai,
    hinhanh,
    baiviet,
    trangthai,
    loainhomsanpham_id,
  } = req.body;
  try {
    await sql.query`INSERT INTO SanPham (tensanpham, gia, phanloai, hinhanh, baiviet, trangthai, loainhomsanpham_id) VALUES (${tensanpham}, ${gia}, ${phanloai}, ${hinhanh}, ${baiviet}, ${trangthai}, ${loainhomsanpham_id})`;
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Sửa sản phẩm
router.get("/sanpham/suasanpham/:sanpham_id", async (req, res) => {
  const sanpham_id = req.params.sanpham_id;
  try {
    const sanphamResult =
      await sql.query`SELECT * FROM SanPham WHERE sanpham_id = ${sanpham_id}`;
    const loaiSanPhamResult = await sql.query`SELECT * FROM LoaiNhomSanPham`;

    if (sanphamResult.recordset.length > 0) {
      res.render("suasanpham", {
        sanpham: sanphamResult.recordset[0],
        loaiSanPham: loaiSanPhamResult.recordset,
      });
    } else {
      res.status(404).send("Sản phẩm không tìm thấy");
    }
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post(
  "/sanpham/suasanpham/:sanpham_id",
  upload.single("hinhanh"),
  async (req, res) => {
    const sanpham_id = req.params.sanpham_id;
    const {
      tensanpham,
      gia,
      phanloai,
      baiviet,
      trangthai,
      loainhomsanpham_id,
    } = req.body;

    // Xử lý hình ảnh
    const hinhanh = req.file ? req.file.filename : null; // Lưu tên tệp tải lên

    try {
      const request = new sql.Request();

      // Thêm các tham số vào request
      request.input("tensanpham", sql.NVarChar, tensanpham);
      request.input("gia", sql.Float, gia);
      request.input("phanloai", sql.NVarChar, phanloai);
      if (hinhanh) {
        request.input("hinhanh", sql.NVarChar, hinhanh);
      }
      request.input("baiviet", sql.NVarChar, baiviet);
      request.input("trangthai", sql.NVarChar, trangthai);
      request.input("loainhomsanpham_id", sql.Int, loainhomsanpham_id);
      request.input("sanpham_id", sql.Int, sanpham_id);

      // Tạo câu lệnh SQL cập nhật
      let query = `
      UPDATE SanPham 
      SET tensanpham = @tensanpham, gia = @gia, phanloai = @phanloai,
    `;

      if (hinhanh) {
        query += `hinhanh = @hinhanh, `;
      }

      query += `
      baiviet = @baiviet, trangthai = @trangthai, loainhomsanpham_id = @loainhomsanpham_id 
      WHERE sanpham_id = @sanpham_id
    `;

      await request.query(query);
      res.redirect("/admin/sanpham");
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Xóa sản phẩm
router.post("/sanpham/xoa/:sanpham_id", async (req, res) => {
  const sanpham_id = req.params.sanpham_id;
  try {
    await sql.query`DELETE FROM SanPham WHERE sanpham_id = ${sanpham_id}`;
    res.redirect("/admin/sanpham");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
