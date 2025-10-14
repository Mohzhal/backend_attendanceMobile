import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { uploadImage, uploadAbsensi } from "../controller/uploadsController.js";

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
  
    let uploadDir;
    
  if (req.path.includes("absensi")) {
  uploadDir = path.join(process.cwd(), "uploads", "absensi");
} else {
  uploadDir = path.join(process.cwd(), "uploads", "image");
}


    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Folder created: ${uploadDir}`);
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});


const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Hanya JPG/PNG."), false);
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter
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


router.post("/image", upload.single("image"), handleUploadError, uploadImage);


router.post("/absensi", upload.single("image"), handleUploadError, uploadAbsensi);

export default router;