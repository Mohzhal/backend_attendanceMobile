import { db } from "../config/db.js";


export const getAllCompanies = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id, 
        name, 
        address, 
        ST_Y(location) AS longitude,  -- SWAP: Y = longitude (DB terbalik)
        ST_X(location) AS latitude,   -- SWAP: X = latitude (DB terbalik)
        valid_radius_m,
        created_at
      FROM companies
      ORDER BY name ASC
    `);

    console.log(`✅ Retrieved ${rows.length} companies`);
    res.json(rows);
  } catch (error) {
    console.error("❌ Get all companies error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(`
      SELECT 
        id, 
        name, 
        address, 
        ST_Y(location) AS longitude,  -- SWAP
        ST_X(location) AS latitude,   -- SWAP
        valid_radius_m,
        created_at
      FROM companies
      WHERE id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ msg: "Perusahaan tidak ditemukan" });
    }

    const company = rows[0];

    console.log("✅ Company found:", {
      id: company.id,
      name: company.name,
      lat: company.latitude,
      lon: company.longitude,
      radius: company.valid_radius_m,
    });

    if (
      !company.latitude ||
      !company.longitude ||
      isNaN(company.latitude) ||
      isNaN(company.longitude)
    ) {
      console.error("❌ Koordinat perusahaan NULL atau tidak valid!");
      return res.status(500).json({
        msg: "Data lokasi perusahaan tidak lengkap. Silakan update koordinat kantor.",
      });
    }

    res.json(company);
  } catch (error) {
    console.error("❌ Get company by ID error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const createCompany = async (req, res) => {
  try {
    const { name, address, latitude, longitude, valid_radius_m } = req.body;

   
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        msg: "Nama, latitude, dan longitude wajib diisi",
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        msg: "Latitude dan Longitude harus berupa angka valid",
      });
    }

    console.log("🏢 Creating company:", { name, address, lat, lon, valid_radius_m });

    
    const [result] = await db.query(
      `
      INSERT INTO companies (name, address, location, valid_radius_m)
      VALUES (?, ?, ST_SRID(POINT(?, ?), 4326), ?)
    `,
      [name, address || "", lon, lat, valid_radius_m || 100]
    );

    console.log("✅ Company created with ID:", result.insertId);

    
    const [verify] = await db.query(
      `
      SELECT 
        id, 
        name, 
        ST_Y(location) AS longitude,
        ST_X(location) AS latitude,
        valid_radius_m
      FROM companies 
      WHERE id = ?
    `,
      [result.insertId]
    );

    res.status(201).json({
      msg: "Perusahaan berhasil ditambahkan",
      company: verify[0],
    });
  } catch (error) {
    console.error("❌ Create company error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, valid_radius_m } = req.body;

  
    const updates = [];
    const values = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }

    if (address !== undefined) {
      updates.push("address = ?");
      values.push(address);
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
          msg: "Latitude dan Longitude harus berupa angka valid",
        });
      }

      updates.push("location = ST_SRID(POINT(?, ?), 4326)");
      values.push(lon, lat);
    }

    if (valid_radius_m) {
      updates.push("valid_radius_m = ?");
      values.push(valid_radius_m);
    }

    if (updates.length === 0) {
      return res.status(400).json({ msg: "Tidak ada data yang diupdate" });
    }

    values.push(id);

    await db.query(`UPDATE companies SET ${updates.join(", ")} WHERE id = ?`, values);

    console.log("✅ Company updated:", { id, name });

    res.json({ msg: "Perusahaan berhasil diupdate" });
  } catch (error) {
    console.error("❌ Update company error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};


export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      "SELECT COUNT(*) AS count FROM users WHERE company_id = ?",
      [id]
    );

    if (users[0].count > 0) {
      return res.status(400).json({
        msg: "Tidak dapat menghapus perusahaan yang masih memiliki karyawan",
      });
    }

    const [result] = await db.query("DELETE FROM companies WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Perusahaan tidak ditemukan" });
    }

    console.log("✅ Company deleted, ID:", id);
    res.json({ msg: "Perusahaan berhasil dihapus" });
  } catch (error) {
    console.error("❌ Delete company error:", error);
    res.status(500).json({ msg: "Server error", error: error.message });
  }
};
