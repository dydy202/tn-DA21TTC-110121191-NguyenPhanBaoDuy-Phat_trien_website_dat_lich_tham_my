require("dotenv").config();
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const multer = require("multer");
const path = require("path");
const sql = require("mssql");
const fs = require("fs");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const { connectDB, query } = require("./config/db");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/trangadmin");
const trangkhachhangRoutes = require("./routes/trangkhachhang");
const nhanvienRoutes = require("./routes/trangnhanvien");

const app = express();
const PORT = process.env.PORT || 3000;

// Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadDir;
    if (req.baseUrl.includes("baiviet")) {
      uploadDir = path.join(__dirname, "public", "uploads", "baiviet");
    } else {
      uploadDir = path.join(__dirname, "public", "uploads", "khachhang");
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ được phép tải lên file ảnh (JPG, PNG)."));
    }
  },
});

// Gán upload vào app để sử dụng trong routes
app.set("upload", upload);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "my-very-secure-secret-1234567890",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000, sameSite: "lax" },
  })
);

app.use((req, res, next) => {
  console.log("Session ID:", req.sessionID); // Debug session
  console.log("Session Data:", req.session); // Debug session
  next();
});

app.use(flash());

// Middleware tạo và lưu CSRF token
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;
  console.log("Generated CSRF Token:", req.session.csrfToken); // Debug
  next();
});

// Middleware kiểm tra CSRF
app.use((req, res, next) => {
  if (
    req.method === "POST" &&
    [
      "/datlich",
      "/dangky",
      "/verify",
      "/quenmatkhau",
      "/verify-email",
      "/reset-password",
    ].includes(req.url)
  ) {
    return next(); // Bỏ qua kiểm tra CSRF cho các route này
  }

  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const submittedToken = req.body?._csrf || req.headers["x-csrf-token"];
    console.log(
      "Submitted CSRF:",
      submittedToken,
      "Session CSRF:",
      req.session.csrfToken
    );
    if (!submittedToken || submittedToken !== req.session.csrfToken) {
      req.flash("error", "CSRF token không hợp lệ.");
      return res.status(403).redirect(req.originalUrl || "/trangchu");
    }
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  next();
});

// Debug
app.use((req, res, next) => {
  console.log(
    `Yêu cầu: ${req.method} ${req.url}, Session:`,
    req.session ? req.session.user : "No session"
  );
  next();
});
app.use((req, res, next) => {
  if (req.method === "POST") {
    console.log(`POST Request URL: ${req.url}`);
    console.log("Request body:", req.body || "No body");
  }
  next();
});

// Static
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// View
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
console.log("Đang gắn route /admin với trangadmin.js");
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/", trangkhachhangRoutes);
app.use("/", nhanvienRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).send("Có lỗi xảy ra trên server.");
});

// Database
connectDB()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

console.log("✅ Email configuration đã được cấu hình.");

app.get("/favicon.ico", (req, res) => res.status(204).end());

process.on("SIGINT", () => {
  console.log("🚀 Server shutting down...");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server đang chạy trên http://localhost:${PORT}`);
});
