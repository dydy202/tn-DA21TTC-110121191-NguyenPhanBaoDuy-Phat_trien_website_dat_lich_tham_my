// middlewares/kiemTraDangNhap.js
function kiemTraDangNhap(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect("/dangnhap"); // hoặc đổi route phù hợp với dự án của bạn
}

module.exports = kiemTraDangNhap;
