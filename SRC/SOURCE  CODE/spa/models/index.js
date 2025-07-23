const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("TEN_DB", "USERNAME", "PASSWORD", {
  host: "localhost",
  dialect: "mssql", // hoặc 'mysql', 'postgres'
  logging: false,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.TaiKhoan = require("./TaiKhoan")(sequelize, DataTypes);
db.KhachHang = require("./KhachHang")(sequelize, DataTypes);
db.NhanVien = require("./NhanVien")(sequelize, Sequelize.DataTypes);
db.SanPham = require("./SanPham")(sequelize, DataTypes);
db.LoaiNhomSanPham = require("./LoaiNhomSanPham")(sequelize, Sequelize);
db.LichHen = require("./LichHen")(sequelize, DataTypes);

// Gọi associate nếu có
Object.keys(db).forEach((modelName) => {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

module.exports = db;
