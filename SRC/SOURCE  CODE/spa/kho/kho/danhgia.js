const express = require("express");
const router = express.Router();
const { sql } = require("../../config/db");

// Lấy danh sách đánh giá
router.get("/danhgia", async (req, res) => {
  try {
    const result =
      await sql.query`SELECT * FROM danhgia ORDER BY danhgia_id ASC`;
    res.render("danhgia", { danhgia: result.recordset });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Thêm đánh giá
router.get("/danhgia/themdanhgia", (req, res) => {
  res.render("themdanhgia");
});

router.post("/danhgia/themdanhgia", async (req, res) => {
  const {
    khachhang_id,
    dichvu_id,
    sanpham_id,
    hoadon_id,
    diemdanhgia,
    binhluan,
  } = req.body;
  try {
    await sql.query`INSERT INTO danhgia (khachhang_id, dichvu_id, sanpham_id, hoadon_id, diemdanhgia, binhluan) VALUES (${khachhang_id}, ${dichvu_id}, ${sanpham_id}, ${hoadon_id}, ${diemdanhgia}, ${binhluan})`;
    res.redirect("/admin/danhgia");
  } catch (err) {
    console.error("Error adding review:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Sửa đánh giá
router.get("/danhgia/suadanhgia/:danhgia_id", async (req, res) => {
  const danhgia_id = req.params.danhgia_id;
  try {
    const result =
      await sql.query`SELECT * FROM danhgia WHERE danhgia_id = ${danhgia_id}`;
    if (result.recordset.length > 0) {
      res.render("suadanhgia", { danhgia: result.recordset[0] });
    } else {
      res.status(404).send("Đánh giá không tìm thấy");
    }
  } catch (err) {
    console.error("Error fetching review:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/danhgia/suadanhgia/:danhgia_id", async (req, res) => {
  const danhgia_id = req.params.danhgia_id;
  const {
    khachhang_id,
    dichvu_id,
    sanpham_id,
    hoadon_id,
    diemdanhgia,
    binhluan,
  } = req.body;
  try {
    await sql.query`UPDATE danhgia SET khachhang_id = ${khachhang_id}, dichvu_id = ${dichvu_id}, sanpham_id = ${sanpham_id}, hoadon_id = ${hoadon_id}, diemdanhgia = ${diemdanhgia}, binhluan = ${binhluan} WHERE danhgia_id = ${danhgia_id}`;
    res.redirect("/admin/danhgia");
  } catch (err) {
    console.error("Error updating review:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Xóa đánh giá
router.post("/danhgia/xoa/:danhgia_id", async (req, res) => {
  const danhgia_id = req.params.danhgia_id;
  try {
    await sql.query`DELETE FROM danhgia WHERE danhgia_id = ${danhgia_id}`;
    res.redirect("/admin/danhgia");
  } catch (err) {
    console.error("Error deleting review:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
