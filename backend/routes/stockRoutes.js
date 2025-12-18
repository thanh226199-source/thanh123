// backend/routes/stockRoutes.js
const express = require("express");
const router = express.Router();

const StockIn = require("../models/StockIn");
const StockOut = require("../models/StockOut");
const Material = require("../models/Material");

// ✅ middleware chuẩn
const { authMiddleware, requireAdmin } = require("../middleware/authMiddleware");

/* =========================
   Helper: gộp items trùng material
   ========================= */
function mergeItems(items, priceField) {
  const map = new Map();
  for (const it of items) {
    const id = String(it.material);
    const qty = Number(it.soLuong || 0);
    const price = Number(it[priceField] ?? 0);

    if (!map.has(id)) {
      map.set(id, { material: it.material, soLuong: qty, [priceField]: price });
    } else {
      const cur = map.get(id);
      cur.soLuong += qty;
      cur[priceField] = price; // giữ giá cuối
      map.set(id, cur);
    }
  }
  return Array.from(map.values());
}

/* =========================
   GET: lịch sử nhập (20 gần nhất)
   ========================= */
router.get("/in", authMiddleware, async (req, res) => {
  try {
    const rows = await StockIn.find().sort({ createdAt: -1 }).limit(20);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi lấy lịch sử nhập" });
  }
});

/* =========================
   POST: tạo phiếu nhập nhiều món
   (admin)
   body: { partner, note, items: [{material, soLuong, giaNhap}] }
   ========================= */
router.post("/in", authMiddleware, requireAdmin, async (req, res) => {
  const session = await Material.startSession();
  try {
    const { partner, note, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Phiếu nhập phải có ít nhất 1 dòng vật liệu." });
    }

    for (const it of items) {
      if (!it.material)
        return res.status(400).json({ message: "Thiếu material trong items." });
      if (!it.soLuong || Number(it.soLuong) <= 0)
        return res.status(400).json({ message: "Số lượng phải > 0." });
      if (it.giaNhap == null || Number(it.giaNhap) < 0)
        return res.status(400).json({ message: "Giá nhập không hợp lệ." });
    }

    const merged = mergeItems(items, "giaNhap");

    const materialIds = merged.map((i) => i.material);
    const mats = await Material.find({ _id: { $in: materialIds } });
    const map = new Map(mats.map((m) => [String(m._id), m]));

    for (const it of merged) {
      if (!map.get(String(it.material))) {
        return res.status(404).json({ message: "Có vật liệu không tồn tại." });
      }
    }

    const normalizedItems = merged.map((i) => {
      const m = map.get(String(i.material));
      return {
        material: i.material,
        maVatLieu: m?.maVatLieu || "",
        tenVatLieu: m?.tenVatLieu || "",
        soLuong: Number(i.soLuong),
        giaNhap: Number(i.giaNhap),
      };
    });

    await session.withTransaction(async () => {
      await StockIn.create(
        [
          {
            partner: partner || "",
            note: note || "",
            createdBy: req.user?._id || null, // ✅ lấy từ middleware
            items: normalizedItems,
          },
        ],
        { session }
      );

      for (const it of normalizedItems) {
        await Material.findByIdAndUpdate(
          it.material,
          { $inc: { soLuongTon: it.soLuong } },
          { session }
        );
      }
    });

    res.json({ message: "Tạo phiếu nhập thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi tạo phiếu nhập" });
  } finally {
    session.endSession();
  }
});

/* =========================
   GET: lịch sử xuất (20 gần nhất)
   ========================= */
router.get("/out", authMiddleware, async (req, res) => {
  try {
    const rows = await StockOut.find().sort({ createdAt: -1 }).limit(20);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi lấy lịch sử xuất" });
  }
});

/* =========================
   POST: tạo phiếu xuất nhiều món
   (admin)
   body: { partner, note, items: [{material, soLuong, giaXuat}] }
   - chặn xuất âm tồn
   ========================= */
router.post("/out", authMiddleware, requireAdmin, async (req, res) => {
  const session = await Material.startSession();
  try {
    const { partner, note, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Phiếu xuất phải có ít nhất 1 dòng vật liệu." });
    }

    for (const it of items) {
      if (!it.material)
        return res.status(400).json({ message: "Thiếu material trong items." });
      if (!it.soLuong || Number(it.soLuong) <= 0)
        return res.status(400).json({ message: "Số lượng phải > 0." });
      if (it.giaXuat != null && Number(it.giaXuat) < 0)
        return res.status(400).json({ message: "Giá xuất không hợp lệ." });
    }

    const merged = mergeItems(items, "giaXuat");

    const materialIds = merged.map((i) => i.material);
    const mats = await Material.find({ _id: { $in: materialIds } });
    const map = new Map(mats.map((m) => [String(m._id), m]));

    for (const it of merged) {
      const m = map.get(String(it.material));
      if (!m) return res.status(404).json({ message: "Có vật liệu không tồn tại." });

      const qty = Number(it.soLuong);
      const ton = Number(m.soLuongTon || 0);

      if (ton < qty) {
        return res.status(400).json({
          message: `Không đủ tồn cho "${m.tenVatLieu}". Tồn: ${ton}, yêu cầu: ${qty}`,
        });
      }
    }

    const normalizedItems = merged.map((i) => {
      const m = map.get(String(i.material));
      return {
        material: i.material,
        maVatLieu: m?.maVatLieu || "",
        tenVatLieu: m?.tenVatLieu || "",
        soLuong: Number(i.soLuong),
        giaXuat: i.giaXuat == null ? 0 : Number(i.giaXuat),
      };
    });

    await session.withTransaction(async () => {
      await StockOut.create(
        [
          {
            partner: partner || "",
            note: note || "",
            createdBy: req.user?._id || null, // ✅ lấy từ middleware
            items: normalizedItems,
          },
        ],
        { session }
      );

      for (const it of normalizedItems) {
        await Material.findByIdAndUpdate(
          it.material,
          { $inc: { soLuongTon: -it.soLuong } },
          { session }
        );
      }
    });

    res.json({ message: "Tạo phiếu xuất thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi tạo phiếu xuất" });
  } finally {
    session.endSession();
  }
});

module.exports = router;
