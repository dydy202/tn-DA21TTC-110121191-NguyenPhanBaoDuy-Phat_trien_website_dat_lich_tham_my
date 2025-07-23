// models/NhanVien.js
module.exports = (sequelize, DataTypes) => {
  const NhanVien = sequelize.define(
    "NhanVien",
    {
      nhanvien_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      hoten: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // các cột khác như email, sdt,...
      taikhoan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "NhanVien",
      timestamps: false,
    }
  );

  NhanVien.associate = (models) => {
    NhanVien.belongsTo(models.TaiKhoan, { foreignKey: "taikhoan_id" });
  };

  return NhanVien;
};
