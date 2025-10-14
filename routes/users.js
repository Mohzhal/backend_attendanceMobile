import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { authenticate } from "../middleware/authMiddleware.js";
import { updateProfile, verifyUser } from "../controller/userController.js";

const router = express.Router();
const uploadDir = "uploads/image";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
      file.originalname
    )}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Format file tidak didukung"), false);
  },
});


router.post("/profile", authenticate, upload.single("profile_photo"), updateProfile);

router.put("/:id/verify", authenticate, verifyUser);

export default router;