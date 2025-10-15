import { db } from "../config/db.js";

// ========================================
// GET APPLICANTS BY COMPANY
// ========================================
export const getApplicantsByCompany = async (req, res) => {
  try {
    const hrCompanyId = req.user.company_id;
    const hrRole = req.user.role;
    
    console.log("🔍 HR Request:", {
      hrId: req.user.id,
      hrName: req.user.name,
      hrCompanyId,
      hrRole,
    });
    
    // Validasi role
    if (hrRole !== "hr" && hrRole !== "super_admin") {
      return res.status(403).json({
        msg: "Hanya HR atau Super Admin yang dapat mengakses halaman ini"
      });
    }
    
    // Validasi company_id untuk HR
    if (!hrCompanyId && hrRole === "hr") {
      return res.status(403).json({
        msg: "HR tidak memiliki company_id yang valid"
      });
    }

    // Query SQL
    let query = `
      SELECT 
        u.id,
        u.name,
        u.nik,
        u.birth_place,
        u.birth_date,
        u.gender,
        u.profile_photo_url,
        u.company_id,
        u.is_verified,
        u.role,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.role = 'karyawan'
        AND u.is_verified = 0
    `;
    
    const params = [];
    
    // Filter berdasarkan company untuk HR
    if (hrRole === "hr") {
      query += ` AND u.company_id = ?`;
      params.push(hrCompanyId);
    }
    
    query += ` ORDER BY u.id DESC`;
    
    console.log("📝 SQL Query:", query);
    console.log("📝 Params:", params);
    
    const [rows] = await db.query(query, params);
    
    console.log("✅ Found applicants:", rows.length);
    
    // Format response
    const formattedRows = rows.map(row => ({
      id: row.id,
      name: row.name,
      nik: row.nik,
      birth_place: row.birth_place,
      birth_date: row.birth_date,
      gender: row.gender,
      profile_photo_url: row.profile_photo_url,
      company_id: row.company_id,
      company_name: row.company_name,
      is_verified: row.is_verified,
      role: row.role,
    }));
    
    return res.status(200).json(formattedRows);
    
  } catch (error) {
    console.error("❌ Get applicants error:", error);
    return res.status(500).json({
      msg: "Terjadi kesalahan server",
      error: error.message
    });
  }
};

// ========================================
// VERIFY APPLICANT
// ========================================
export const verifyApplicant = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const hrCompanyId = req.user.company_id;
    const hrRole = req.user.role;
    
    console.log("🔍 Verify Request:", {
      applicantId: id,
      status,
      hrCompanyId,
      hrRole,
      hrId: req.user.id,
    });
    
    // Validasi status
    if (!status || (status !== "approved" && status !== "rejected")) {
      return res.status(400).json({
        msg: "Status harus 'approved' atau 'rejected'"
      });
    }
    
    // Ambil data pelamar
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.company_id, u.role, u.is_verified, c.name as company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ msg: "Pelamar tidak ditemukan" });
    }
    
    const applicant = rows[0];
    console.log("👤 Applicant data:", applicant);
    
    // Validasi role pelamar
    if (applicant.role !== "karyawan") {
      return res.status(400).json({
        msg: "Hanya karyawan yang dapat diverifikasi"
      });
    }
    
    // Validasi akses HR
    if (hrRole === "hr") {
      if (!applicant.company_id) {
        return res.status(400).json({
          msg: "Pelamar belum memilih perusahaan"
        });
      }
      
      if (applicant.company_id !== hrCompanyId) {
        return res.status(403).json({
          msg: "Anda tidak dapat memverifikasi pelamar dari perusahaan lain",
          detail: `Pelamar berada di perusahaan: ${applicant.company_name || 'Unknown'}`
        });
      }
    }
    
    // Update status verifikasi
    const isVerified = status === "approved" ? 1 : 0;
    
    await db.query(
      `UPDATE users SET is_verified = ? WHERE id = ?`,
      [isVerified, id]
    );
    
    console.log(`✅ Applicant ${applicant.name} ${isVerified ? 'approved' : 'rejected'}`);
    
    return res.status(200).json({
      msg: `Pelamar ${applicant.name} berhasil ${isVerified ? "disetujui ✅" : "ditolak ❌"}`,
      status: status,
      applicant: {
        id: applicant.id,
        name: applicant.name,
        is_verified: isVerified,
      }
    });
    
  } catch (error) {
    console.error("❌ Verification error:", error);
    return res.status(500).json({
      msg: "Terjadi kesalahan saat memproses verifikasi",
      error: error.message
    });
  }
};

// ========================================
// GET VERIFIED EMPLOYEES
// ========================================
export const getVerifiedEmployees = async (req, res) => {
  try {
    const hrCompanyId = req.user.company_id;
    const hrRole = req.user.role;
    
    console.log("🔍 Get verified employees:", {
      hrId: req.user.id,
      hrCompanyId,
      hrRole
    });
    
    let query = `
      SELECT 
        u.id,
        u.name,
        u.nik,
        u.birth_place,
        u.birth_date,
        u.gender,
        u.profile_photo_url,
        u.company_id,
        u.is_verified,
        c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.role = 'karyawan'
        AND u.is_verified = 1
    `;
    
    const params = [];
    
    if (hrRole === "hr") {
      query += ` AND u.company_id = ?`;
      params.push(hrCompanyId);
    }
    
    query += ` ORDER BY u.name ASC`;
    
    const [rows] = await db.query(query, params);
    
    console.log("✅ Found verified employees:", rows.length);
    
    return res.status(200).json(rows);
    
  } catch (error) {
    console.error("❌ Get verified employees error:", error);
    return res.status(500).json({
      msg: "Terjadi kesalahan server",
      error: error.message
    });
  }
};