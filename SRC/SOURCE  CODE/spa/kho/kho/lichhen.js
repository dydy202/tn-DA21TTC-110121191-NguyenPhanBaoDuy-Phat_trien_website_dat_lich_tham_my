const express = require("express");
const router = express.Router();
const { query } = require("../../config/db");

router.get("/lichhen", async (req, res) => {
  if (!req.session.user) {
    req.flash("error", "Vui lòng đăng nhập để xem lịch hẹn!");
    return res.redirect("/dangnhap?redirect=/lichhen");
  }

  try {
    const appointments = await query(
      `SELECT lh.MaLH, lh.NgayHen, lh.GioHen, lh.GhiChuLH, lh.HinhAnhLH, lh.TrangThaiLH, 
              sp.TenSP, sp.GiaSP, nv.HoTenNV 
       FROM LichHen lh 
       JOIN SanPham sp ON lh.MaSP = sp.MaSP 
       JOIN NhanVien nv ON lh.MaNV = nv.MaNV 
       WHERE lh.MaKH = @maKH`,
      { maKH: req.session.user.id }
    );

    res.render("khachhang/lichhen", {
      appointments,
      user: req.session.user,
      message: req.flash("error") || req.flash("success"),
    });
  } catch (error) {
    console.error("Error fetching appointments:", error.message);
    req.flash("error", "Có lỗi xảy ra khi lấy danh sách lịch hẹn.");
    res.redirect("/trangchu");
  }
});

module.exports = router;
