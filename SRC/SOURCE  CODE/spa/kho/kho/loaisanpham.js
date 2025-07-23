const express = require("express");
const router = express.Router();
const { sql } = require("../../config/db");

// Lấy danh sách loại sản phẩm
router.get("/loaisanpham", async (req, res) => {
  try {
    const result =
      await sql.query`SELECT * FROM LoaiNhomSanPham ORDER BY loainhomsanpham_id ASC`;
    res.render("loaisanpham", { loaisanpham: result.recordset });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Thêm loại sản phẩm
router.get("/loaisanpham/themloaisanpham", (req, res) => {
  res.render("themloaisanpham");
});

// Xử lý thêm loại sản phẩm
router.post("/loaisanpham/themloaisanpham", async (req, res) => {
  const { tenloainhomsanpham } = req.body; // Đảm bảo lấy đúng tên trường
  try {
    if (!tenloainhomsanpham) {
      return res.status(400).send("Tên loại sản phẩm không được để trống.");
    }
    await sql.query`INSERT INTO LoaiNhomSanPham (tenloainhomsanpham) VALUES (${tenloainhomsanpham})`;
    res.redirect("/admin/loaisanpham");
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Sửa loại sản phẩm
router.get(
  "/loaisanpham/sualoaisanpham/:loainhomsanpham_id",
  async (req, res) => {
    const loainhomsanpham_id = req.params.loainhomsanpham_id;
    try {
      const result =
        await sql.query`SELECT * FROM LoaiNhomSanPham WHERE loainhomsanpham_id = ${loainhomsanpham_id}`;
      if (result.recordset.length > 0) {
        res.render("sualoaisanpham", { loainhomsanpham: result.recordset[0] });
      } else {
        res.status(404).send("Loại sản phẩm không tìm thấy");
      }
    } catch (err) {
      console.error("Error fetching category:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Xử lý cập nhật loại sản phẩm
router.post(
  "/loaisanpham/sualoaisanpham/:loainhomsanpham_id",
  async (req, res) => {
    const loainhomsanpham_id = req.params.loainhomsanpham_id;
    const { tenloainhomsanpham } = req.body; // Lấy tên từ form
    try {
      if (!tenloainhomsanpham) {
        return res.status(400).send("Tên loại sản phẩm không được để trống.");
      }
      await sql.query`UPDATE LoaiNhomSanPham SET tenloainhomsanpham = ${tenloainhomsanpham} WHERE loainhomsanpham_id = ${loainhomsanpham_id}`;
      res.redirect("/admin/loaisanpham");
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Xóa loại sản phẩm
router.post("/loaisanpham/xoa/:loainhomsanpham_id", async (req, res) => {
  const loainhomsanpham_id = req.params.loainhomsanpham_id;
  try {
    await sql.query`DELETE FROM LoaiNhomSanPham WHERE loainhomsanpham_id = ${loainhomsanpham_id}`;
    res.redirect("/admin/loaisanpham");
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router; // Đảm bảo có dòng này
