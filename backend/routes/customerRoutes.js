const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");

// GET /api/customers
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, "i") },
            { phone: new RegExp(q, "i") },
          ],
        }
      : {};
    const list = await Customer.find(filter).sort({ updatedAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/customers
router.post("/", async (req, res) => {
  try {
    const { name, phone, address, note } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Tên khách hàng là bắt buộc" });
    }

    const doc = await Customer.create({
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : undefined,
      address: address ? String(address).trim() : "",
      note: note ? String(note).trim() : "",
    });

    res.status(201).json(doc);
  } catch (e) {
    // lỗi trùng phone
    if (String(e.message).includes("duplicate key")) {
      return res.status(409).json({ message: "Số điện thoại đã tồn tại" });
    }
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/customers/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, address, note, totalPoints, rank, lastPurchaseAt } = req.body;

    const updated = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : undefined } : {}),
        ...(address !== undefined ? { address: String(address).trim() } : {}),
        ...(note !== undefined ? { note: String(note).trim() } : {}),
        ...(totalPoints !== undefined ? { totalPoints: Number(totalPoints || 0) } : {}),
        ...(rank !== undefined ? { rank } : {}),
        ...(lastPurchaseAt !== undefined ? { lastPurchaseAt } : {}),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    res.json(updated);
  } catch (e) {
    if (String(e.message).includes("duplicate key")) {
      return res.status(409).json({ message: "Số điện thoại đã tồn tại" });
    }
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/customers/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy khách hàng" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
