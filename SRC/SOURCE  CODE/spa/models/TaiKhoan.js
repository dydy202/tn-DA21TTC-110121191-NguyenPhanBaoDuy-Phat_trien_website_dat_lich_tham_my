module.exports = (sequelize, DataTypes) => {
  const TaiKhoan = sequelize.define(
    "TaiKhoan",
    {
      taikhoan_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tendangnhap: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      matkhau: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quyen: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "TaiKhoan",
      timestamps: false,
    }
  );

  TaiKhoan.associate = (models) => {
    TaiKhoan.hasOne(models.KhachHang, { foreignKey: "taikhoan_id" });
    TaiKhoan.hasOne(models.NhanVien, { foreignKey: "taikhoan_id" });
  };

  return TaiKhoan;
};
