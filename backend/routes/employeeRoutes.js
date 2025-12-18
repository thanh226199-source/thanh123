const express = require("express");
const Employee = require("../models/Employee");

const router = express.Router();

// ✅ IMPORT ĐÚNG: authMiddleware là function, requireAdmin là function
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

/**
 * GET /api/employees?keyword=
 * (ai đăng nhập cũng xem được)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const keyword = (req.query.keyword || "").trim();

    const filter = keyword
      ? {
          $or: [
            { fullName: new RegExp(keyword, "i") },
            { phone: new RegExp(keyword, "i") },
            { email: new RegExp(keyword, "i") },
            { username: new RegExp(keyword, "i") },
            { role: new RegExp(keyword, "i") },
          ],
        }
      : {};

    const data = await Employee.find(filter).sort({ createdAt: -1 });
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Lỗi lấy danh sách nhân viên" });
  }
});

/**
 * POST /api/employees
 * (admin mới được tạo)
 */
router.post("/", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { fullName, phone, email, username, role, status, note } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập họ tên" });
    }

    const emp = await Employee.create({
      fullName: fullName.trim(),
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      username: username?.trim() || "",
      role: role || "staff",
      status: status || "active",
      note: note || "",
      // ✅ authMiddleware hiện tại gắn req.user = user từ DB (có _id)
      createdBy: req.user?._id || null,
    });

    return res.status(201).json(emp);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Lỗi tạo nhân viên" });
  }
});

/**
 * PUT /api/employees/:id
 * (admin mới được sửa)
 */
router.put("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Employee.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    }

    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Lỗi cập nhật nhân viên" });
  }
});

/**
 * DELETE /api/employees/:id
 * (admin mới được xóa)
 */
router.delete("/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Employee.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    }

    return res.json({ message: "Đã xóa nhân viên" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Lỗi xóa nhân viên" });
  }
});

module.exports = router;
