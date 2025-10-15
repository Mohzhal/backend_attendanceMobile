import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  createAttendance,
  getAttendance,
  getAttendanceHistoryById,
  getTodayAttendanceById,
  getCompanyAttendance,
  validateAttendance,
} from "../controller/attendanceController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(process.cwd(), "uploads", "absensi");


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Folder created: ${uploadDir}`);
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});


const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Format file tidak didukung. Hanya JPG/PNG."), false);
  },
});


const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
  
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ msg: "Ukuran file maksimal 5MB." });
    }
    return res.status(400).json({ msg: `Upload gagal: ${err.message}` });
  } else if (err) {
   
    return res.status(400).json({ msg: err.message || "Upload foto gagal." });
  }
  next();
};


router.get("/", authenticate, getAttendance);


router.post("/", authenticate, upload.single("photo"), handleUploadError, createAttendance);


router.get("/history/:id", authenticate, getAttendanceHistoryById);

router.get("/history/today/:id", authenticate, getTodayAttendanceById);


router.get("/company/:company_id", authenticate, getCompanyAttendance);


router.put("/:id/validate", authenticate, validateAttendance);

export default router;
