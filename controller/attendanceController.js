import { db } from "../config/db.js";

export const getAttendance = async (req, res) => {
  try {
    const user_id = req.user.id;

    const [rows] = await db.query(
      `SELECT a.id, a.user_id, a.company_id, a.type, a.photo_url,
              a.latitude, a.longitude, a.distance_m, a.is_valid, 
              a.created_at, c.name AS company_name
       FROM attendance a
       JOIN companies c ON a.company_id = c.id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC`,
      [user_id]
    );

    res.json(rows);
  } catch (error) {
    console.error("❌ Get attendance error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const createAttendance = async (req, res) => {
  try {
    const { type, lat_backup, lon_backup } = req.body;
    const user_id = req.user.id;

    console.log("=== START ATTENDANCE REQUEST ===");
    console.log("User ID:", user_id);
    console.log("Type:", type);
    console.log("Backup Location:", { lat: lat_backup, lon: lon_backup });

    // ✅ VALIDASI 1: Tipe absensi
    if (!type || !["checkin", "checkout"].includes(type)) {
      return res.status(400).json({ msg: "Type harus 'checkin' atau 'checkout'" });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "Foto wajib diupload" });
    }

    // ✅ VALIDASI 2: Cek apakah sudah check-in hari ini (untuk checkout)
    if (type === "checkout") {
      const today = new Date().toISOString().split('T')[0];
      const [checkinToday] = await db.query(
        `SELECT id FROM attendance 
         WHERE user_id = ? 
         AND type = 'checkin' 
         AND DATE(created_at) = ?`,
        [user_id, today]
      );

      if (checkinToday.length === 0) {
        return res.status(400).json({ 
          msg: "Anda harus melakukan check-in terlebih dahulu sebelum check-out.",
          error: "CHECKIN_REQUIRED"
        });
      }

      // ✅ VALIDASI 3: Cek apakah sudah checkout hari ini
      const [checkoutToday] = await db.query(
        `SELECT id FROM attendance 
         WHERE user_id = ? 
         AND type = 'checkout' 
         AND DATE(created_at) = ?`,
        [user_id, today]
      );

      if (checkoutToday.length > 0) {
        return res.status(400).json({ 
          msg: "Anda sudah melakukan check-out hari ini.",
          error: "ALREADY_CHECKOUT"
        });
      }
    }

    // ✅ VALIDASI 4: Cek duplikasi check-in
    if (type === "checkin") {
      const today = new Date().toISOString().split('T')[0];
      const [checkinToday] = await db.query(
        `SELECT id FROM attendance 
         WHERE user_id = ? 
         AND type = 'checkin' 
         AND DATE(created_at) = ?`,
        [user_id, today]
      );

      if (checkinToday.length > 0) {
        return res.status(400).json({ 
          msg: "Anda sudah melakukan check-in hari ini.",
          error: "ALREADY_CHECKIN"
        });
      }
    }

    // Get company
    const [userRows] = await db.query(
      "SELECT company_id FROM users WHERE id = ?",
      [user_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ msg: "User tidak ditemukan" });
    }

    const company_id = userRows[0].company_id;

    if (!company_id) {
      return res.status(400).json({ msg: "User belum terdaftar di perusahaan manapun" });
    }

    console.log("✅ Company ID:", company_id);

    // Parse EXIF
    const exifr = (await import("exifr")).default;
    let lat = null;
    let lon = null;

    try {
      const tags = await exifr.parse(req.file.path);
      if (tags && tags.latitude && tags.longitude) {
        lat = tags.latitude;
        lon = tags.longitude;
        console.log("📍 Lokasi dari EXIF:", { lat, lon });
      } else {
        console.log("⚠️ Tidak ada lokasi di EXIF, gunakan GPS backup.");
      }
    } catch (exifError) {
      console.warn("⚠️ EXIF parsing error:", exifError.message);
    }

    // Use backup GPS
    if (!lat || !lon) {
      if (!lat_backup || !lon_backup) {
        return res.status(400).json({
          msg: "Foto tidak memiliki data lokasi GPS dan tidak ada backup. Aktifkan GPS.",
        });
      }
      lat = parseFloat(lat_backup);
      lon = parseFloat(lon_backup);
      console.log("📍 Lokasi dari GPS backup:", { lat, lon });
    }

    // Validasi koordinat
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
      return res.status(400).json({ 
        msg: "Koordinat lokasi tidak valid. Pastikan GPS aktif dan izin lokasi diberikan." 
      });
    }

    // Validasi Indonesia
    if (lat < -11 || lat > 6 || lon < 95 || lon > 141) {
      return res.status(400).json({ 
        msg: "Koordinat berada di luar Indonesia. Periksa pengaturan GPS.",
        debug: { lat, lon }
      });
    }

    console.log("✅ Final User Location:", { lat, lon });

    // Get company location
    const [companyRows] = await db.query(
      `SELECT 
         ST_Y(location) AS company_lon,
         ST_X(location) AS company_lat,
         valid_radius_m,
         name
       FROM companies 
       WHERE id = ?`,
      [company_id]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({ msg: "Perusahaan tidak ditemukan" });
    }

    const company = companyRows[0];

    console.log("🏢 Company Data:", {
      name: company.name,
      lat: company.company_lat,
      lon: company.company_lon,
      radius: company.valid_radius_m
    });

    // Validasi koordinat perusahaan
    if (!company.company_lat || !company.company_lon || 
        isNaN(company.company_lat) || isNaN(company.company_lon) ||
        Math.abs(company.company_lat) < 0.0001 || Math.abs(company.company_lon) < 0.0001) {
      console.error("❌ Koordinat perusahaan tidak valid:", company);
      return res.status(500).json({ 
        msg: "Koordinat perusahaan tidak valid. Hubungi admin untuk memperbaiki data lokasi kantor.",
        debug: {
          company_lat: company.company_lat,
          company_lon: company.company_lon
        }
      });
    }

    if (company.company_lat < -11 || company.company_lat > 6 || 
        company.company_lon < 95 || company.company_lon > 141) {
      console.error("❌ Koordinat perusahaan di luar Indonesia:", company);
      return res.status(500).json({ 
        msg: "Koordinat perusahaan tidak valid. Lokasi berada di luar Indonesia.",
        debug: {
          company_lat: company.company_lat,
          company_lon: company.company_lon,
          expected: "Lat: -11 to 6, Lon: 95 to 141"
        }
      });
    }

    const photo_url = `/uploads/absensi/${req.file.filename}`;

    console.log("💾 Saving attendance to database...");

    // Insert attendance
    await db.query(
      `INSERT INTO attendance 
       (user_id, company_id, type, photo_url, location, latitude, longitude)
       VALUES (?, ?, ?, ?, ST_SRID(Point(?, ?), 4326), ?, ?)`,
      [user_id, company_id, type, photo_url, lon, lat, lat, lon]
    );

    // Get last inserted
    const [last] = await db.query(
      `SELECT id FROM attendance WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [user_id]
    );
    const attendance = last[0];

    console.log("✅ Attendance saved with ID:", attendance.id);

    // Calculate distance
    const [distanceRows] = await db.query(
      `SELECT 
         ST_Distance_Sphere(a.location, c.location) AS distance_m, 
         c.valid_radius_m
       FROM attendance a
       JOIN companies c ON a.company_id = c.id
       WHERE a.id = ?`,
      [attendance.id]
    );

    const distance_m = Math.round(distanceRows[0].distance_m);
    const is_valid = distance_m <= distanceRows[0].valid_radius_m;

    console.log("📏 Distance:", distance_m, "m");
    console.log("✅ Is Valid:", is_valid);

    // Update distance
    await db.query(
      `UPDATE attendance SET distance_m = ?, is_valid = ? WHERE id = ?`,
      [distance_m, is_valid, attendance.id]
    );

    console.log("=== ATTENDANCE SUCCESS ===");

    const response = {
      msg: is_valid
        ? `${type === 'checkin' ? 'Check-in' : 'Check-out'} berhasil ✅ (Jarak: ${distance_m}m)`
        : `${type === 'checkin' ? 'Check-in' : 'Check-out'} tercatat ⚠️ (${distance_m}m dari kantor, melebihi radius ${distanceRows[0].valid_radius_m}m)`,
      distance_m,
      is_valid,
      type,
      location: { 
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      },
      company_location: { 
        latitude: parseFloat(company.company_lat),
        longitude: parseFloat(company.company_lon)
      },
      photo_url,
    };

    console.log("📤 Response:", response);

    res.json(response);
  } catch (error) {
    console.error("❌ Attendance error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getAttendanceHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT 
         a.id, a.type, a.latitude, a.longitude, a.distance_m, a.is_valid,
         DATE_FORMAT(a.created_at, '%Y-%m-%d') AS date,
         DATE_FORMAT(a.created_at, '%H:%i:%s') AS time,
         c.name AS company_name
       FROM attendance a
       JOIN companies c ON a.company_id = c.id
       WHERE a.user_id = ?
         AND (a.type = 'checkin' OR a.type = 'checkout')
       ORDER BY a.created_at DESC`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Tidak ada riwayat absensi untuk user ini." });
    }

    const grouped = rows.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {
          date: item.date,
          company_name: item.company_name,
          checkin: null,
          checkout: null,
          lat: item.latitude,
          lon: item.longitude,
          distance_m: item.distance_m,
          is_valid: item.is_valid,
        };
      }
      if (item.type === "checkin") {
        acc[item.date].checkin = item.time;
        acc[item.date].checkin_distance = item.distance_m;
      }
      if (item.type === "checkout") {
        acc[item.date].checkout = item.time;
        acc[item.date].checkout_distance = item.distance_m;
      }
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("❌ Get attendance history error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getTodayAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const [rows] = await db.query(
      `SELECT a.type, a.latitude, a.longitude, a.distance_m, a.is_valid,
              DATE_FORMAT(a.created_at, '%H:%i:%s') AS time, 
              c.name AS company_name,
              ST_Y(c.location) AS company_lat,
              ST_X(c.location) AS company_lon
       FROM attendance a
       JOIN companies c ON a.company_id = c.id
       WHERE a.user_id = ? AND DATE(a.created_at) = ?
       ORDER BY a.created_at ASC`,
      [id, today]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Belum ada absensi hari ini." });
    }

    const data = {
      date: today,
      company_name: rows[0].company_name,
      company_location: {
        lat: rows[0].company_lat,
        lon: rows[0].company_lon,
      },
      checkin: null,
      checkout: null,
      lat: null,
      lon: null,
    };

    rows.forEach((row) => {
      if (row.type === "checkin") {
        data.checkin = row.time;
        data.lat = row.latitude;
        data.lon = row.longitude;
        data.checkin_distance = row.distance_m;
        data.checkin_valid = row.is_valid;
      }
      if (row.type === "checkout") {
        data.checkout = row.time;
        data.checkout_distance = row.distance_m;
        data.checkout_valid = row.is_valid;
      }
    });

    res.json(data);
  } catch (error) {
    console.error("❌ Get today attendance error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const getCompanyAttendance = async (req, res) => {
  try {
    const { company_id } = req.params;
    const { period } = req.query;

    console.log("📊 Fetching company attendance:", { company_id, period });

    let dateFilter = "";
    if (period === "today") {
      dateFilter = "AND DATE(a.created_at) = CURDATE()";
    } else if (period === "week") {
      dateFilter = "AND YEARWEEK(a.created_at, 1) = YEARWEEK(CURDATE(), 1)";
    } else if (period === "month") {
      dateFilter = "AND MONTH(a.created_at) = MONTH(CURDATE()) AND YEAR(a.created_at) = YEAR(CURDATE())";
    }

    const [rows] = await db.query(
      `SELECT 
        a.id,
        a.user_id,
        u.name AS user_name,
        u.profile_photo_url,
        a.company_id,
        c.name AS company_name,
        a.type,
        a.photo_url,
        a.latitude,
        a.longitude,
        a.distance_m AS distance,
        a.is_valid,
        DATE(a.created_at) AS date,
        a.created_at,
        ST_Y(c.location) AS company_lat,
        ST_X(c.location) AS company_lon
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      JOIN companies c ON a.company_id = c.id
      WHERE a.company_id = ?
      ${dateFilter}
      ORDER BY a.created_at DESC`,
      [company_id]
    );

    console.log(`✅ Found ${rows.length} attendance records`);

    if (!rows.length) {
      return res.json([]);
    }

    const result = rows.map(item => ({
      id: item.id,
      user_id: item.user_id,
      user_name: item.user_name,
      profile_photo_url: item.profile_photo_url,
      type: item.type,
      date: item.date,
      created_at: item.created_at,
      distance: item.distance,
      is_valid: item.is_valid,
      latitude: item.latitude,
      longitude: item.longitude,
      company_lat: item.company_lat,
      company_lon: item.company_lon
    }));

    res.json(result);
  } catch (error) {
    console.error("❌ Get company attendance error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const validateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_valid } = req.body;

    if (typeof is_valid !== "boolean") {
      return res.status(400).json({ msg: "is_valid harus berupa boolean" });
    }

    await db.query(
      `UPDATE attendance SET is_valid = ? WHERE id = ?`, 
      [is_valid, id]
    );

    console.log(`✅ Attendance ${id} validation updated to:`, is_valid);

    res.json({
      msg: is_valid ? "Absensi divalidasi ✅" : "Absensi ditolak ❌",
      status: is_valid,
    });
  } catch (error) {
    console.error("❌ Validate attendance error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};