const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Thiếu JWT_SECRET trong backend/.env" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * ✅ CHUẨN HÓA PAYLOAD (giữ logic của bạn, nhưng làm an toàn hơn)
     * - Token cũ: { id, username, role }
     * - Token mới: { userId, username, role }
     */
    const rawUserId = decoded.userId || decoded.id;

    if (!rawUserId) {
      return res.status(401).json({ message: "Token invalid (missing userId)" });
    }

    // ✅ ÉP KIỂU ObjectId để query MongoDB CHUẨN – không bao giờ lẫn dữ liệu
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(rawUserId);
    } catch (e) {
      return res.status(401).json({ message: "Token invalid (bad userId)" });
    }

    /**
     * ✅ req.user CHUẨN TOÀN HỆ THỐNG
     * - userId: ObjectId (dùng cho owner)
     * - username, role: giữ nguyên cho logic cũ
     */
    req.user = {
      userId,                 // ObjectId
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
};

module.exports = { authMiddleware, requireAdmin };
