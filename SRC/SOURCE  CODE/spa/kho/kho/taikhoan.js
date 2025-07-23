const express = require("express");
const router = express.Router();
const { sql } = require("../../config/db");

// Hiển thị danh sách tài khoản
router.get("/taikhoan", async (req, res) => {
  try {
    const result =
      await sql.query`SELECT taikhoan_id, tendangnhap, matkhau, quyen FROM TaiKhoan ORDER BY taikhoan_id ASC`;
    res.render("taikhoan", { taikhoan: result.recordset });
  } catch (err) {
    console.error("Error fetching accounts:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router; // Đảm bảo có dòng này
