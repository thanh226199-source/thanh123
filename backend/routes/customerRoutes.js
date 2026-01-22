const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");

// ✅ giống kho hàng: bắt buộc đăng nhập để tách theo user
const { authMiddleware } = require("../middleware/authMiddleware");

// normalize phone (lưu digits thôi)
const normalizePhone = (s = "") => String(s || "").replace(/\D/g, "");

// lấy userId chắc chắn
const getUserId = (req) => req.user?.userId || req.user?.id || req.user?._id;

/* =========================
   GET /api/customers
   ✅ chỉ lấy khách của tài khoản đang đăng nhập
   ========================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const q = (req.query.q || "").trim();

    // ✅ bắt buộc lọc theo owner
    const filter = { owner: userId };

    if (q) {
      const qPhone = normalizePhone(q);
      filter.$or = [
        { name: new RegExp(q, "i") },
        { phone: new RegExp(qPhone || q, "i") },
      ];
    }

    const list = await Customer.find(filter).sort({ updatedAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* =========================
   POST /api/customers
   ✅ tạo khách thuộc owner hiện tại
   ========================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, phone, address, note } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Tên khách hàng là bắt buộc" });
    }

    const phoneNorm = normalizePhone(phone);

    const doc = await Customer.create({
      owner: userId, // ✅ tách theo tài khoản

      name: String(name).trim(),
      phone: phoneNorm ? phoneNorm : "", // ✅ lưu digits thôi
      address: address ? String(address).trim() : "",
      // note: nếu Customer.js không có field note thì strict sẽ bỏ qua (không sao)
      note: note ? String(note).trim() : "",
    });

    res.status(201).json(doc);
  } catch (e) {
    // lỗi trùng phone (vì bạn unique theo owner+phone)
    if (e?.code === 11000 || String(e.message).includes("duplicate key")) {
      return res.status(409).json({ message: "Số điện thoại đã tồn tại (trong tài khoản này)" });
    }
    res.status(500).json({ message: e.message });
  }
});

/* =========================
   PUT /api/customers/:id
   ✅ chỉ sửa khách thuộc owner
   ========================= */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, phone, address, note, totalPoints, rank, lastPurchaseAt } = req.body;

    const payload = {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(phone !== undefined
        ? { phone: normalizePhone(phone) ? normalizePhone(phone) : "" }
        : {}),
      ...(address !== undefined ? { address: String(address).trim() } : {}),
      ...(note !== undefined ? { note: String(note).trim() } : {}),
      ...(totalPoints !== undefined ? { totalPoints: Number(totalPoints || 0) } : {}),
      ...(rank !== undefined ? { rank } : {}),
      ...(lastPurchaseAt !== undefined ? { lastPurchaseAt } : {}),
    };

    // ✅ chặn sửa owner từ client
    delete payload.owner;

    const updated = await Customer.findOneAndUpdate(
      { _id: req.params.id, owner: userId }, // ✅ chỉ đúng owner
      payload,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    res.json(updated);
  } catch (e) {
    if (e?.code === 11000 || String(e.message).includes("duplicate key")) {
      return res.status(409).json({ message: "Số điện thoại đã tồn tại (trong tài khoản này)" });
    }
    res.status(500).json({ message: e.message });
  }
});

/* =========================
   DELETE /api/customers/:id
   ✅ chỉ xoá khách thuộc owner
   ========================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const deleted = await Customer.findOneAndDelete({ _id: req.params.id, owner: userId });
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy khách hàng" });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
