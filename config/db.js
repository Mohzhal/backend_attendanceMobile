// config/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

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

console.log("✅ Database connection pool created successfully");