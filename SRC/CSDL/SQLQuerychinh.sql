-- TẠO DATABASE
CREATE DATABASE spa;
GO

USE spa;
GO

--BẢNG Quyen
CREATE TABLE Quyen (
    MaQ INT IDENTITY(1,1) PRIMARY KEY,
    TenQ NVARCHAR(100) UNIQUE,
    MoTaQ NVARCHAR(255)
);

-- BẢNG TaiKhoan
CREATE TABLE TaiKhoan (
    MaTK INT IDENTITY(1,1) PRIMARY KEY,
    TenTK NVARCHAR(255),
    MatKhau NVARCHAR(255),
    MaQ INT,
    FOREIGN KEY (MaQ) REFERENCES Quyen(MaQ)
);

-- BẢNG KhachHang
CREATE TABLE KhachHang (
    MaKH INT IDENTITY(1,1) PRIMARY KEY,
    MaTK INT,
    HoTenKH NVARCHAR(255),
    EmailKH NVARCHAR(255),
    SoDienThoaiKH NVARCHAR(20),
    NgayTaoKH DATETIME,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);

-- BẢNG NhanVien
CREATE TABLE NhanVien (
    MaNV INT IDENTITY(1,1) PRIMARY KEY,
    MaTK INT,
    HoTenNV NVARCHAR(255),
    EmailNV NVARCHAR(255),
    SodienthoaiNV NVARCHAR(20),
    NgayTaoNV DATETIME,
    FOREIGN KEY (MaTK) REFERENCES TaiKhoan(MaTK)
);

-- BẢNG LoaiSanPham
CREATE TABLE LoaiSanPham (
    MaLSP INT IDENTITY(1,1) PRIMARY KEY,
    TenLSP NVARCHAR(255)
);

-- BẢNG LichHen
CREATE TABLE LichHen (
    MaLH INT IDENTITY(1,1) PRIMARY KEY,
    MaNV INT,
    MaKH INT,
    MaSP INT,
    NgayHen DATE,
    GioHen TIME,
    TrangThaiLH NVARCHAR(50) DEFAULT N'Chờ xác nhận',
    GhiChuLH NVARCHAR(MAX),
    HinhAnhLH NVARCHAR(MAX),
    ConfirmationToken NVARCHAR(255),
	HinhThucThanhToan NVARCHAR(50),
    PhuongThucTT NVARCHAR(50),
    SoTienThanhToan DECIMAL(10,2),
    FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH),
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP)
);

-- BẢNG SanPham
CREATE TABLE SanPham (
    MaSP INT IDENTITY(1,1) PRIMARY KEY,
    MaLSP INT,
    TenSP NVARCHAR(255),
    GiaSP INT,
    PhamLoaiSP NVARCHAR(50) CHECK (PhamLoaiSP IN (N'Đơn', N'Combo', N'Liệu trình')),
    TrangThaiSP NVARCHAR(255),
    FOREIGN KEY (MaLSP) REFERENCES LoaiSanPham(MaLSP),
);

--BẢNG BaiViet
CREATE TABLE BaiViet (
    MaBV INT IDENTITY(1,1) PRIMARY KEY,
    MaSP INT,
    MoTaBV NVARCHAR(MAX),
    HinhAnhBV NVARCHAR(MAX),
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP)
);

-- BẢNG HoaDon 
CREATE TABLE HoaDon (
    MaHD INT IDENTITY(1,1) PRIMARY KEY,
    MaKH INT,
    MaLH INT,
    TongTien DECIMAL(10,2) DEFAULT 0,
    PhuongThucThanhToan NVARCHAR(50),
    TrangThaiHD NVARCHAR(50) DEFAULT N'Chưa thanh toán',
    NgayLapHD DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH),
    FOREIGN KEY (MaLH) REFERENCES LichHen(MaLH)
);

-- BẢNG ChiTietHoaDon
CREATE TABLE ChiTietHoaDon (
    MaCTHD INT IDENTITY(1,1) PRIMARY KEY,
    MaHD INT,
    MaSP INT,
    DonGia DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
    FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP)
);

-- BẢNG DanhGia
CREATE TABLE DanhGia (
    MaDG INT IDENTITY(1,1) PRIMARY KEY,
    MaKH INT,
    MaCTHD INT,
    DiemDG INT CHECK (DiemDG BETWEEN 1 AND 5),
    BinhLuan NVARCHAR(MAX),
    ChatLuong NVARCHAR(MAX),
    ThaiDo NVARCHAR(MAX),  
    NgayDG DATETIME,
    FOREIGN KEY (MaKH) REFERENCES KhachHang(MaKH),
    FOREIGN KEY (MaCTHD) REFERENCES ChiTietHoaDon(MaCTHD)
);

CREATE TABLE NghiPhep (
    MaNghiPhep INT IDENTITY(1,1) PRIMARY KEY,
    MaNV INT NOT NULL,
    NgayNghi DATE NOT NULL,
    LyDo NVARCHAR(500),
    TrangThaiNghi NVARCHAR(50) DEFAULT N'Chờ duyệt',
    FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV)
);

INSERT INTO Quyen (TenQ, MoTaQ) VALUES
(N'Khách hàng', N'Tài khoản dành cho khách hàng'),
(N'Nhân viên', N'Tài khoản dành cho nhân viên'),
(N'Quản trị viên', N'Tài khoản có toàn quyền hệ thống');

INSERT INTO TaiKhoan (TenTK, MatKhau, MaQ) VALUES
('user1', 'password1', 1),  -- Khách hàng
('user2', 'password2', 2),  -- Nhân viên
('admin', 'adminpass', 3);  -- Quản trị viên

INSERT INTO KhachHang (MaTK, HoTenKH, EmailKH, SoDienThoaiKH, NgayTaoKH) VALUES
(1, N'Nguyễn Ngọc Anh', 'nguyenngocanh@gmail.com', '0123456789', GETDATE());

INSERT INTO NhanVien (MaTK, HoTenNV, EmailNV, SodienthoaiNV, NgayTaoNV) VALUES
(2, N'Huỳnh Ngân', 'tthn@gmail.com', '0123456780', GETDATE()),
(3, N'Thanh Hòa', 'btth@gmail.com', '0987654312', GETDATE());

INSERT INTO LoaiSanPham (TenLSP) VALUES
(N'Chăm sóc sắc đẹp'),
(N'Dịch vụ sức khỏe'),
(N'Sản phẩm chăm sóc tóc');

INSERT INTO SanPham (MaLSP, TenSP, GiaSP, PhamLoaiSP, TrangThaiSP) VALUES
(1, N'Dịch vụ chăm sóc da', 500000, N'Đơn', N'Còn hàng'),
(3, N'Combo dưỡng tóc', 700000, N'Combo', N'Còn hàng'),
(2, N'Liệu trình giảm béo', 1500000, N'Liệu trình', N'Còn hàng');

INSERT INTO LichHen (MaNV, MaKH, NgayHen, GioHen, SoLuongSP, GhiChuLH) VALUES
(1, 1, '2025-05-10', '10:00:00', 1, N'Không có ghi chú'),
(2, 1, '2025-05-11', '11:00:00', 1, N'Ghi chú khác');

INSERT INTO HoaDon (MaKH, MaLH, TongTien, PhuongThucThanhToan, TrangThaiHD) VALUES
(1, 1, 500000, N'Tiền mặt', N'Chưa thanh toán'),
(1, 2, 700000, N'Chuyển khoản', N'Đã thanh toán');

INSERT INTO ChiTietHoaDon (MaHD, MaSP, SoLuong, DonGia) VALUES
(1, 1, 1, 500000),
(2, 2, 1, 700000);

INSERT INTO DanhGia (MaKH, MaCTHD, DiemDG, BinhLuan, ChatLuong, ThaiDo, NgayDG) VALUES
(1, 1, 5, N'Dịch vụ rất tốt!', N'Xuất sắc', N'Tốt', GETDATE()),
(1, 2, 4, N'Dịch vụ ổn!', N'Tốt', N'Bình thường', GETDATE());

ALTER TABLE LichHen
ADD MaSP INT,
FOREIGN KEY (MaSP) REFERENCES SanPham(MaSP);

ALTER TABLE LichHen ADD HinhAnhLH NVARCHAR(MAX);

SELECT MaSP, TenSP, GiaSP, TrangThaiSP 
FROM SanPham 
WHERE TrangThaiSP = N'Còn hàng';

SELECT * FROM Quyen
SELECT * FROM TaiKhoan
SELECT * FROM KhachHang
SELECT * FROM NhanVien
SELECT * FROM LoaiSanPham
SELECT * FROM SanPham
SELECT * FROM BaiViet
SELECT * FROM LichHen
SELECT * FROM HoaDon
SELECT * FROM ChiTietHoaDon
SELECT * FROM DanhGia

DELETE FROM DanhGia;
DELETE FROM ChiTietHoaDon;
DELETE FROM HoaDon;
DELETE FROM LichHen;
DELETE FROM SanPham;
DELETE FROM NhanVien;
DELETE FROM KhachHang;
DELETE FROM TaiKhoan;

--Xóa cột số lượng trong lịch hẹn
ALTER TABLE LichHen
DROP COLUMN SoLuongSP;

ALTER TABLE ChiTietHoaDon
DROP COLUMN SoLuong;

SELECT MaLH, NgayHen, GioHen, MaNV, MaSP, TrangThaiLH
FROM LichHen
WHERE MaKH = 6;

SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'LichHen' AND COLUMN_NAME = 'GioHen';

ALTER TABLE LichHen ALTER COLUMN GioHen TIME;

SELECT GioHen FROM LichHen WHERE NgayHen = '2025-05-29' AND MaNV = 1;

SELECT NgayHen, GioHen, MaNV
FROM LichHen
WHERE MaNV = 1 AND NgayHen IN ('2025-05-28', '2025-05-29');

ALTER TABLE LichHen
ADD ConfirmationToken NVARCHAR(36) NULL;

ALTER LOGIN sa WITH PASSWORD = '246810', CHECK_EXPIRATION = OFF;

SELECT MaLH, MaKH, GioHen
FROM LichHen
WHERE MaKH = 6;

--Cập nhật mật khẩu tài khoản 
UPDATE TaiKhoan
SET MatKhau = '$2b$10$uG6oluNRtEbWsyonAQxZ3.npvNQ4wKAHfe.aj71oZqhVIVNI2JFm.'
WHERE TenTK = 'admin';

INSERT INTO SanPham (MaLSP, TenSP, GiaSP, PhamLoaiSP, TrangThaiSP)
VALUES 
(1, N'Cắt da, sửa form móng', 20, N'Đơn', N'Đang kinh doanh'),
(1, N'Phá gel / cứng móng', 20, N'Đơn', N'Đang kinh doanh'),
(1, N'Sơn gel', 80, N'Combo', N'Đang kinh doanh'),
(1, N'Sơn thạch', 90, N'Combo', N'Đang kinh doanh'),
(1, N'Úp móng + Sơn gel', 150, N'Combo', N'Đang kinh doanh'),
(1, N'Úp móng + Sơn thạch', 160, N'Combo', N'Đang kinh doanh'),
(1, N'Bột nhúng / đắp gel + Sơn gel', 260, N'Combo', N'Đang kinh doanh'),
(1, N'Bột nhúng / đắp gel + Sơn thạch', 270, N'Combo', N'Đang kinh doanh');

UPDATE BaiViet
SET MoTaBV = 
N'Trong cuộc sống hiện đại đầy áp lực và khói bụi, làn da rất dễ bị ảnh hưởng bởi môi trường ô nhiễm, ánh nắng mặt trời, chế độ sinh hoạt không điều độ… Vì vậy, việc chăm sóc da không chỉ là để giữ gìn vẻ đẹp bên ngoài mà còn là một cách yêu thương và phục hồi tinh thần. Dịch vụ chăm sóc da chuyên sâu tại spa mang đến cho bạn không gian thư giãn lý tưởng, đồng thời tái tạo làn da khỏe mạnh, căng bóng từ bên trong. Liệu trình được thiết kế khoa học, kết hợp giữa kỹ thuật hiện đại và liệu pháp tự nhiên nhằm mang đến trải nghiệm làm đẹp an toàn, hiệu quả và toàn diện nhất.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Tư vấn và phân tích da'
+ CHAR(13) + CHAR(10) +
N'Trước tiên, khách hàng sẽ được chuyên viên soi da và tư vấn kỹ càng để xác định loại da (da dầu, khô, hỗn hợp, nhạy cảm...) và các vấn đề đang gặp phải như mụn, nám, lão hóa. Đây là bước quan trọng giúp cá nhân hóa liệu trình chăm sóc, lựa chọn sản phẩm và kỹ thuật phù hợp nhất, nhằm mang lại hiệu quả tối ưu và an toàn tuyệt đối cho từng khách hàng.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Làm sạch sâu'
+ CHAR(13) + CHAR(10) +
N'Sau khi phân tích da, liệu trình bắt đầu với bước làm sạch kép (double cleansing), bao gồm tẩy trang và rửa mặt. Sản phẩm được lựa chọn dịu nhẹ, không gây kích ứng nhưng có khả năng làm sạch sâu lớp bụi bẩn, bã nhờn, lớp trang điểm hay kem chống nắng tích tụ trong ngày. Làn da sau đó trở nên thông thoáng, sẵn sàng hấp thu dưỡng chất từ các bước tiếp theo.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Tẩy tế bào chết và xông hơi'
+ CHAR(13) + CHAR(10) +
N'Tiếp đến là bước tẩy tế bào chết nhằm loại bỏ lớp sừng già cỗi, thúc đẩy quá trình tái tạo tế bào mới, giúp da trở nên mềm mại và đều màu hơn. Sau đó, da được xông hơi bằng tinh dầu thảo mộc giúp làm giãn nở lỗ chân lông, kích thích tuần hoàn máu và chuẩn bị cho việc lấy nhân mụn một cách dễ dàng, nhẹ nhàng mà không gây đau đớn.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Lấy nhân mụn y khoa'
+ CHAR(13) + CHAR(10) +
N'Chuyên viên sử dụng dụng cụ vô khuẩn và kỹ thuật đúng chuẩn y khoa để lấy sạch nhân mụn như mụn đầu đen, mụn cám hoặc mụn ẩn dưới da. Quy trình này được thực hiện nhẹ nhàng, tỉ mỉ nhằm hạn chế tổn thương, ngăn ngừa viêm nhiễm và sẹo thâm. Sau bước này, da được sát khuẩn và làm dịu để phục hồi nhanh chóng.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Massage thư giãn vùng mặt và cổ - vai - gáy'
+ CHAR(13) + CHAR(10) +
N'Một trong những điểm đặc biệt tại spa là liệu pháp massage chuyên sâu. Không chỉ giúp giãn cơ, giảm đau mỏi cổ vai gáy do ngồi làm việc lâu, kỹ thuật massage còn giúp tăng lưu thông máu, kích thích sản sinh collagen, đồng thời mang lại cảm giác thư giãn sâu. Khách hàng thường cảm thấy dễ chịu, tinh thần được cân bằng sau bước này.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Đắp mặt nạ dưỡng chuyên sâu'
+ CHAR(13) + CHAR(10) +
N'Dựa vào tình trạng da, chuyên viên sẽ lựa chọn loại mặt nạ phù hợp như mặt nạ cấp ẩm, làm dịu, làm sáng, thải độc hay chống lão hóa. Trong lúc đắp mặt nạ, khách hàng có thể được massage tay hoặc vai gáy để tăng hiệu quả thư giãn. Mặt nạ giúp cung cấp dưỡng chất, phục hồi cấu trúc da và mang lại vẻ ngoài rạng rỡ, khỏe mạnh.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Dưỡng chất – Serum chuyên biệt'
+ CHAR(13) + CHAR(10) +
N'Sau khi rửa sạch lớp mặt nạ, da sẽ được cân bằng độ pH bằng toner rồi thoa serum – tinh chất đậm đặc chứa các hoạt chất như Hyaluronic Acid, Vitamin C, Niacinamide hoặc Peptides. Đây là bước quan trọng giúp đưa dưỡng chất thẩm thấu sâu vào lớp biểu bì, cải thiện các vấn đề da một cách rõ rệt và bền vững.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Khóa ẩm và bảo vệ da'
+ CHAR(13) + CHAR(10) +
N'Bước cuối cùng là dùng kem dưỡng để khóa ẩm, giữ lại toàn bộ tinh chất đã thoa trước đó. Nếu chăm sóc ban ngày, khách hàng sẽ được bôi thêm kem chống nắng để bảo vệ da khỏi tia UV gây hại. Với khách hàng làm buổi tối, spa sẽ chọn dưỡng chất ban đêm giúp tái tạo da trong giấc ngủ. Kết thúc liệu trình, da trở nên mềm mại, sáng khỏe và tràn đầy sức sống.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Chăm sóc da không chỉ là hành trình chăm chút vẻ ngoài, mà còn là khoảnh khắc lắng nghe và yêu thương bản thân. Dịch vụ chăm sóc da chuyên sâu tại spa chính là món quà dành cho làn da và tinh thần sau những ngày dài mệt mỏi. Với đội ngũ chuyên viên tận tâm, sản phẩm cao cấp nhập khẩu từ Hàn Quốc, Pháp và quy trình chuẩn khoa học, chúng tôi cam kết mang đến trải nghiệm thư giãn tuyệt đối và làn da rạng rỡ, tươi mới cho bạn.'
WHERE MaBV = '1';

UPDATE BaiViet
SET MoTaBV = 
N'Dịch vụ cắt da, sửa form móng không đơn thuần là một bước làm đẹp, mà còn là một phần quan trọng trong quá trình chăm sóc sức khỏe móng tay, móng chân. Việc loại bỏ lớp da chết, sần sùi quanh viền móng giúp mang lại vẻ ngoài gọn gàng, sạch sẽ, đồng thời tạo điều kiện lý tưởng cho lớp sơn móng bám màu đều, mịn và giữ được độ bền lâu hơn. Tại spa của chúng tôi, quy trình này được thực hiện bởi kỹ thuật viên chuyên nghiệp với tay nghề cao, sử dụng dụng cụ đã tiệt trùng hoàn toàn và thao tác nhẹ nhàng, đảm bảo an toàn tuyệt đối cho vùng da quanh móng.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Ưu điểm của dịch vụ cắt da, sửa form móng'
+ CHAR(13) + CHAR(10) +
N'Giúp móng sạch sẽ, gọn gàng: Loại bỏ lớp da thừa và tế bào chết giúp viền móng trông sắc nét hơn, phù hợp cho cả nam và nữ, nhất là những người làm trong môi trường công sở hoặc cần giữ hình ảnh chuyên nghiệp.'
+ CHAR(13) + CHAR(10) +
N'Tăng tính thẩm mỹ khi sơn móng: Một nền móng được làm sạch, sửa form đẹp sẽ giúp lớp sơn gel hoặc sơn thường bám chặt hơn, đều màu hơn và tránh bị bong tróc sớm.'
+ CHAR(13) + CHAR(10) +
N'Kích thích móng phát triển khỏe mạnh: Cắt da móng đúng kỹ thuật giúp hạn chế tình trạng sần sùi, bong tróc hoặc mọc da thừa, từ đó tạo điều kiện cho móng phát triển khỏe và đều hơn.'
+ CHAR(13) + CHAR(10) +
N'Phòng tránh các bệnh về móng: Việc vệ sinh viền móng đúng cách giúp hạn chế sự tích tụ của vi khuẩn, nấm hoặc bụi bẩn – nguyên nhân gây ra các bệnh lý như viêm da quanh móng, móng mọc ngược, móng bị hư hỏng,...'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Nhược điểm và những điều cần lưu ý'
+ CHAR(13) + CHAR(10) +
N'Nguy cơ tổn thương nếu thực hiện sai cách: Nếu thao tác cắt da quá mạnh tay hoặc dùng dụng cụ không được vô trùng kỹ, có thể gây xước da, chảy máu hoặc nhiễm trùng.'
+ CHAR(13) + CHAR(10) +
N'Có thể gây đau hoặc khó chịu với người lần đầu trải nghiệm: Những ai có vùng da quanh móng mỏng, nhạy cảm có thể cảm thấy hơi rát nhẹ trong lần đầu thực hiện.'
+ CHAR(13) + CHAR(10) +
N'Cần duy trì định kỳ: Việc cắt da, sửa form móng chỉ có tác dụng trong một thời gian nhất định, vì da và móng sẽ tiếp tục phát triển, đòi hỏi khách hàng phải thực hiện đều đặn (khoảng 2–3 tuần/lần) để giữ móng đẹp và khỏe.'
+ CHAR(13) + CHAR(10) + CHAR(13) + CHAR(10) +
N'Vì sao nên sử dụng dịch vụ này?'
+ CHAR(13) + CHAR(10) +
N'Dịch vụ cắt da, sửa form móng là bước nền tảng cần thiết trước khi tiến hành sơn móng hoặc làm nail nghệ thuật. Bên cạnh yếu tố thẩm mỹ, đây còn là cách để bảo vệ sức khỏe móng tay, móng chân một cách hiệu quả. Đặc biệt với những ai thường xuyên làm nail gel, đắp móng bột hoặc sử dụng hóa chất, việc chăm sóc móng từ gốc sẽ giúp tránh tình trạng móng yếu, dễ gãy hoặc nhiễm nấm. Khi được thực hiện bởi đội ngũ kỹ thuật viên chuyên nghiệp, dịch vụ này mang lại sự an tâm, thư giãn và cải thiện rõ rệt trong quá trình chăm sóc cá nhân.'
WHERE MaBV = '15';



SELECT MaTK, TenTK, MatKhau, MaQ
FROM TaiKhoan
WHERE TenTK = 'npb.duy.2002@gmail.com';

SELECT bv.*, sp.TenSP 
FROM BaiViet bv 
JOIN SanPham sp ON bv.MaSP = sp.MaSP

--Thêm cột vào bảng lịch hẹn
ALTER TABLE LichHen
ADD
    HinhThucThanhToan NVARCHAR(50),
    PhuongThucTT NVARCHAR(50),
    SoTienThanhToan DECIMAL(10,2);

ALTER TABLE LichHen
DROP COLUMN HinhAnhTT, SoTienTT, PhuongThucTT;

--In nhân viên, tài khoản có tên quyền là nhân viên
SELECT nv.MaNV, nv.HoTenNV, nv.EmailNV
FROM NhanVien nv
JOIN TaiKhoan tk ON nv.MaTK = tk.MaTK
JOIN Quyen q ON tk.MaQ = q.MaQ
WHERE q.TenQ = N'Nhân viên'

SELECT * FROM BaiViet;
SELECT * FROM SanPham;
SELECT bv.*, sp.TenSP 
FROM BaiViet bv 
JOIN SanPham sp ON bv.MaSP = sp.MaSP;

--Xóa khách hàng dựa vào mã khách hàng
DELETE FROM TaiKhoan WHERE MaTK = 1;

DELETE FROM LichHen WHERE MaLH IN (45);

DELETE FROM SanPham WHERE MaSP IN (37);

INSERT INTO SanPham (MaLSP, TenSP, GiaSP, PhamLoaiSP, TrangThaiSP) VALUES
(1, N'Mi Anime', 200000, N'Đơn', N'Đang kinh doanh'),
(1, N'Mi Baby Light', 250000, N'Đơn', N'Đang kinh doanh'),
(1, N'Mi Sole', 150000, N'Đơn', N'Đang kinh doanh'),
(1, N'Mi Katun', 200000, N'Đơn', N'Đang kinh doanh'),
(1, N'Mi Volume 2D, 3D', 200000, N'Đơn', N'Đang kinh doanh'),
(1, N'Mi Classic', 150000, N'Đơn', N'Đang kinh doanh'),
(1, N'Mi thiết kế', 250000, N'Đơn', N'Đang kinh doanh'),
(1, N'Nối mi dưới', 50000, N'Đơn', N'Đang kinh doanh'),
(1, N'Dặm mi', 150000, N'Đơn', N'Đang kinh doanh'),
(1, N'Tháo mi', 50000, N'Đơn', N'Đang kinh doanh'),
(1, N'Uốn mi', 90000, N'Đơn', N'Đang kinh doanh'),
(1, N'Cắt da, sửa form móng', 20000, N'Đơn', N'Đang kinh doanh'),
(1, N'Phá gel / cứng móng', 20000, N'Đơn', N'Đang kinh doanh'),
(1, N'Sơn gel', 60000, N'Đơn', N'Đang kinh doanh'),
(1, N'Sơn thạch', 70000, N'Đơn', N'Đang kinh doanh'),
(1, N'Úp móng bằng keo', 70000, N'Đơn', N'Đang kinh doanh'),
(1, N'Úp móng bằng base', 90000, N'Đơn', N'Đang kinh doanh'),
(1, N'Bột nhúng / đắp gel', 180000, N'Đơn', N'Đang kinh doanh'),
(1, N'Loang vân đá, ẩn xà cừ (theo ngón)', 20000, N'Đơn', N'Đang kinh doanh'),
(1, N'Flash, nhũ, mắt mèo kim cương, fen, tráng gương (theo ngón)', 10000, N'Đơn', N'Đang kinh doanh'),
(1, N'Charm, đá phụ kiện (theo ngón)', 10000, N'Đơn', N'Đang kinh doanh'),
(1, N'Vẽ đơn giản (theo ngón)', 10000, N'Đơn', N'Đang kinh doanh'),
(1, N'Vẽ chuyên nghiệp (theo ngón)', 30000, N'Đơn', N'Đang kinh doanh'),
(1, N'Chà gót chân, tẩy tế bào chết, massage chân', 150000, N'Đơn', N'Đang kinh doanh'),
(1, N'Make-up đi tiệc', 150000, N'Đơn', N'Đang kinh doanh'),
(3, N'Gội đầu truyền thống (rửa mặt + sấy)', 30000, N'Đơn', N'Đang kinh doanh'),
(3, N'Gội massage cổ vai gáy', 50000, N'Đơn', N'Đang kinh doanh'),
(3, N'Gội massage cổ và tay', 70000, N'Đơn', N'Đang kinh doanh'),
(3, N'Đắp mặt nạ', 20000, N'Đơn', N'Đang kinh doanh'),
(3, N'Tẩy tế bào chết tóc', 20000, N'Đơn', N'Đang kinh doanh'),
(3, N'Tẩy tế bào chết mặt', 20000, N'Đơn', N'Đang kinh doanh'),
(3, N'Cạo lông mặt', 20000, N'Đơn', N'Đang kinh doanh'),
(3, N'Waxing', 30000, N'Đơn', N'Đang kinh doanh');

INSERT INTO BaiViet (MaSP, MoTaBV, HinhAnhBV)
VALUES
-- Sản phẩm 1: Dịch vụ chăm sóc da
(1,
N'Dịch vụ chăm sóc da chuyên sâu tại spa của chúng tôi không chỉ đơn giản là làm sạch làn da, mà còn là một trải nghiệm thư giãn và tái tạo toàn diện cho tinh thần và cơ thể bạn. Quy trình chăm sóc bao gồm các bước như tẩy tế bào chết, xông hơi tinh dầu thảo mộc, lấy nhân mụn chuẩn y khoa, đắp mặt nạ phù hợp với từng loại da, massage thư giãn vùng cổ và vai gáy, giúp bạn loại bỏ mọi mệt mỏi sau một ngày dài làm việc. Chúng tôi sử dụng các sản phẩm thiên nhiên cao cấp nhập khẩu từ Hàn Quốc và Pháp, đảm bảo an toàn cho mọi loại da, kể cả da nhạy cảm nhất. Sau liệu trình, làn da của bạn sẽ trở nên căng mịn, sáng hồng rạng rỡ, và quan trọng nhất là bạn sẽ cảm nhận được sự tự tin trở lại với vẻ ngoài tươi mới, tràn đầy sức sống.',
N'/uploads/cham-soc-da-chuyen-sau.jpg'),

-- Sản phẩm 2: Combo dưỡng tóc
(2,
N'Combo dưỡng tóc cao cấp được thiết kế đặc biệt dành cho những mái tóc hư tổn nặng do hóa chất, nhuộm, uốn hoặc chịu tác động của môi trường nắng nóng, khói bụi. Gói combo bao gồm hấp dầu chuyên sâu với tinh chất argan oil, massage da đầu giúp tuần hoàn máu, thải độc tố, đắp mặt nạ tóc collagen tái tạo từng sợi tóc và cuối cùng là xả lạnh dưỡng chất giúp khóa ẩm hiệu quả. Tóc sẽ trở nên suôn mượt, đàn hồi và óng ả hơn ngay sau lần đầu trải nghiệm. Không chỉ là phục hồi, combo này còn mang đến cảm giác thư giãn tuyệt đối trong không gian yên tĩnh, với âm nhạc nhẹ nhàng và mùi hương tinh dầu lan tỏa khắp phòng. Đây là món quà lý tưởng để bạn tự thưởng cho bản thân hoặc dành tặng người thân yêu trong những dịp đặc biệt.',
N'/uploads/combo-duong-toc-chuyen-sau.jpg'),

-- Sản phẩm 3: Liệu trình giảm béo
(3,
N'Liệu trình giảm béo toàn diện là sự kết hợp giữa công nghệ hiện đại và phương pháp trị liệu truyền thống nhằm mang lại hiệu quả tối ưu trong việc giảm số đo và cải thiện vóc dáng. Với các bước như sử dụng máy hủy mỡ bằng sóng siêu âm hội tụ, massage tiêu mỡ chuyên sâu bằng tay, quấn nóng detox bằng thảo mộc và liệu trình ăn kiêng nhẹ nhàng được tư vấn riêng, khách hàng sẽ nhanh chóng cảm nhận sự thay đổi rõ rệt chỉ sau 3-5 buổi. Dịch vụ không xâm lấn, không đau, không cần nghỉ dưỡng, phù hợp với cả người bận rộn và người không muốn sử dụng thuốc. Mỗi buổi trị liệu diễn ra trong không gian riêng tư, sạch sẽ, giúp bạn hoàn toàn thư giãn trong quá trình giảm cân. Đây không chỉ là một dịch vụ làm đẹp mà còn là một bước khởi đầu cho lối sống khỏe mạnh và tích cực hơn.',
N'/uploads/giam-beo-cong-nghe-cao.jpg'),

-- 4. Mi Anime
(4,
N'Mi Anime là phong cách nối mi lấy cảm hứng từ các nhân vật hoạt hình Nhật Bản, tạo nên đôi mắt to tròn, sinh động và quyến rũ như trong truyện tranh. Sợi mi được chọn lọc kỹ lưỡng, mảnh nhẹ nhưng giữ form cực tốt, kết hợp với kỹ thuật đan xen dày – thưa tạo điểm nhấn ấn tượng mà vẫn hài hòa với khuôn mặt. Phù hợp cho những cô nàng cá tính, thích sự nổi bật nhưng vẫn nữ tính. Sau khi nối, đôi mắt trở nên long lanh hơn, đặc biệt rất ăn ảnh, không cần chuốt mascara hay kẻ mắt mỗi ngày. Quy trình nối mi tại spa chúng tôi đảm bảo vô khuẩn, nhẹ nhàng, không gây cộm hay rụng mi thật, giúp bạn tự tin tỏa sáng trong mọi sự kiện.',
N'/uploads/mi-anime.jpg'),

-- 5. Mi Baby Light
(5,
N'Mi Baby Light là phong cách mi tự nhiên, nhẹ như không nối, rất phù hợp với học sinh, sinh viên, hoặc những ai yêu thích vẻ đẹp dịu dàng, trong sáng. Sợi mi siêu mảnh và mượt, được bố trí đều đặn theo hàng mi thật giúp định hình dáng mắt hài hòa, tạo cảm giác tự nhiên nhất có thể. Không chỉ mang lại vẻ ngoài rạng rỡ, baby light còn giúp bạn tiết kiệm thời gian trang điểm mỗi sáng. Quy trình nối mất khoảng 45 phút, sử dụng keo chất lượng cao, không cay mắt, không gây kích ứng da. Sau khi nối, bạn sẽ cảm nhận được sự tự tin tuyệt đối với vẻ đẹp tự nhiên nhưng đầy cuốn hút.',
N'/uploads/mi-baby-light.jpg'),

-- 6. Mi Sole
(6,
N'Mi Sole là sự lựa chọn lý tưởng cho những ai yêu thích vẻ đẹp tự nhiên nhưng vẫn muốn tạo điểm nhấn nhẹ nhàng cho đôi mắt. Với thiết kế tơi đều, độ cong vừa phải và sợi mi mỏng, Mi Sole mang lại cảm giác như mi thật, giúp đôi mắt trông sâu và hút hồn hơn. Dịch vụ này được thực hiện bởi kỹ thuật viên giàu kinh nghiệm, đảm bảo quy trình diễn ra nhẹ nhàng, không gây tổn hại đến mi thật. Phong cách này phù hợp với mọi độ tuổi và có thể giữ được từ 3 đến 4 tuần nếu chăm sóc đúng cách. Đây là lựa chọn hoàn hảo cho những ai theo đuổi sự tinh tế và thanh lịch.',
N'/uploads/mi-sole.jpg'),

-- 7. Mi Katun
(7,
N'Phong cách mi Katun là lựa chọn được các tín đồ làm đẹp yêu thích bởi vẻ ngoài sắc sảo, quyến rũ mà nó mang lại. Lấy cảm hứng từ phong cách trang điểm đậm nét của các mỹ nhân Thái Lan, mi Katun sử dụng kỹ thuật nối dày và cong vừa phải để tạo chiều sâu cho đôi mắt, khiến ánh nhìn thêm phần thu hút. Đây là kiểu mi rất phù hợp khi bạn cần nổi bật trong các buổi tiệc hay chụp ảnh nghệ thuật. Chất liệu mi cao cấp giúp không gây nặng mắt, có độ bền cao và dễ dàng chăm sóc. Một khi đã thử mi Katun, bạn sẽ cảm thấy đôi mắt như được "nâng cấp" trở nên đầy thần thái.',
N'/uploads/mi-katun.jpg'),

-- 8. Mi Volume 2D, 3D
(8,
N'Mi Volume 2D, 3D là kỹ thuật nối mi hiện đại, giúp tạo hiệu ứng mi dày hơn, cong hơn và sâu hơn bằng cách gắn nhiều sợi mi siêu nhẹ lên một sợi mi thật. Với 2D, bạn sẽ có được vẻ ngoài nhẹ nhàng, trong khi 3D sẽ mang đến cảm giác quyến rũ và nổi bật hơn. Dù là phong cách nào, dịch vụ nối mi volume tại spa chúng tôi đều đảm bảo sự an toàn, tự nhiên và lâu bền. Bạn sẽ được tư vấn lựa chọn độ dày và kiểu dáng phù hợp nhất với khuôn mặt. Phù hợp cho cả đi làm lẫn sự kiện, mi volume sẽ là "vũ khí sắc đẹp" khiến bạn mê mẩn ngay từ lần đầu thử.',
N'/uploads/mi-volume.jpg'),

-- 9. Mi Classic
(9,
N'Mi Classic là phong cách nối mi cơ bản và phổ biến nhất, mang lại vẻ đẹp tự nhiên, nhẹ nhàng nhưng vẫn đủ nổi bật. Với kỹ thuật nối từng sợi 1:1 (1 sợi mi giả lên 1 sợi mi thật), Classic giúp làm dày mi một cách vừa phải, định hình rõ nét dáng mắt mà không làm mất đi sự thanh thoát. Dịch vụ này rất được ưa chuộng bởi sự bền bỉ, nhẹ nhàng và dễ chăm sóc. Mi Classic phù hợp cho cả đi học, đi làm hoặc gặp gỡ bạn bè thường ngày, giúp đôi mắt luôn tươi tắn và thu hút mà không cần dùng đến mascara hay kẻ mắt.',
N'/uploads/mi-classic.jpg'),

-- 10. Mi thiết kế
(10,
N'Mi thiết kế là dịch vụ nối mi cao cấp, mang đậm tính cá nhân hóa theo từng khuôn mặt, dáng mắt và phong cách riêng của khách hàng. Bạn sẽ được chuyên viên tư vấn tỉ mỉ để lựa chọn kiểu mi phù hợp nhất: từ tự nhiên, nhẹ nhàng cho đến dày đậm, sắc sảo. Mỗi bộ mi được thiết kế như một tác phẩm nghệ thuật, giúp bạn không chỉ đẹp hơn mà còn tự tin hơn mỗi khi nhìn vào gương. Đây là lựa chọn hoàn hảo dành cho những ai yêu cái đẹp, luôn muốn tạo dấu ấn riêng và không ngại đầu tư vào bản thân mình.',
N'/uploads/mi-thiet-ke.jpg'),

-- 11. Nối mi dưới
(11,
N'Nối mi dưới là bước hoàn hảo giúp cân bằng đôi mắt, tạo sự đồng đều và sắc nét cho tổng thể ánh nhìn. Dịch vụ này giúp làm nổi bật phần mi dưới vốn thường bị bỏ qua, đồng thời che khuyết điểm quầng thâm và bọng mắt một cách tinh tế. Sợi mi dưới được chọn lựa kỹ càng để đảm bảo sự mềm mại, tự nhiên và không gây cộm hay khó chịu. Sau khi nối, đôi mắt trở nên sâu và quyến rũ hơn, đặc biệt đẹp trong các buổi chụp ảnh cận mặt hoặc trang điểm chuyên nghiệp. Hãy thử một lần để thấy sự khác biệt rõ ràng!',
N'/uploads/noi-mi-duoi.jpg'),

-- 12. Dặm mi
(12,
N'Dặm mi là giải pháp lý tưởng để phục hồi và làm mới hàng mi đã nối sau một thời gian sử dụng. Dịch vụ này giúp bổ sung những vùng mi rụng, mất form và đồng thời làm đầy lại những phần thưa thớt mà không cần tháo nối lại từ đầu. Quá trình dặm mi diễn ra nhanh chóng, tiết kiệm thời gian nhưng vẫn mang lại hiệu quả rõ rệt, giúp hàng mi đều đẹp, bền bỉ như lúc mới nối. Thích hợp cho những ai bận rộn nhưng vẫn muốn giữ vẻ ngoài chỉn chu, thu hút. Hãy để chúng tôi giúp bạn luôn rạng rỡ và tự tin mỗi ngày!',
N'/uploads/dam-mi.jpg'),

-- 13. Tháo mi
(13,
N'Tháo mi là bước quan trọng trong chu trình làm đẹp mi, giúp bảo vệ mi thật khỏi những tổn thương khi bạn muốn đổi phong cách hoặc nghỉ nối mi. Dịch vụ tháo mi tại spa sử dụng dung dịch chuyên dụng an toàn, nhẹ dịu, không gây rát hay kích ứng mắt. Quy trình thực hiện bởi kỹ thuật viên giàu kinh nghiệm, đảm bảo nhẹ nhàng, nhanh chóng và không làm gãy rụng mi thật. Sau khi tháo, bạn có thể chăm sóc phục hồi mi tự nhiên hoặc chuẩn bị cho một bộ mi mới. Đừng tự ý tháo mi tại nhà, hãy đến với chúng tôi để được chăm sóc đúng cách!',
N'/uploads/thao-mi.jpg'),

-- 14. Uốn mi
(14,
N'Uốn mi là phương pháp làm cong mi tự nhiên mà không cần dùng đến mascara hay dụng cụ bấm mi mỗi ngày. Kỹ thuật này sử dụng dung dịch uốn chuyên dụng kết hợp với các thanh silicon định hình, giúp hàng mi của bạn cong vút, vào nếp và giữ được form lâu dài từ 4–6 tuần. Quy trình diễn ra nhẹ nhàng, không đau rát, thích hợp cho những ai có hàng mi thẳng, ngắn hoặc cụp xuống. Sau khi uốn, đôi mắt trở nên to tròn, long lanh hơn mà vẫn giữ được nét tự nhiên, không lộ dấu hiệu làm đẹp. Hãy thử một lần để cảm nhận sự khác biệt rõ rệt trong ánh nhìn!',
N'/uploads/uon-mi.jpg'),

-- 15. Cắt da móng
(15,
N'Dịch vụ cắt da móng là bước đầu tiên quan trọng trong quá trình chăm sóc móng tay, móng chân. Việc loại bỏ lớp da chết quanh viền móng không chỉ giúp móng trông gọn gàng, sạch sẽ mà còn giúp lớp sơn bám màu đều hơn, đẹp hơn và lâu trôi hơn. Tại spa của chúng tôi, kỹ thuật viên sử dụng dụng cụ vô trùng và thao tác nhẹ nhàng, tránh gây tổn thương vùng da xung quanh. Dịch vụ phù hợp cho cả nam và nữ, đặc biệt cần thiết cho những ai thường xuyên sơn gel hoặc làm nail định kỳ. Cắt da móng đều đặn còn giúp móng phát triển khỏe mạnh, sạch sẽ và tránh các bệnh về móng.',
N'/uploads/cat-da-mong.jpg');

--Hiển thị lệnh nhập cấu trúc dữ liệu hiện tại
DECLARE @sql NVARCHAR(MAX) = '';

SELECT @sql += 
    'CREATE TABLE ' + TABLE_NAME + ' (' + CHAR(13) +
    STRING_AGG(COLUMN_NAME + ' ' + DATA_TYPE + 
               CASE 
                   WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL 
                        THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS NVARCHAR(10)) + ')' 
                   ELSE '' 
               END, ', ' + CHAR(13)) + 
    ');' + CHAR(13) + CHAR(13)
FROM INFORMATION_SCHEMA.COLUMNS
GROUP BY TABLE_NAME;

PRINT @sql;
