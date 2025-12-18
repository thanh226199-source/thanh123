// backend/middleware/requireAdmin.js
module.exports = function requireAdmin(req, res, next) {
  try {
    const role = req.user?.role;
    if (role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền admin." });
    }
    return next();
  } catch (e) {
    return res.status(403).json({ message: "Bạn không có quyền admin." });
  }
};
