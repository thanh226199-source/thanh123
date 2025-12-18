const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Không cho chạy kiểu fallback nữa để khỏi “lệch secret”
    throw new Error("JWT_SECRET is missing in backend/.env");
  }
  return secret;
};

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Thiếu username hoặc password" });

    if (!User.isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải: chữ đầu in hoa, có ít nhất 1 số, 1 ký tự đặc biệt và tối thiểu 8 ký tự.",
      });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ message: "Tài khoản đã tồn tại" });

    const passwordHash = await bcrypt.hash(password, 10);

    // Nếu User schema có role thì set mặc định; nếu không có thì vẫn OK
    const created = await User.create({ username, passwordHash, role: "user" });

    return res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        id: created._id,
        username: created.username,
        role: created.role || "user",
      },
    });
  } catch (err) {
    console.error(err);
    if (String(err?.message || "").includes("JWT_SECRET is missing")) {
      return res.status(500).json({ message: "Thiếu JWT_SECRET trong backend/.env" });
    }
    return res.status(500).json({ message: "Lỗi server" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role || "user",
      },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error(err);
    if (String(err?.message || "").includes("JWT_SECRET is missing")) {
      return res.status(500).json({ message: "Thiếu JWT_SECRET trong backend/.env" });
    }
    return res.status(500).json({ message: "Lỗi server" });
  }
};
