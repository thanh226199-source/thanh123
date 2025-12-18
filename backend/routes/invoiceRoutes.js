const express = require("express");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");

// ✅ IMPORT ĐÚNG middleware (destructure)
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

const MIN_BILL = 100000;

// Rank chuẩn hóa để FE map đúng:
// SILVER: Đồng, GOLD: Bạc, PLATINUM: Vàng, DIAMOND: Kim cương
function getRankByPoints(totalPoints = 0) {
  const p = Number(totalPoints || 0);
  if (p >= 10000) return "DIAMOND";
  if (p >= 5000) return "PLATINUM";
  if (p >= 1000) return "GOLD";
  return "SILVER";
}

function getBenefits(rank) {
  switch (rank) {
    case "GOLD": // Bạc
      return { discountRate: 0.05, pointMul: 1.1 };
    case "PLATINUM": // Vàng
      return { discountRate: 0.07, pointMul: 1.2 };
    case "DIAMOND": // Kim cương
      return { discountRate: 0.10, pointMul: 1.3 };
    default: // SILVER (Đồng)
      return { discountRate: 0, pointMul: 1.0 };
  }
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "").trim();
}

/** GET /api/invoices */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const list = await Invoice.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "username")
      .populate("customerId", "name phone totalPoints rank lastPurchaseAt");

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi lấy danh sách hóa đơn" });
  }
});

/** POST /api/invoices */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      invoiceNo,
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      note,
      staffName,
      total,
      items,
    } = req.body;

    if (!customerName?.trim())
      return res.status(400).json({ message: "Thiếu tên khách hàng" });

    const phone = normalizePhone(customerPhone);
    if (!phone)
      return res.status(400).json({ message: "Thiếu số điện thoại" });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "Chưa có dòng hàng" });

    const totalNumber = Number(total || 0);
    if (!Number.isFinite(totalNumber) || totalNumber <= 0)
      return res.status(400).json({ message: "Tổng tiền không hợp lệ" });

    // ✅ chỉ tích điểm khi đơn >= 100k
    const eligible = totalNumber >= MIN_BILL;

    // ===== TÌM / TẠO KHÁCH =====
    let customerDoc = null;

    if (customerId) {
      customerDoc = await Customer.findById(customerId);
      if (!customerDoc) {
        return res.status(400).json({ message: "customerId không tồn tại" });
      }
    } else {
      customerDoc = await Customer.findOne({ phone });
    }

    if (!customerDoc) {
      customerDoc = await Customer.create({
        name: customerName.trim(),
        phone,
        address: customerAddress || "",
        totalPoints: 0,
        rank: "SILVER",
        lastPurchaseAt: null,
      });
    }

    // ===== TÍNH ƯU ĐÃI / ĐIỂM =====
    let rankApplied = "SILVER";
    let discountRate = 0;
    let discountAmount = 0;
    let totalAfterDiscount = totalNumber;
    let pointsEarned = 0;

    if (eligible) {
      const currentRank =
        customerDoc.rank &&
        ["SILVER", "GOLD", "PLATINUM", "DIAMOND"].includes(customerDoc.rank)
          ? customerDoc.rank
          : getRankByPoints(Number(customerDoc.totalPoints || 0));

      rankApplied = currentRank;

      const { discountRate: dr, pointMul } = getBenefits(currentRank);
      discountRate = dr;

      discountAmount = Math.round(totalNumber * discountRate);
      totalAfterDiscount = totalNumber - discountAmount;

      pointsEarned = Math.floor((totalAfterDiscount / 1000) * pointMul);
      if (pointsEarned < 0) pointsEarned = 0;
    }

    // ===== TẠO INVOICE =====
    const invoice = await Invoice.create({
      invoiceNo,
      customerId: customerDoc?._id || null,
      customerName: customerName.trim(),
      customerPhone: phone,
      customerAddress: customerAddress || "",
      note: note || "",
      staffName: staffName || "",
      total: totalNumber,
      discountRate,
      discountAmount,
      totalAfterDiscount,
      pointsEarned,
      rankApplied,
      items,
      // ✅ authMiddleware gắn req.user là user từ DB
      createdBy: req.user._id,
    });

    // ===== UPDATE KHÁCH =====
    if (eligible && customerDoc) {
      customerDoc.totalPoints =
        Number(customerDoc.totalPoints || 0) + Number(pointsEarned || 0);

      customerDoc.rank = getRankByPoints(customerDoc.totalPoints);
      customerDoc.lastPurchaseAt = new Date();

      if (!customerDoc.name) customerDoc.name = customerName.trim();
      if (!customerDoc.phone) customerDoc.phone = phone;
      if (!customerDoc.address && customerAddress)
        customerDoc.address = customerAddress;

      await customerDoc.save();
    }

    res.status(201).json(invoice);
  } catch (err) {
    console.error("❌ invoice post error:", err);
    res.status(500).json({ message: err?.message || "Lỗi tạo hóa đơn" });
  }
});

/** GET /api/invoices/:id */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("createdBy", "username")
      .populate("customerId", "name phone totalPoints rank lastPurchaseAt");

    if (!invoice)
      return res.status(404).json({ message: "Không tìm thấy hóa đơn" });

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi lấy hóa đơn" });
  }
});

module.exports = router;
