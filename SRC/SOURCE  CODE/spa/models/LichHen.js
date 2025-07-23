module.exports = (sequelize, DataTypes) => {
  const LichHen = sequelize.define(
    "LichHen",
    {
      lichhen_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      khachhang_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      nhanvien_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sanpham_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ngayhen: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      giohen: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      soluong: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      trangthai: {
        type: DataTypes.STRING,
        defaultValue: "Chờ xác nhận",
      },
      ghichu: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "LichHen",
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["nhanvien_id", "ngayhen", "giohen"],
          name: "unique_lichhen",
        },
      ],
    }
  );

  LichHen.associate = (models) => {
    LichHen.belongsTo(models.KhachHang, { foreignKey: "khachhang_id" });
    LichHen.belongsTo(models.NhanVien, { foreignKey: "nhanvien_id" });
    LichHen.belongsTo(models.SanPham, { foreignKey: "sanpham_id" });
  };

  return LichHen;
};
