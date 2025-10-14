import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { db } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/uploads.js";
import userRoutes from "./routes/users.js";
import attendanceRoutes from "./routes/attendance.js";
import companyRoutes from "./routes/companies.js";
import hrRoutes from "./routes/hrRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


app.use(cors());
app.use(express.json());


app.use("/uploads", express.static(path.join(__dirname, "uploads")));

console.log(`📁 Static files served from: ${path.join(__dirname, "uploads")}`);


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/upload", uploadRoutes);


app.get("/", (req, res) => {
  res.json({ 
    message: "✅ Backend API is running!",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      companies: "/api/companies",
      attendance: "/api/attendance",
      upload: "/api/upload"
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ msg: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ 
    msg: "Internal server error", 
    error: err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
});

export default app;