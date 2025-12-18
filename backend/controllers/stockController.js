const mongoose = require("mongoose");
const Material = require("../models/Material");
const StockTransaction = require("../models/StockTransaction");

exports.createIn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { materialId, qty, unitPrice, partner, note } = req.body;

    if (!materialId || !qty) {
      return res.status(400).json({ message: "Thiếu materialId hoặc qty" });
    }
    const nQty = Number(qty);
    if (!Number.isFinite(nQty) || nQty <= 0) {
      return res.status(400).json({ message: "Số lượng phải > 0" });
    }

    session.startTransaction();

    const material = await Material.findById(materialId).session(session);
    if (!material) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy vật liệu" });
    }

    // ✅ cộng tồn
    material.soLuongTon = Number(material.soLuongTon || 0) + nQty;
    // optional: cập nhật giá nhập gần nhất
    if (unitPrice !== undefined && unitPrice !== null && unitPrice !== "") {
      material.giaNhap = Number(unitPrice);
    }
    if (partner !== undefined && partner !== null && partner !== "") {
      material.nhaCungCap = partner; // optional
    }

    await material.save({ session });

    const trx = await StockTransaction.create(
      [
        {
          type: "IN",
          materialId,
          qty: nQty,
          unitPrice: Number(unitPrice || 0),
          partner: partner || "",
          note: note || "",
          createdBy: {
            userId: req.user?.userId,
            username: req.user?.username,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return res.json({ message: "Nhập kho thành công", material, transaction: trx[0] });
  } catch (err) {
    console.error(err);
    try { await session.abortTransaction(); } catch {}
    return res.status(500).json({ message: "Lỗi server" });
  } finally {
    session.endSession();
  }
};

exports.createOut = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { materialId, qty, unitPrice, partner, note } = req.body;

    if (!materialId || !qty) {
      return res.status(400).json({ message: "Thiếu materialId hoặc qty" });
    }
    const nQty = Number(qty);
    if (!Number.isFinite(nQty) || nQty <= 0) {
      return res.status(400).json({ message: "Số lượng phải > 0" });
    }

    session.startTransaction();

    const material = await Material.findById(materialId).session(session);
    if (!material) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy vật liệu" });
    }

    const current = Number(material.soLuongTon || 0);
    if (current < nQty) {
      await session.abortTransaction();
      return res.status(400).json({ message: `Tồn kho không đủ (tồn: ${current})` });
    }

    // ✅ trừ tồn
    material.soLuongTon = current - nQty;
    // optional: cập nhật giá bán gần nhất
    if (unitPrice !== undefined && unitPrice !== null && unitPrice !== "") {
      material.giaBan = Number(unitPrice);
    }

    await material.save({ session });

    const trx = await StockTransaction.create(
      [
        {
          type: "OUT",
          materialId,
          qty: nQty,
          unitPrice: Number(unitPrice || 0),
          partner: partner || "",
          note: note || "",
          createdBy: {
            userId: req.user?.userId,
            username: req.user?.username,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return res.json({ message: "Xuất kho thành công", material, transaction: trx[0] });
  } catch (err) {
    console.error(err);
    try { await session.abortTransaction(); } catch {}
    return res.status(500).json({ message: "Lỗi server" });
  } finally {
    session.endSession();
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { type, materialId, limit = 50 } = req.query;

    const q = {};
    if (type === "IN" || type === "OUT") q.type = type;
    if (materialId) q.materialId = materialId;

    const rows = await StockTransaction.find(q)
      .populate("materialId", "maVatLieu tenVatLieu donViTinh")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200));

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
