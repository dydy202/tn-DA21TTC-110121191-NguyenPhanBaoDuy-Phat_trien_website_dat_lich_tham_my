const express = require("express");
const router = express.Router();
const sql = require("mssql");

// 📌 Lấy tất cả chi tiết hóa đơn
router.get("/hoadon/chitiethoadon/:id", async (req, res) => {
  try {
    const hoadonId = req.params.id;
    const pool = await sql.connect();

    const result = await pool.request().input("hoadonId", sql.Int, hoadonId)
      .query(`
        SELECT ct.hoadon_id, sp.tensanpham, ct.soluong, ct.dongia, (ct.soluong * ct.dongia) AS thanhtien
        FROM ChiTietHoaDon ct
        JOIN SanPham sp ON ct.sanpham_id = sp.sanpham_id
        WHERE ct.hoadon_id = @hoadonId
      `);

    res.render("chitiethoadon", {
      chitiethoadon: result.recordset,
      hoadon_id: hoadonId,
    });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết hóa đơn:", err);
    res.status(500).send("Lỗi máy chủ");
  }
});

// 📌 Thêm mới chi tiết hóa đơn
router.post("/add", async (req, res) => {
  const { hoadon_id, sanpham_id, soluong, dongia } = req.body;
  try {
    const pool = await sql.connect();
    await pool
      .request()
      .input("hoadon_id", sql.Int, hoadon_id)
      .input("sanpham_id", sql.Int, sanpham_id)
      .input("soluong", sql.Int, soluong)
      .input("dongia", sql.Decimal(10, 2), dongia).query(`
        INSERT INTO ChiTietHoaDon (hoadon_id, sanpham_id, soluong, dongia)
        VALUES (@hoadon_id, @sanpham_id, @soluong, @dongia)
      `);
    res.redirect("/chitiethoadon");
  } catch (err) {
    console.error("❌ Lỗi thêm chi tiết hóa đơn:", err);
    res.status(500).send("Lỗi khi thêm");
  }
});

// 📌 Cập nhật chi tiết hóa đơn
router.post("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { hoadon_id, sanpham_id, soluong, dongia } = req.body;
  try {
    const pool = await sql.connect();
    await pool
      .request()
      .input("id", sql.Int, id)
      .input("hoadon_id", sql.Int, hoadon_id)
      .input("sanpham_id", sql.Int, sanpham_id)
      .input("soluong", sql.Int, soluong)
      .input("dongia", sql.Decimal(10, 2), dongia).query(`
        UPDATE ChiTietHoaDon
        SET hoadon_id = @hoadon_id,
            sanpham_id = @sanpham_id,
            soluong = @soluong,
            dongia = @dongia
        WHERE chitiethoadon_id = @id
      `);
    res.redirect("/chitiethoadon");
  } catch (err) {
    console.error("❌ Lỗi cập nhật chi tiết hóa đơn:", err);
    res.status(500).send("Lỗi khi cập nhật");
  }
});

// 📌 Xóa chi tiết hóa đơn
router.post("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect();
    await pool.request().input("id", sql.Int, id).query(`
        DELETE FROM ChiTietHoaDon WHERE chitiethoadon_id = @id
      `);
    res.redirect("/chitiethoadon");
  } catch (err) {
    console.error("❌ Lỗi xóa chi tiết hóa đơn:", err);
    res.status(500).send("Lỗi khi xóa");
  }
});

module.exports = router;
