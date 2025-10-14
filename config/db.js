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
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 🔹 Path file SQL lokal
const sqlFilePath = path.join(__dirname, "db", "attendance-db.sql");

// 🔹 Fungsi untuk mengimpor SQL otomatis
async function importSQL() {
  try {
    // Cek apakah file SQL ada
    if (!fs.existsSync(sqlFilePath)) {
      console.log("⚠️ File SQL tidak ditemukan di:", sqlFilePath);
      return;
    }

    // Baca isi SQL
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Jalankan SQL ke database
    const connection = await db.getConnection();
    await connection.query(sql);
    connection.release();

    console.log("✅ Database berhasil di-import dari attendance-db.sql");
  } catch (err) {
    console.error("❌ Gagal import SQL:", err.message);
  }
}

// Jalankan import hanya sekali saat server start
await importSQL();
