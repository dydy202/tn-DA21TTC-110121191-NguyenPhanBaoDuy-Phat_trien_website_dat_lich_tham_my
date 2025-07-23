const express = require("express");
const router = express.Router();
const { sql } = require("../../config/db");

// Lấy danh sách nhân viên
router.get("/nhanvien", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM nhanvien ORDER BY ngaytao ASC`;
    res.render("nhanvien", { nhanvien: result.recordset });
  } catch (err) {
    console.error("Error fetching customers:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Thêm nhân viên
router.get("/nhanvien/themnhanvien", (req, res) => {
  res.render("themnhanvien"); // Tạo tệp EJS cho form thêm nhân viên
});

router.post("/nhanvien/themnhanvien", async (req, res) => {
  const { hotennhanvien, email, sodienthoai } = req.body;
  try {
    // Lấy taikhoan_id thứ hai từ bảng TaiKhoan
    const result =
      await sql.query`SELECT taikhoan_id FROM TaiKhoan ORDER BY taikhoan_id ASC OFFSET 1 ROWS FETCH NEXT 1 ROWS ONLY`;

    if (result.recordset.length === 0) {
      return res
        .status(400)
        .send("Không có tài khoản thứ hai trong bảng TaiKhoan.");
    }

    const taikhoan_id = result.recordset[0].taikhoan_id; // Lấy giá trị taikhoan_id thứ hai

    // Thêm nhân viên mới
    await sql.query`INSERT INTO NhanVien (hotennhanvien, email, sodienthoai, taikhoan_id) VALUES (${hotennhanvien}, ${email}, ${sodienthoai}, ${taikhoan_id})`;

    res.redirect("/nhanvien");
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Sửa nhân viên
router.get("/nhanvien/suanhanvien/:nhanvien_id", async (req, res) => {
  const nhanvien_id = req.params.nhanvien_id;
  try {
    const result =
      await sql.query`SELECT * FROM NhanVien WHERE nhanvien_id = ${nhanvien_id}`;
    res.render("suanhanvien", { nhanvien: result.recordset[0] });
  } catch (err) {
    console.error("Error fetching employee:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/nhanvien/suanhanvien/:nhanvien_id", async (req, res) => {
  const nhanvien_id = req.params.nhanvien_id;
  const { hotennhanvien, email, sodienthoai } = req.body;

  try {
    await sql.query`UPDATE NhanVien SET hotennhanvien = ${hotennhanvien}, email = ${email}, sodienthoai = ${sodienthoai} WHERE nhanvien_id = ${nhanvien_id}`;
    res.redirect("/nhanvien"); // Redirect đến danh sách nhân viên
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Xóa nhân viên
router.post("/nhanvien/xoa/:nhanvien_id", async (req, res) => {
  const nhanvien_id = req.params.nhanvien_id;
  try {
    await sql.query`DELETE FROM NhanVien WHERE nhanvien_id = ${nhanvien_id}`;
    res.redirect("/nhanvien");
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router; // Đảm bảo có dòng này
