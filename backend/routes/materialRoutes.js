const express = require("express");
const router = express.Router();

const Material = require("../models/Material");
const { authMiddleware: verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// GET /materials
router.get("/", verifyToken, async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET /materials/:id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Not found" });
    res.json(material);
  } catch (err) {
    res.status(400).json({ message: "Invalid id", error: err.message });
  }
});

// ✅ POST /materials (admin) — FIX: normalize + báo lỗi rõ
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};

    // Normalize: nhận cả 2 schema (maVatLieu/tenVatLieu/...) và (code/name/...)
    const doc = {
      maVatLieu: (b.maVatLieu || b.code || "").trim(),
      tenVatLieu: (b.tenVatLieu || b.name || "").trim(),
      loai: (b.loai || b.category || "").trim(),
      donViTinh: (b.donViTinh || b.unit || "").trim(),
      giaNhap: Number(b.giaNhap ?? b.importPrice ?? 0),
      giaBan: Number(b.giaBan ?? b.sellPrice ?? 0),
      nhaCungCap: (b.nhaCungCap || b.supplier || "").trim(),
      soLuongTon: Number(b.soLuongTon ?? b.stock ?? 0),
    };

    if (!doc.maVatLieu) return res.status(400).json({ message: "Thiếu mã vật liệu" });
    if (!doc.tenVatLieu) return res.status(400).json({ message: "Thiếu tên vật liệu" });

    // Lưu thêm alias để những chỗ khác trong frontend dùng cũng không lệch
    doc.code = doc.maVatLieu;
    doc.name = doc.tenVatLieu;
    doc.category = doc.loai;
    doc.unit = doc.donViTinh;
    doc.importPrice = doc.giaNhap;
    doc.sellPrice = doc.giaBan;
    doc.supplier = doc.nhaCungCap;
    doc.stock = doc.soLuongTon;

    const created = await Material.create(doc);
    res.status(201).json(created);
  } catch (err) {
    // trùng mã (unique) -> báo rõ
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Mã vật liệu đã tồn tại" });
    }
    res.status(400).json({ message: "Create failed", error: err.message });
  }
});

// PUT /materials/:id (admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const updated = await Material.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Update failed", error: err.message });
  }
});

// DELETE /materials/:id (admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Material.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;
