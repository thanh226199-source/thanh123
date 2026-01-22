// backend/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * ✅ Password rule (đồng bộ với UI của bạn):
 * - Chữ cái đầu viết HOA
 * - Tối thiểu 6 ký tự
 * - Có ít nhất 1 ký tự đặc biệt
 */
const validatePassword = (password) => {
  if (typeof password !== "string") return false;
  const p = password.trim();
  if (p.length < 6) return false;
  if (!/^[A-Z]/.test(p)) return false;
  // ký tự đặc biệt (bạn có thể nới/siết tùy ý)
  if (!/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(p)) return false;
  return true;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Không fallback để khỏi “lệch secret” giữa các file
    throw new Error("JWT_SECRET is missing in backend/.env");
  }
  return secret;
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const u = (username || "").trim();
    const e = (email || "").trim();

    if (!u || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải: chữ cái đầu viết HOA, tối thiểu 6 ký tự và có ít nhất 1 ký tự đặc biệt",
      });
    }

    const existing = await User.findOne({ username: u });
    if (existing) {
      return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    if (e) {
      const existingEmail = await User.findOne({ email: e });
      if (existingEmail) {
        return res.status(409).json({ message: "Email đã tồn tại" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ CÁCH 1: mặc định admin cho mọi tài khoản đăng ký mới
    const user = await User.create({
      username: u,
      email: e || undefined,
      passwordHash,
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
    console.error("❌ Register error:", err);
    if (String(err?.message || "").includes("JWT_SECRET is missing")) {
      return res.status(500).json({ message: "Thiếu JWT_SECRET trong backend/.env" });
    }
    return res.status(500).json({ message: "Lỗi server" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const u = (username || "").trim();
    if (!u || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password" });
    }

    const user = await User.findOne({ username: u });
    if (!user) {
      return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role || "admin" },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role || "admin",
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    if (String(err?.message || "").includes("JWT_SECRET is missing")) {
      return res.status(500).json({ message: "Thiếu JWT_SECRET trong backend/.env" });
    }
    return res.status(500).json({ message: "Lỗi server" });
  }
};
