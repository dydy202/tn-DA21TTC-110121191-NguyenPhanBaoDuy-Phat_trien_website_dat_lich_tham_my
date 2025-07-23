module.exports = (sequelize, DataTypes) => {
  const SanPham = sequelize.define(
    "SanPham",
    {
      sanpham_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      tensanpham: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      gia: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      phanloai: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [["Đơn", "Combo", "Liệu trình"]],
        },
      },
      hinhanh: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      baiviet: {
        type: DataTypes.TEXT,
      },
      trangthai: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      loainhomsanpham_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "SanPham",
      timestamps: false,
    }
  );

  SanPham.associate = (models) => {
    SanPham.belongsTo(models.LoaiNhomSanPham, {
      foreignKey: "loainhomsanpham_id",
    });
    SanPham.hasMany(models.LichHen, { foreignKey: "sanpham_id" });
  };

  return SanPham;
};
