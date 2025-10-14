import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";


export const register = async (req, res) => {
  try {
    const { 
      name, nik, password, role, 
      birth_place, birth_date, gender, company_id,
      company_name, address, lon, lat, valid_radius_m,
      profile_photo_url 
    } = req.body;

    console.log("📥 Data registrasi diterima:", req.body);

   
    if (!name || !nik || !password || !role) {
      return res.status(400).json({ msg: "Nama, NIK, password, dan role wajib diisi" });
    }

    
    if (!["hr", "karyawan"].includes(role)) {
      return res.status(400).json({ msg: "Role harus 'hr' atau 'karyawan'" });
    }

    let finalCompanyId = company_id;

   
    if (role === "hr") {
      if (!company_name || lon === undefined || lat === undefined) {
        console.log("❌ Data perusahaan tidak lengkap:", { company_name, lon, lat });
        return res.status(400).json({ 
          msg: "HR harus mengisi nama perusahaan dan lokasi (lon, lat)" 
        });
      }

      const longitude = parseFloat(lon);
      const latitude = parseFloat(lat);

      if (isNaN(longitude) || isNaN(latitude)) {
        return res.status(400).json({ msg: "Longitude dan Latitude harus berupa angka valid" });
      }

      console.log("🏢 Membuat perusahaan baru:", { 
        company_name, 
        address: address || "", 
        lon: longitude, 
        lat: latitude,
        valid_radius_m: valid_radius_m || 100
      });

      
      const [companyResult] = await db.query(`
        INSERT INTO companies (name, address, location, valid_radius_m)
        VALUES (?, ?, ST_SRID(POINT(?, ?), 4326), ?)
      `, [
        company_name, 
        address || "", 
        longitude,  
        latitude,   
        valid_radius_m || 100
      ]);

      finalCompanyId = companyResult.insertId;
      console.log("✅ Perusahaan dibuat dengan ID:", finalCompanyId);

      
      const [verifyCompany] = await db.query(`
        SELECT id, name, 
               ST_X(location) AS lon, 
               ST_Y(location) AS lat,
               valid_radius_m
        FROM companies 
        WHERE id = ?
      `, [finalCompanyId]);

      console.log("✅ Verifikasi data perusahaan:", verifyCompany[0]);
    }

   
    if (role === "karyawan") {
      if (!company_id || !birth_place || !birth_date || !gender) {
        return res.status(400).json({ 
          msg: "Karyawan harus mengisi tempat lahir, tanggal lahir, gender, dan pilih perusahaan" 
        });
      }
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

   
    const [userResult] = await db.query(`
      INSERT INTO users (
        name, nik, password, role, 
        birth_place, birth_date, gender, 
        company_id, profile_photo_url, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, 
      nik, 
      hashedPassword, 
      role,
      birth_place || null, 
      birth_date || null, 
      gender || null,
      finalCompanyId,
      profile_photo_url || null,
      role === "hr" ? 1 : 0 
    ]);

    console.log(`✅ User ${role} berhasil dibuat dengan ID:`, userResult.insertId);

    res.status(201).json({ 
      msg: role === "hr" 
        ? "HR dan perusahaan berhasil dibuat!" 
        : "Registrasi karyawan berhasil! Tunggu verifikasi dari HR.",
      userId: userResult.insertId,
      companyId: finalCompanyId
    });

  } catch (error) {
    console.error("❌ Error register:", error);
    
  
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ msg: "NIK sudah terdaftar" });
    }
    
    res.status(500).json({ msg: "Server error: " + error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { nik, password } = req.body;

    if (!nik || !password) {
      return res.status(400).json({ msg: "NIK dan password wajib diisi" });
    }

  
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.nik,
        u.role,
        u.birth_place,
        u.birth_date,
        u.gender,
        u.profile_photo_url,
        u.company_id,
        u.is_verified,
        u.password,
        c.name as company_name,
        ST_X(c.location) AS company_lon,
        ST_Y(c.location) AS company_lat,
        c.valid_radius_m
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.nik = ?
    `, [nik]);

    if (users.length === 0) {
      return res.status(401).json({ msg: "NIK atau password salah" });
    }

    const user = users[0];

  
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "NIK atau password salah" });
    }


    if (user.role !== "super_admin" && !user.is_verified) {
      return res.status(403).json({ msg: "Akun Anda belum diverifikasi oleh HR" });
    }

  
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        company_id: user.company_id 
      },
      process.env.JWT_SECRET || "your_secret_key_here",
      { expiresIn: "30d" }
    );

    
    const { password: _, ...userWithoutPassword } = user;

    console.log("✅ Login berhasil:", { id: user.id, name: user.name, role: user.role });

    res.json({
      msg: "Login berhasil",
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("❌ Error login:", error);
    res.status(500).json({ msg: "Server error: " + error.message });
  }
};