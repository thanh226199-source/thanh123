const express = require("express");
const router = express.Router();

const Material = require("../models/Material");
const { authMiddleware: verifyToken } = require("../middleware/authMiddleware");

// ✅ lấy userId chắc chắn (hợp với nhiều kiểu token/middleware)
const getUserId = (req) => req.user?.userId || req.user?.id || req.user?._id;

// ✅ parse tiền: 120000 / 120.000 / 120,000
const parseMoney = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s.replace(/[.,\s]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
};

// ✅ normalize dữ liệu từ FE (hỗ trợ cả 2 schema) - dùng cho CREATE / UPDATE FULL
const normalizeMaterialBody = (b = {}) => {
  return {
    maVatLieu: String(b.maVatLieu || b.code || "").trim(),
    tenVatLieu: String(b.tenVatLieu || b.name || "").trim(),
    loai: String(b.loai || b.category || "").trim(),
    donViTinh: String(b.donViTinh || b.unit || "").trim(),
    giaNhap: Number(b.giaNhap ?? b.importPrice ?? 0),
    giaBan: Number(b.giaBan ?? b.sellPrice ?? 0),
    nhaCungCap: String(b.nhaCungCap || b.supplier || "").trim(),
    soLuongTon: Number(b.soLuongTon ?? b.stock ?? 0),
    thoiGianGiaoHang: Number(b.thoiGianGiaoHang ?? b.leadTime ?? 0),
    ghiChu: String(b.ghiChu ?? b.note ?? "").trim(),
  };
};

// ✅ validate tối thiểu (dùng cho create / update full)
const validateMaterial = (doc) => {
  if (!doc.maVatLieu) return "Thiếu mã vật liệu";
  if (!doc.tenVatLieu) return "Thiếu tên vật liệu";
  if (Number.isNaN(doc.giaNhap) || doc.giaNhap < 0) return "Giá nhập không hợp lệ";
  if (Number.isNaN(doc.giaBan) || doc.giaBan < 0) return "Giá bán không hợp lệ";
  if (Number.isNaN(doc.soLuongTon) || doc.soLuongTon < 0) return "Tồn không hợp lệ";
  if (Number.isNaN(doc.thoiGianGiaoHang) || doc.thoiGianGiaoHang < 0)
    return "Thời gian giao hàng không hợp lệ";
  return null;
};

/* =========================
   GET /materials
   ✅ chỉ lấy kho của tài khoản đang đăng nhập
   ========================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const materials = await Material.find({ owner: userId }).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* =========================
   GET /materials/:id
   ✅ chỉ lấy nếu đúng owner
   ========================= */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const material = await Material.findOne({ _id: req.params.id, owner: userId });
    if (!material) return res.status(404).json({ message: "Not found" });

    res.json(material);
  } catch (err) {
    res.status(400).json({ message: "Invalid id", error: err.message });
  }
});

/* =========================
   POST /materials
   ✅ ai đăng nhập cũng tạo được vật liệu của CHÍNH HỌ
   ========================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const doc = normalizeMaterialBody(req.body);
    doc.owner = userId;

    const msg = validateMaterial(doc);
    if (msg) return res.status(400).json({ message: msg });

    const created = await Material.create(doc);
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Mã vật liệu đã tồn tại (trong kho tài khoản này)" });
    }
    res.status(400).json({ message: "Create failed", error: err.message });
  }
});

/* =========================
   PUT /materials/:id
   ✅ chỉ sửa nếu đúng owner
   ✅ CHỈ SỬA GIÁ (giaNhap/giaBan) nếu request có gửi giá
   ✅ Nếu không gửi giá => coi như update full (giữ logic cũ)
   ========================= */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const b = req.body || {};

    // ✅ Detect trường hợp FE chỉ sửa giá
    const hasGiaNhap = b.giaNhap !== undefined || b.importPrice !== undefined;
    const hasGiaBan = b.giaBan !== undefined || b.sellPrice !== undefined;

    // ===== CASE 1: SỬA GIÁ (KHÔNG ĐỤNG maVatLieu/tenVatLieu) =====
    if (hasGiaNhap || hasGiaBan) {
      const patch = {};

      if (hasGiaNhap) {
        const raw = b.giaNhap ?? b.importPrice;
        const n = parseMoney(raw);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ message: "Giá nhập không hợp lệ" });
        }
        patch.giaNhap = n;
      }

      if (hasGiaBan) {
        const raw = b.giaBan ?? b.sellPrice;
        const n = parseMoney(raw);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ message: "Giá bán không hợp lệ" });
        }
        patch.giaBan = n;
      }

      const updated = await Material.findOneAndUpdate(
        { _id: req.params.id, owner: userId },
        { $set: patch },
        { new: true, runValidators: true }
      );

      if (!updated) return res.status(404).json({ message: "Not found" });
      return res.json(updated);
    }

    // ===== CASE 2: UPDATE FULL (khi bạn gửi đủ thông tin) =====
    const normalized = normalizeMaterialBody(req.body);

    const body = {
      maVatLieu: normalized.maVatLieu,
      tenVatLieu: normalized.tenVatLieu,
      loai: normalized.loai,
      donViTinh: normalized.donViTinh,
      giaNhap: normalized.giaNhap,
      giaBan: normalized.giaBan,
      nhaCungCap: normalized.nhaCungCap,
      soLuongTon: normalized.soLuongTon,
      thoiGianGiaoHang: normalized.thoiGianGiaoHang,
      ghiChu: normalized.ghiChu,
    };

    const msg2 = validateMaterial(body);
    if (msg2) return res.status(400).json({ message: msg2 });

    const updated2 = await Material.findOneAndUpdate(
      { _id: req.params.id, owner: userId },
      body,
      { new: true, runValidators: true }
    );

    if (!updated2) return res.status(404).json({ message: "Not found" });
    res.json(updated2);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Mã vật liệu đã tồn tại (trong kho tài khoản này)" });
    }
    res.status(400).json({ message: "Update failed", error: err.message });
  }
});

/* =========================
   DELETE /materials/:id
   ✅ chỉ xóa nếu đúng owner
   ========================= */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const deleted = await Material.findOneAndDelete({ _id: req.params.id, owner: userId });
    if (!deleted) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;
