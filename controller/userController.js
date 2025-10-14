import { db } from "../config/db.js";
import fs from "fs";
import path from "path";


export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id; 
    const { name, birth_place, birth_date, gender, company_id } = req.body;

    console.log("📩 Update profile request:", { userId, name, birth_place, gender, company_id });

   
    if (!userId || !name || !birth_place || !birth_date) {
      return res.status(400).json({ msg: "Nama, tempat, dan tanggal lahir wajib diisi" });
    }

    
    let profilePhotoUrl = null;
    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      profilePhotoUrl = `${baseUrl}/uploads/image/${req.file.filename}`;

     
      const [oldUser] = await db.query("SELECT profile_photo_url FROM users WHERE id = ?", [userId]);
      if (oldUser.length && oldUser[0].profile_photo_url) {
        const oldPath = path.join(
          process.cwd(),
          "uploads/image",
          path.basename(oldUser[0].profile_photo_url)
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    
    await db.query(
      `UPDATE users 
       SET 
         name = ?, 
         birth_place = ?, 
         birth_date = ?, 
         gender = ?, 
         company_id = ?, 
         profile_photo_url = COALESCE(?, profile_photo_url)
       WHERE id = ?`,
      [name, birth_place, birth_date, gender, company_id, profilePhotoUrl, userId]
    );

   
    const [updatedUser] = await db.query(
      `SELECT id, name, birth_place, birth_date, gender, company_id, profile_photo_url 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!updatedUser.length) {
      return res.status(404).json({ msg: "User tidak ditemukan setelah update" });
    }

    console.log("✅ Profil berhasil diperbarui untuk user:", updatedUser[0].name);

    return res.status(200).json({
      success: true,
      msg: "Profil berhasil diperbarui",
      user: updatedUser[0],
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ msg: "ID user wajib diisi" });

    await db.query(`UPDATE users SET is_verified = true WHERE id = ?`, [id]);
    console.log(`✅ User ${id} berhasil diverifikasi`);
    res.json({ success: true, msg: "User berhasil diverifikasi" });
  } catch (error) {
    console.error("❌ Verify user error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
