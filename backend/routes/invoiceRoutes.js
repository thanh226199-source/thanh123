// backend/routes/invoiceRoutes.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Invoice = require("../models/Invoice");
const Material = require("../models/Material");
const Customer = require("../models/Customer");
const loyaltyRules = require("../config/loyaltyRules");

// ✅ IMPORT ĐÚNG middleware theo kiểu export object { authMiddleware, requireAdmin }
const { authMiddleware } = require("../middleware/authMiddleware");

// ✅ Guard: nếu import sai sẽ báo lỗi rõ ràng (tránh lỗi .apply)
if (typeof authMiddleware !== "function") {
  throw new Error(
    "authMiddleware is not a function. Check ../middleware/authMiddleware export/import."
  );
}

/* ===== Helpers ===== */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));

const toNumber = (v, def = 0) => {
  if (v === null || v === undefined) return def;
  if (typeof v === "number") return Number.isFinite(v) ? v : def;
  const s = String(v).replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : def;
};

const pickInvoiceNo = (body) =>
  body.invoiceNo ||
  body.invoiceNumber ||
  body.code ||
  body.soHoaDon ||
  body.soHD ||
  body.so_hd ||
  "";

const normalizePhone = (s = "") => String(s || "").replace(/\D/g, "");

// ✅ normalize items để FE gửi kiểu nào cũng ăn (đúng schema InvoiceItem: lineTotal)
const normalizeItem = (it = {}) => {
  const materialId =
    it.materialId ||
    it.material_id ||
    it.material?._id ||
    it.material?.id ||
    it.material ||
    it._id ||
    it.id;

  const itemName =
    it.itemName ||
    it.name ||
    it.ten ||
    it.tenVatLieu ||
    it.materialName ||
    it.material?.tenVatLieu ||
    it.material?.ten ||
    it.material?.name ||
    "";

  const itemCode =
    it.itemCode ||
    it.code ||
    it.ma ||
    it.maVatLieu ||
    it.materialCode ||
    it.material?.maVatLieu ||
    it.material?.ma ||
    it.material?.code ||
    "";

  const unit =
    it.unit ||
    it.donViTinh ||
    it.dvt ||
    it.DVT ||
    it.uom ||
    it.material?.donViTinh ||
    "";

  const qty = toNumber(it.qty ?? it.quantity ?? it.soLuong ?? it.sl, 0);
  const price = toNumber(
    it.price ?? it.unitPrice ?? it.giaBan ?? it.gia ?? it.donGia,
    0
  );

  const lineTotal =
    toNumber(it.lineTotal ?? it.thanhTien ?? it.total, 0) || Math.max(0, qty * price);

  return { materialId, itemCode, itemName, unit, qty, price, lineTotal };
};

/* ===== Loyalty helpers ===== */
const getRateByRank = (rank) => {
  const r = String(rank || "").toUpperCase();
  if (loyaltyRules?.RATES?.[r] != null) return Number(loyaltyRules.RATES[r]) || 0;

  // fallback:
  if (r === "DIAMOND") return 0.05;
  if (r === "PLATINUM") return 0.03;
  if (r === "GOLD") return 0.02;
  return 0.01; // SILVER
};

const getMinBill = () => {
  if (loyaltyRules?.MIN_BILL != null) return Number(loyaltyRules.MIN_BILL) || 0;
  return 100000;
};

const getRankByPoints = (points = 0) => {
  const p = Number(points || 0);

  if (Array.isArray(loyaltyRules?.RANKS) && loyaltyRules.RANKS.length) {
    const sorted = [...loyaltyRules.RANKS].sort((a, b) => Number(a.min) - Number(b.min));
    let current = sorted[0]?.name || "SILVER";
    for (const x of sorted) {
      if (p >= Number(x.min || 0)) current = x.name;
    }
    return String(current).toUpperCase();
  }

  if (p >= 30000) return "DIAMOND";
  if (p >= 15000) return "PLATINUM";
  if (p >= 5000) return "GOLD";
  return "SILVER";
};

const normalizeRank = (rank, totalPoints = 0) => {
  const r = String(rank || "").toUpperCase().trim();
  if (["SILVER", "GOLD", "PLATINUM", "DIAMOND"].includes(r)) return r;
  return getRankByPoints(totalPoints);
};

const calcEarnedPoints = (rank, totalAfterDiscount) => {
  const bill = Number(totalAfterDiscount || 0);
  if (bill < getMinBill()) return 0;
  const rate = getRateByRank(rank);
  return Math.floor(bill * rate);
};

/* ================= GET LIST ================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;

    // ✅ lean + select để nhẹ và nhanh (đủ cho trang list)
    const list = await Invoice.find({ owner: userId })
      .sort({ createdAt: -1 })
      .select("invoiceNo customerName customerPhone total totalAfterDiscount createdAt")
      .lean();

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

/* ================= GET DETAIL ================= */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // ✅ tránh lỗi CastError => trả 400 rõ ràng
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID hoá đơn không hợp lệ" });
    }

    const doc = await Invoice.findOne({
      _id: id,
      owner: userId,
    }).lean();

    if (!doc) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

/* ================= CREATE INVOICE ================= */
router.post("/", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const userId = req.user?.userId;
    const body = req.body || {};

    const invoiceNo = pickInvoiceNo(body);

    const itemsRaw = Array.isArray(body.items) ? body.items : [];
    const items = itemsRaw.map(normalizeItem);

    if (!invoiceNo) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Thiếu invoiceNo (Số hoá đơn)" });
    }
    if (!items.length) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Chưa có dòng hàng trong hoá đơn" });
    }

    const customerPhone = normalizePhone(
      body.customerPhone || body.phone || body.sdt || body.soDienThoai || ""
    );
    if (!customerPhone) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Thiếu số điện thoại khách hàng" });
    }

    /* ===== Trừ tồn kho (CHỈ KHO CỦA USER) ===== */
    for (const it of items) {
      if (!it.materialId) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Thiếu materialId trong item" });
      }
      if (!it.itemName) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Thiếu itemName trong item" });
      }
      if (it.qty <= 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Số lượng phải > 0" });
      }
      if (it.price < 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: "Đơn giá không hợp lệ" });
      }

      const mat = await Material.findOne({ _id: it.materialId, owner: userId }).session(
        session
      );

      if (!mat) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ message: "Vật liệu không tồn tại hoặc không thuộc kho của bạn" });
      }

      const ton = Number(mat.soLuongTon || 0);
      if (ton < it.qty) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Không đủ tồn kho (${mat.tenVatLieu || mat.ten || "Vật liệu"}). Tồn=${ton}`,
        });
      }

      mat.soLuongTon = ton - it.qty;
      await mat.save({ session });
    }

    /* ===== Tính tổng ===== */
    const subtotal = items.reduce((s, it) => s + toNumber(it.lineTotal, 0), 0);

    // ✅ clamp giảm giá không âm và không vượt subtotal
    let discountAmount = Math.max(
      0,
      toNumber(body.discountAmount ?? body.discount ?? body.giamGia ?? 0, 0)
    );
    if (discountAmount > subtotal) discountAmount = subtotal;

    // ✅ nếu FE có totalPay / totalAfterDiscount thì ưu tiên lấy đúng số đó
    const totalAfterDiscountFromBody = toNumber(
      body.totalAfterDiscount ?? body.totalPay ?? body.thanhToan ?? 0,
      0
    );

    let totalAfterDiscount =
      totalAfterDiscountFromBody > 0
        ? totalAfterDiscountFromBody
        : Math.max(0, subtotal - discountAmount);

    // ✅ clamp totalAfterDiscount không âm và không lớn hơn subtotal
    if (totalAfterDiscount < 0) totalAfterDiscount = 0;
    if (totalAfterDiscount > subtotal) totalAfterDiscount = subtotal;

    const discountRate =
      subtotal > 0 ? Math.round((discountAmount / subtotal) * 10000) / 10000 : 0;

    /* ===== Tìm customer để tính điểm/rank ===== */
    const customerId = body.customerId || body.khachHangId || null;
    let customer = null;

    // ưu tiên theo customerId
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, owner: userId }).session(
        session
      );
      if (!customer) {
        customer = await Customer.findById(customerId).session(session);
      }
    } else {
      // fallback theo phone
      customer = await Customer.findOne({ owner: userId, phone: customerPhone }).session(
        session
      );
      if (!customer) {
        customer = await Customer.findOne({ phone: customerPhone }).session(session);
      }
    }

    const currentRank = customer
      ? normalizeRank(customer.rank, customer.totalPoints)
      : "SILVER";

    const pointsEarned = customer ? calcEarnedPoints(currentRank, totalAfterDiscount) : 0;

    /* ===== LƯU HÓA ĐƠN ===== */
    const invoice = new Invoice({
      owner: userId,
      createdByUser: userId,

      invoiceNo,

      customerId: customer ? customer._id : customerId,
      customerName: body.customerName || body.khachHang || "",
      customerPhone,
      customerAddress: body.customerAddress || body.address || body.diaChi || "",

      staffName: body.staffName || body.nhanVien || body.employeeName || "",
      note: body.note || body.ghiChu || "",

      total: subtotal,
      discountRate,
      discountAmount,
      totalAfterDiscount,

      pointsEarned,
      rankApplied: currentRank,

      items,
    });

    const saved = await invoice.save({ session });

    /* ===== UPDATE LOYALTY CUSTOMER ===== */
    if (customer) {
      customer.totalPoints = Number(customer.totalPoints || 0) + Number(pointsEarned || 0);
      customer.rank = getRankByPoints(customer.totalPoints);
      customer.lastPurchaseAt = new Date();
      await customer.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json(saved);
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) {}

    if (err?.code === 11000) {
      return res.status(409).json({ message: "Số hoá đơn đã tồn tại (trong tài khoản này)" });
    }

    res.status(500).json({
      message: err.message || "Lỗi lưu hoá đơn",
    });
  } finally {
    session.endSession();
  }
});

/* ================= DELETE ================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    // ✅ tránh lỗi CastError
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "ID hoá đơn không hợp lệ" });
    }

    const doc = await Invoice.findOneAndDelete({
      _id: id,
      owner: userId,
    });

    if (!doc) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
    res.json({ message: "Đã xoá hoá đơn" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
