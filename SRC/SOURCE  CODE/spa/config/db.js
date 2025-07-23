const sql = require("mssql");

const dbConfig = {
  user: "sa",
  password: "246810",
  server: "DESKTOP-938DKPR",
  database: "spa",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const emailConfig = {
  user: "npb.duy.2002@gmail.com",
  pass: "fccgihkagjrlmvdx",
};

let pool;

async function connectDB() {
  try {
    pool = await sql.connect(dbConfig);
    console.log("✅ Database connected successfully.");
    return pool;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    throw err;
  }
}

async function query(sqlString, inputs = {}) {
  try {
    if (!pool) {
      await connectDB();
    }
    const request = pool.request();
    for (const [key, value] of Object.entries(inputs)) {
      request.input(key, value);
    }
    const result = await request.query(sqlString);
    console.log("Query result:", result); // Log để debug
    return result; // Trả về toàn bộ result thay vì chỉ recordset
  } catch (err) {
    console.error("Query failed:", err);
    throw err;
  }
}

module.exports = { sql, connectDB, query, emailConfig, pool };
