const express = require("express");
const router = express.Router();
const { sql } = require("../../config/db");

// Lấy danh sách hóa đơn
router.get("/hoadon", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM hoadon ORDER BY hoadon_id ASC`;
    res.render("hoadon", { hoadon: result.recordset });
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Thêm hóa đơn
router.get("/hoadon/themhoadon", (req, res) => {
  res.render("themhoadon");
});

router.post("/hoadon/themhoadon", async (req, res) => {
  const { khachhang_id, nhanvien_id, lichhen_id, tongtien, phuongthuc } =
    req.body;
  try {
    await sql.query`INSERT INTO hoadon (khachhang_id, nhanvien_id, lichhen_id, tongtien, phuongthuc) VALUES (${khachhang_id}, ${nhanvien_id}, ${lichhen_id}, ${tongtien}, ${phuongthuc})`;
    res.redirect("/admin/hoadon");
  } catch (err) {
    console.error("Error adding invoice:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Sửa hóa đơn
router.get("/hoadon/suahoadon/:hoadon_id", async (req, res) => {
  const hoadon_id = req.params.hoadon_id;
  try {
    const result =
      await sql.query`SELECT * FROM hoadon WHERE hoadon_id = ${hoadon_id}`;
    if (result.recordset.length > 0) {
      res.render("suahoadon", { hoadon: result.recordset[0] });
    } else {
      res.status(404).send("Hóa đơn không tìm thấy");
    }
  } catch (err) {
    console.error("Error fetching invoice:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/hoadon/suahoadon/:hoadon_id", async (req, res) => {
  const hoadon_id = req.params.hoadon_id;
  const { khachhang_id, nhanvien_id, lichhen_id, tongtien, phuongthuc } =
    req.body;
  try {
    await sql.query`UPDATE hoadon SET khachhang_id = ${khachhang_id}, nhanvien_id = ${nhanvien_id}, lichhen_id = ${lichhen_id}, tongtien = ${tongtien}, phuongthuc = ${phuongthuc} WHERE hoadon_id = ${hoadon_id}`;
    res.redirect("/admin/hoadon");
  } catch (err) {
    console.error("Error updating invoice:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Xóa hóa đơn
router.post("/hoadon/xoa/:hoadon_id", async (req, res) => {
  const hoadon_id = req.params.hoadon_id;
  try {
    await sql.query`DELETE FROM hoadon WHERE hoadon_id = ${hoadon_id}`;
    res.redirect("/admin/hoadon");
  } catch (err) {
    console.error("Error deleting invoice:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
