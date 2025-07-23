module.exports = (sequelize, DataTypes) => {
  const KhachHang = sequelize.define(
    "KhachHang",
    {
      khachhang_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      hotenkhachhang: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      sodienthoai: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      ngaytao: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      taikhoan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "KhachHang",
      timestamps: false,
    }
  );

  KhachHang.associate = (models) => {
    KhachHang.belongsTo(models.TaiKhoan, { foreignKey: "taikhoan_id" });
    KhachHang.hasMany(models.LichHen, { foreignKey: "khachhang_id" });
  };

  return KhachHang;
};
