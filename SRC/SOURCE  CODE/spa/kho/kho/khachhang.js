const express = require("express");
const router = express.Router();
const { sql } = require("../../config/db");

// Hiển thị danh sách khách hàng
router.get("/khachhang", async (req, res) => {
  try {
    const result =
      await sql.query`SELECT * FROM khachhang ORDER BY ngaytao ASC`;
    res.render("khachhang", { khachhang: result.recordset });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Thêm khách hàng
router.get("/khachhang/themkhachhang", (req, res) => {
  res.render("themkhachhang"); // Tạo tệp EJS cho form thêm
});

router.post("/khachhang/themkhachhang", async (req, res) => {
  const { hotenkhachhang, email, sodienthoai } = req.body; // Lấy thông tin từ form
  const ngaytao = new Date(); // Ngày tạo hiện tại

  try {
    // Lấy taikhoan_id đầu tiên từ bảng TaiKhoan
    const result =
      await sql.query`SELECT TOP 1 taikhoan_id FROM TaiKhoan ORDER BY taikhoan_id ASC`;

    if (result.recordset.length === 0) {
      return res
        .status(400)
        .send("Không có tài khoản nào trong bảng TaiKhoan.");
    }

    const taikhoan_id = result.recordset[0].taikhoan_id; // Lấy giá trị taikhoan_id đầu tiên

    // Thêm khách hàng với taikhoan_id đã lấy
    await sql.query`INSERT INTO KhachHang (hotenkhachhang, email, sodienthoai, ngaytao, taikhoan_id) VALUES (${hotenkhachhang}, ${email}, ${sodienthoai}, ${ngaytao}, ${taikhoan_id})`;

    res.redirect("/admin/khachhang"); // Redirect về danh sách khách hàng
  } catch (err) {
    console.error("Error adding customer:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Sửa khách hàng
router.get("/khachhang/suakhachhang/:khachhang_id", async (req, res) => {
  const khachhang_id = req.params.khachhang_id;
  try {
    const result =
      await sql.query`SELECT * FROM khachhang WHERE khachhang_id = ${khachhang_id}`;
    res.render("suakhachhang", { kh: result.recordset[0] });
  } catch (err) {
    console.error("Error fetching customer:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/khachhang/suakhachhang/:khachhang_id", async (req, res) => {
  const khachhang_id = req.params.khachhang_id;
  const { hotenkhachhang, email, sodienthoai } = req.body;

  try {
    await sql.query`UPDATE KhachHang SET hotenkhachhang = ${hotenkhachhang}, email = ${email}, sodienthoai = ${sodienthoai} WHERE khachhang_id = ${khachhang_id}`;
    res.redirect("/khachhang"); // Redirect đến danh sách khách hàng
  } catch (err) {
    console.error("Error updating customer:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Xóa khách hàng
router.post("/khachhang/xoa/:khachhang_id", async (req, res) => {
  const khachhang_id = req.params.khachhang_id;
  try {
    await sql.query`DELETE FROM KhachHang WHERE khachhang_id = ${khachhang_id}`;
    res.redirect("/khachhang");
  } catch (err) {
    console.error("Error deleting customer:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router; // Đảm bảo có dòng này
