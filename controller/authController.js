import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { executeQuery } from "../config/db.js";

// 🔹 Helper function untuk generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// 🔹 Register User
export const register = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role = "user", 
      companyId, 
      phone 
    } = req.body;

    // Validasi input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        msg: "Name, email, and password are required" 
      });
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        msg: "Invalid email format" 
      });
    }

    // Validasi password length
    if (password.length < 6) {
      return res.status(400).json({ 
        msg: "Password must be at least 6 characters" 
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await executeQuery(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        msg: "Email already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user baru
    const result = await executeQuery(
      `INSERT INTO users (name, email, password, role, company_id, phone, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [name, email, hashedPassword, role, companyId || null, phone || null]
    );

    // Generate token
    const token = generateToken(result.insertId, role);

    console.log(`✅ New user registered: ${email}`);

    res.status(201).json({
      msg: "User registered successfully",
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role,
        companyId: companyId || null,
      },
    });
  } catch (error) {
    console.error("❌ Error register:", error);
    res.status(500).json({ 
      msg: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔹 Login User
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({ 
        msg: "Email and password are required" 
      });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // Cari user berdasarkan email dengan retry logic
    const users = await executeQuery(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      console.log(`❌ Login failed: User not found - ${email}`);
      return res.status(401).json({ 
        msg: "Invalid email or password" 
      });
    }

    const user = users[0];

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`❌ Login failed: Invalid password - ${email}`);
      return res.status(401).json({ 
        msg: "Invalid email or password" 
      });
    }

    // Update last login
    await executeQuery(
      "UPDATE users SET last_login = NOW() WHERE id = ?",
      [user.id]
    ).catch(err => console.error("Failed to update last_login:", err));

    // Generate token
    const token = generateToken(user.id, user.role);

    console.log(`✅ Login successful: ${email}`);

    res.json({
      msg: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("❌ Error login:", error);
    
    // Handle specific database errors
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({ 
        msg: "Database connection lost. Please try again." 
      });
    }
    
    res.status(500).json({ 
      msg: "Server error during login",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔹 Get Current User Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.userId; // dari middleware auth

    const users = await executeQuery(
      `SELECT id, name, email, role, company_id, phone, profile_picture, created_at, last_login 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        msg: "User not found" 
      });
    }

    res.json({
      msg: "Profile fetched successfully",
      user: users[0],
    });
  } catch (error) {
    console.error("❌ Error get profile:", error);
    res.status(500).json({ 
      msg: "Server error fetching profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔹 Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phone, profilePicture } = req.body;

    const updates = [];
    const values = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }
    if (phone) {
      updates.push("phone = ?");
      values.push(phone);
    }
    if (profilePicture) {
      updates.push("profile_picture = ?");
      values.push(profilePicture);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        msg: "No fields to update" 
      });
    }

    values.push(userId);

    await executeQuery(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    );

    // Fetch updated user
    const users = await executeQuery(
      "SELECT id, name, email, role, company_id, phone, profile_picture FROM users WHERE id = ?",
      [userId]
    );

    console.log(`✅ Profile updated for user ID: ${userId}`);

    res.json({
      msg: "Profile updated successfully",
      user: users[0],
    });
  } catch (error) {
    console.error("❌ Error update profile:", error);
    res.status(500).json({ 
      msg: "Server error updating profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔹 Change Password
export const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        msg: "Old password and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        msg: "New password must be at least 6 characters" 
      });
    }

    // Get current password
    const users = await executeQuery(
      "SELECT password FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        msg: "User not found" 
      });
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, users[0].password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        msg: "Old password is incorrect" 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await executeQuery(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashedPassword, userId]
    );

    console.log(`✅ Password changed for user ID: ${userId}`);

    res.json({
      msg: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Error change password:", error);
    res.status(500).json({ 
      msg: "Server error changing password",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
};