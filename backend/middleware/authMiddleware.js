const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // chứa info user (id, role, ...)
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

const requireAdmin = (req, res, next) => {
  // bạn có thể đổi theo role bạn đang dùng: "admin" / 1 / true...
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
};

module.exports = { authMiddleware, requireAdmin };
