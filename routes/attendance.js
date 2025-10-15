import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateToken } from "../middleware/auth.js";
import {
  getAttendance,
  createAttendance,
  getAttendanceHistoryById,
  getTodayAttendanceById,
  getCompanyAttendance,
  validateAttendance,
} from "../controller/attendanceController.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Ensure attendance upload directory exists
const absensiDir = path.join(process.cwd(), "uploads/absensi");
if (!fs.existsSync(absensiDir)) {
  fs.mkdirSync(absensiDir, { recursive: true });
  console.log(`📁 Created directory: ${absensiDir}`);
}

// 🔹 Multer configuration for attendance photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, absensiDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `absensi-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Hanya file gambar (jpeg, jpg, png) yang diperbolehkan"));
    }
  },
});

// 🔹 Routes

// Get user's own attendance records
router.get("/", authenticateToken, getAttendance);

// Create new attendance (check-in/check-out)
router.post("/", authenticateToken, upload.single("photo"), createAttendance);

// Get attendance history by user ID
router.get("/history/:id", authenticateToken, getAttendanceHistoryById);

// Get today's attendance by user ID
router.get("/today/:id", authenticateToken, getTodayAttendanceById);

// Get company attendance records (for HR/Admin)
// This is the endpoint that was missing!
router.get("/company/:company_id", authenticateToken, getCompanyAttendance);

// Validate/update attendance status
router.put("/validate/:id", authenticateToken, validateAttendance);

// 🔹 Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        msg: "File terlalu besar. Maksimal 10MB untuk foto absensi",
      });
    }
    return res.status(400).json({
      msg: "Error upload: " + error.message,
    });
  } else if (error) {
    return res.status(400).json({
      msg: error.message,
    });
  }
  next();
});

export default router;