import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { db } from "../config/db.js";

dotenv.config();

// ========================================
// AUTHENTICATE MIDDLEWARE
// ========================================
export const authenticate = async (req, res, next) => {
  try {
    // 1. Cek header authorization
    const authHeader = req.headers.authorization;
    
    console.log("🔐 Auth Middleware - Checking authorization...");
    console.log("📋 Headers:", {
      authorization: authHeader ? "Present" : "Missing",
      contentType: req.headers["content-type"]
    });
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Auth failed: No Bearer token");
      return res.status(401).json({ 
        msg: "Token tidak ditemukan. Silakan login terlebih dahulu.",
        code: "NO_TOKEN"
      });
    }

    // 2. Extract token
    const token = authHeader.split(" ")[1];
    
    if (!token || token === "null" || token === "undefined") {
      console.log("❌ Auth failed: Invalid token format");
      return res.status(401).json({ 
        msg: "Token tidak valid",
        code: "INVALID_TOKEN_FORMAT"
      });
    }

    console.log("🔑 Token received (first 20 chars):", token.substring(0, 20) + "...");

    // 3. Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token verified:", {
        id: decoded.id,
        role: decoded.role,
        company_id: decoded.company_id,
        iat: new Date(decoded.iat * 1000).toISOString(),
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (jwtError) {
      console.error("❌ JWT verification failed:", jwtError.message);
      
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ 
          msg: "Token sudah kadaluarsa. Silakan login kembali.",
          code: "TOKEN_EXPIRED",
          expiredAt: jwtError.expiredAt
        });
      }
      
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ 
          msg: "Token tidak valid atau rusak",
          code: "INVALID_TOKEN"
        });
      }
      
      return res.status(401).json({ 
        msg: "Gagal memverifikasi token",
        code: "VERIFICATION_FAILED"
      });
    }

    // 4. Ambil data lengkap user dari database
    console.log("📊 Fetching user data from database...");
    
    const [rows] = await db.query(
      `SELECT 
        u.id,
        u.name,
        u.nik,
        u.role,
        u.company_id,
        u.is_verified,
        u.birth_place,
        u.birth_date,
        u.gender,
        u.profile_photo_url,
        c.name as company_name,
        ST_Y(c.location) AS company_lon,
        ST_X(c.location) AS company_lat,
        c.valid_radius_m
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.id = ?`,
      [decoded.id]
    );

    // 5. Validasi user exists
    if (rows.length === 0) {
      console.log("❌ User not found in database:", decoded.id);
      return res.status(404).json({ 
        msg: "User tidak ditemukan. Akun mungkin sudah dihapus.",
        code: "USER_NOT_FOUND"
      });
    }

    const user = rows[0];

    // 6. Validasi user aktif (opsional, bisa disesuaikan)
    if (user.is_verified === 0 && user.role === "karyawan") {
      console.log("⚠️ User not verified:", user.id);
      // Uncomment jika ingin memblokir user yang belum diverifikasi
      // return res.status(403).json({ 
      //   msg: "Akun Anda belum diverifikasi oleh HR",
      //   code: "NOT_VERIFIED"
      // });
    }

    // 7. Attach user data ke request
    req.user = {
      id: user.id,
      name: user.name,
      nik: user.nik,
      role: user.role,
      company_id: user.company_id,
      is_verified: user.is_verified,
      birth_place: user.birth_place,
      birth_date: user.birth_date,
      gender: user.gender,
      profile_photo_url: user.profile_photo_url,
      company_name: user.company_name,
      company_lon: user.company_lon,
      company_lat: user.company_lat,
      valid_radius_m: user.valid_radius_m
    };

    console.log("✅ User authenticated successfully:", {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      company_id: req.user.company_id,
      company_name: req.user.company_name
    });

    // 8. Lanjutkan ke next middleware/controller
    next();

  } catch (error) {
    console.error("❌ Authentication error:", error);
    
    // Database error
    if (error.code === "ER_BAD_DB_ERROR") {
      return res.status(500).json({ 
        msg: "Database tidak tersedia",
        code: "DB_ERROR"
      });
    }

    // General error
    return res.status(500).json({ 
      msg: "Terjadi kesalahan saat autentikasi",
      error: error.message,
      code: "AUTH_ERROR"
    });
  }
};

// ========================================
// AUTHORIZE ROLES MIDDLEWARE (OPSIONAL)
// ========================================
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log("🔒 Checking role authorization...");
    console.log("User role:", req.user?.role);
    console.log("Allowed roles:", allowedRoles);

    if (!req.user) {
      return res.status(401).json({ 
        msg: "User tidak terautentikasi",
        code: "NOT_AUTHENTICATED"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log("❌ Role not authorized");
      return res.status(403).json({ 
        msg: `Akses ditolak. Hanya ${allowedRoles.join(", ")} yang dapat mengakses.`,
        code: "ROLE_NOT_AUTHORIZED",
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    console.log("✅ Role authorized");
    next();
  };
};

// ========================================
// CHECK HR ACCESS MIDDLEWARE
// ========================================
export const checkHRAccess = (req, res, next) => {
  console.log("🔐 Checking HR Access:", {
    userId: req.user?.id,
    role: req.user?.role,
    companyId: req.user?.company_id
  });

  if (!req.user) {
    return res.status(401).json({ 
      msg: "User tidak terautentikasi",
      code: "NOT_AUTHENTICATED"
    });
  }

  const userRole = req.user.role;
  
  // Cek apakah user adalah HR atau Super Admin
  if (userRole !== "hr" && userRole !== "super_admin") {
    console.log("❌ Access denied - Not HR or Super Admin");
    return res.status(403).json({
      msg: "Akses ditolak. Hanya HR atau Super Admin yang dapat mengakses endpoint ini.",
      code: "HR_ACCESS_DENIED",
      userRole: userRole
    });
  }

  // Validasi company_id untuk HR biasa
  if (userRole === "hr" && !req.user.company_id) {
    console.log("❌ HR has no company_id");
    return res.status(403).json({
      msg: "HR tidak memiliki company_id yang valid. Hubungi administrator.",
      code: "NO_COMPANY_ID"
    });
  }
  
  console.log("✅ HR Access granted");
  next();
};