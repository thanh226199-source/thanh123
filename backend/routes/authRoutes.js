const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/**
 * ✅ Password rule (đồng bộ với UI hiện tại của bạn):
 * - Chữ cái đầu viết HOA
 * - Tối thiểu 6 ký tự
 * - Có ít nhất 1 ký tự đặc biệt
 */
const validatePassword = (password) => {
  const regex = /^[A-Z](?=.*[^A-Za-z0-9]).{5,}$/;
  return regex.test(password);
};

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    // ⚠️ CÁCH 1: không nhận role từ client nữa (tránh tự nâng quyền)
    const { username, email, password } = req.body;

    const u = (username || "").trim();
    const e = (email || "").trim();

    console.log("✅ REGISTER BODY =", { username: u, email: e ? "***" : "" });

    if (!u || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải: chữ đầu viết hoa, tối thiểu 6 ký tự và có ít nhất 1 ký tự đặc biệt",
      });
    }

    const exists = await User.findOne({ username: u });
    if (exists) {
      return res.status(409).json({ message: "Tài khoản đã tồn tại" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: u,
      email: e || undefined,
      passwordHash,
      // ✅ CÁCH 1: mặc định admin cho mọi tài khoản đăng ký mới
      role: "admin",
    });

    return res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Register error FULL:", err);

    // ✅ Bắt lỗi trùng unique index của MongoDB (E11000)
    if (err && err.code === 11000) {
      const field =
        Object.keys(err.keyPattern || err.keyValue || {})[0] || "dữ liệu";
      return res.status(409).json({
        message: `Trùng ${field}. Vui lòng dùng ${field} khác.`,
      });
    }

    return res.status(500).json({ message: "Lỗi server khi đăng ký" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const u = (username || "").trim();

    console.log("✅ LOGIN attempt:", u);

    if (!u || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password" });
    }

    const user = await User.findOne({ username: u });
    if (!user) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    // ✅ BẮT BUỘC có JWT_SECRET để khỏi lệch môi trường
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Thiếu JWT_SECRET trong file backend/.env" });
    }

    // ✅ Chuẩn hóa payload: dùng userId (đa số middleware lọc owner dùng userId)
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Login error FULL:", err);
    return res.status(500).json({ message: "Lỗi server khi đăng nhập" });
  }
});

module.exports = router;
