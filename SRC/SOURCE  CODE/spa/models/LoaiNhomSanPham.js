// models/LoaiNhomSanPham.js
module.exports = (sequelize, DataTypes) => {
  const LoaiNhomSanPham = sequelize.define(
    "LoaiNhomSanPham",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ten_loai: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "LoaiNhomSanPham",
      timestamps: false,
    }
  );

  return LoaiNhomSanPham;
};
