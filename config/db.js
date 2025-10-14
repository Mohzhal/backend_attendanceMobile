import fs from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Route sementara untuk import database
app.get("/import-db", (req, res) => {
  const sql = fs.readFileSync("./db/attendance-db.sql", "utf8");
  connection.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Import gagal");
    }
    res.send("Import SQL berhasil 🚀");
  });
});
