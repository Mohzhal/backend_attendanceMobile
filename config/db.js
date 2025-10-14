// config/db.js
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.resolve();

// 🔹 Buat koneksi pool ke Railway
export const db = await mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 🔹 Jalankan import SQL hanya kalau file ada
const sqlFilePath = path.join(__dirname, "db", "attendance-db.sql");

async function importSQL() {
  try {
    if (!fs.existsSync(sqlFilePath)) {
      console.log("⚠️ File SQL tidak ditemukan:", sqlFilePath);
      return;
    }

    const sql = fs.readFileSync(sqlFilePath, "utf8");
    const connection = await db.getConnection();

    console.log("🚀 Mengimpor database ke MySQL Railway...");
    await connection.query(sql);
    connection.release();

    console.log("✅ Database berhasil di-import dari attendance-db.sql");
  } catch (err) {
    console.error("❌ Gagal import SQL:", err.message);
  }
}

// Jalankan hanya saat pertama kali (bisa di-comment setelah import sukses)
await importSQL();
