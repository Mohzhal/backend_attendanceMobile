import path from "path";
import fs from "fs";


export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "Tidak ada file yang diupload" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${baseUrl}/uploads/image/${req.file.filename}`;

    res.status(200).json({
      msg: "Upload berhasil",
      file_name: req.file.filename,
      url: fileUrl,
    });
  } catch (error) {
    console.error("❌ Upload image error:", error);
    res.status(500).json({ msg: "Gagal upload gambar" });
  }
};


export const uploadAbsensi = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "Tidak ada file yang diupload" });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const fileUrl = `${baseUrl}/uploads/absensi/${req.file.filename}`;

    res.status(200).json({
      msg: "Upload foto absensi berhasil",
      file_name: req.file.filename,
      url: fileUrl,
    });
  } catch (error) {
    console.error("❌ Upload absensi error:", error);
    res.status(500).json({ msg: "Gagal upload foto absensi" });
  }
};
