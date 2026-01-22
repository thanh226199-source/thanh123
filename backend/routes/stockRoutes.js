// backend/routes/stockRoutes.js
const express = require("express");
const router = express.Router();

const StockIn = require("../models/StockIn");
const StockOut = require("../models/StockOut");
const Material = require("../models/Material");

const { authMiddleware } = require("../middleware/authMiddleware");

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
   GET: lịch sử nhập (20 gần nhất) - ✅ chỉ của user
   ========================= */
router.get("/in", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const rows = await StockIn.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi lấy lịch sử nhập" });
  }
});

/* =========================
   POST: tạo phiếu nhập nhiều món
   body: { partner, note, items: [{material, soLuong, giaNhap}] }
   ✅ bỏ requireAdmin để user nào cũng tự quản kho riêng
   ========================= */
router.post("/in", authMiddleware, async (req, res) => {
  const session = await Material.startSession();
  try {
    const userId = req.user.userId;
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

    // ✅ chỉ lấy vật liệu thuộc kho của user
    const mats = await Material.find({ _id: { $in: materialIds }, owner: userId });
    const map = new Map(mats.map((m) => [String(m._id), m]));

    for (const it of merged) {
      if (!map.get(String(it.material))) {
        return res.status(404).json({
          message: "Có vật liệu không tồn tại hoặc không thuộc kho của bạn.",
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
        giaNhap: Number(i.giaNhap),
      };
    });

    await session.withTransaction(async () => {
      await StockIn.create(
        [
          {
            owner: userId,          // ✅ tách dữ liệu theo tài khoản
            partner: partner || "",
            note: note || "",
            createdBy: userId,      // ✅ luôn dùng userId
            items: normalizedItems,
          },
        ],
        { session }
      );

      for (const it of normalizedItems) {
        // ✅ chỉ update tồn kho vật liệu thuộc user
        const updated = await Material.findOneAndUpdate(
          { _id: it.material, owner: userId },
          { $inc: { soLuongTon: it.soLuong } },
          { session, new: true }
        );

        if (!updated) {
          throw new Error("Vật liệu không thuộc kho của bạn hoặc không tồn tại.");
        }
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
   GET: lịch sử xuất (20 gần nhất) - ✅ chỉ của user
   ========================= */
router.get("/out", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const rows = await StockOut.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi lấy lịch sử xuất" });
  }
});

/* =========================
   POST: tạo phiếu xuất nhiều món
   body: { partner, note, items: [{material, soLuong, giaXuat}] }
   ✅ bỏ requireAdmin để user nào cũng tự quản kho riêng
   ========================= */
router.post("/out", authMiddleware, async (req, res) => {
  const session = await Material.startSession();
  try {
    const userId = req.user.userId;
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

    // ✅ chỉ lấy vật liệu thuộc kho của user
    const mats = await Material.find({ _id: { $in: materialIds }, owner: userId });
    const map = new Map(mats.map((m) => [String(m._id), m]));

    for (const it of merged) {
      const m = map.get(String(it.material));
      if (!m)
        return res.status(404).json({
          message: "Có vật liệu không tồn tại hoặc không thuộc kho của bạn.",
        });

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
            owner: userId,
            partner: partner || "",
            note: note || "",
            createdBy: userId,
            items: normalizedItems,
          },
        ],
        { session }
      );

      for (const it of normalizedItems) {
        const updated = await Material.findOneAndUpdate(
          { _id: it.material, owner: userId },
          { $inc: { soLuongTon: -it.soLuong } },
          { session, new: true }
        );

        if (!updated) {
          throw new Error("Vật liệu không thuộc kho của bạn hoặc không tồn tại.");
        }
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
