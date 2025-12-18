// backend/routes/reportRoutes.js
const express = require("express");
const ExcelJS = require("exceljs");

const Invoice = require("../models/Invoice");
const Material = require("../models/Material");

// StockIn model
let StockIn;
try {
  StockIn = require("../models/StockIn");
} catch (e) {
  console.error("❌ Cannot load StockIn model. Please check ../models/StockIn.js");
  StockIn = null;
}

// ===== middleware import an toàn (dù export kiểu nào cũng chạy) =====
const authModule = require("../middleware/authMiddleware");
const authMiddleware =
  typeof authModule === "function"
    ? authModule
    : authModule?.authMiddleware || authModule?.verifyToken;

const adminModule = require("../middleware/requireAdmin");
const requireAdmin =
  typeof adminModule === "function" ? adminModule : adminModule?.requireAdmin;

const router = express.Router();

// ===== helper =====
function parseDateRange(from, to) {
  const fromDate = from ? new Date(from + "T00:00:00.000Z") : null;
  const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

  if (fromDate && isNaN(fromDate.getTime())) return { error: "from không hợp lệ" };
  if (toDate && isNaN(toDate.getTime())) return { error: "to không hợp lệ" };

  const createdAt = {};
  if (fromDate) createdAt.$gte = fromDate;
  if (toDate) createdAt.$lte = toDate;

  return { createdAt: Object.keys(createdAt).length ? createdAt : {} };
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

function calcStockInDocCost(doc) {
  const items = Array.isArray(doc.items) ? doc.items : [];
  // ✅ StockIn của bạn có soLuong + giaNhap => chi phí = Σ soLuong*giaNhap
  return items.reduce((s, it) => s + money(it.soLuong) * money(it.giaNhap), 0);
}

// =====================================================
// 1) SUMMARY: doanh thu - chi phí nhập - lợi nhuận (theo nhập kho)
// GET /api/reports/summary?from&to
// =====================================================
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const invoiceQuery = range.createdAt && Object.keys(range.createdAt).length
      ? { createdAt: range.createdAt }
      : {};

    // doanh thu từ invoice
    const invoices = await Invoice.find(invoiceQuery).select(
      "total totalAfterDiscount discountAmount createdAt invoiceNo staffName customerName"
    );

    const revenue = invoices.reduce((s, x) => s + money(x.totalAfterDiscount ?? x.total), 0);

    // chi phí nhập kho
    let importsTotalCost = 0;
    let stockIns = [];
    if (StockIn) {
      const stockInQuery = invoiceQuery; // cùng range
      stockIns = await StockIn.find(stockInQuery).select("createdAt partner note items");
      importsTotalCost = stockIns.reduce((sum, doc) => sum + calcStockInDocCost(doc), 0);
    }

    const profit = revenue - importsTotalCost;

    return res.json({
      from,
      to,
      invoices: { count: invoices.length, revenue },
      imports: { count: stockIns.length, totalCost: importsTotalCost },
      profit,
      status: profit >= 0 ? "LỜI" : "LỖ",
    });
  } catch (err) {
    console.error("❌ report summary error:", err);
    return res.status(500).json({ message: "Lỗi báo cáo tổng hợp" });
  }
});

// =====================================================
// 1b) EXPORT SUMMARY EXCEL
// GET /api/reports/summary/export?from&to
// =====================================================
router.get("/summary/export", authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;

    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = range.createdAt && Object.keys(range.createdAt).length
      ? { createdAt: range.createdAt }
      : {};

    const invoices = await Invoice.find(q).select("total totalAfterDiscount createdAt invoiceNo");
    const revenue = invoices.reduce((s, x) => s + money(x.totalAfterDiscount ?? x.total), 0);

    let importsTotalCost = 0;
    if (StockIn) {
      const stockIns = await StockIn.find(q).select("items createdAt");
      importsTotalCost = stockIns.reduce((sum, doc) => sum + calcStockInDocCost(doc), 0);
    }

    const profit = revenue - importsTotalCost;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("BaoCaoTongHop");

    ws.addRow(["Từ ngày", from || ""]);
    ws.addRow(["Đến ngày", to || ""]);
    ws.addRow([]);
    ws.addRow(["Chỉ số", "Giá trị"]);
    ws.addRow(["Doanh thu", revenue]);
    ws.addRow(["Chi phí nhập", importsTotalCost]);
    ws.addRow(["Lợi nhuận", profit]);
    ws.addRow(["Trạng thái", profit >= 0 ? "LỜI" : "LỖ"]);

    ws.columns = [{ width: 20 }, { width: 30 }];

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="BaoCaoTongHop_${from || "ALL"}_${to || "ALL"}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ export summary error:", err);
    return res.status(500).json({ message: "Lỗi export báo cáo tổng hợp" });
  }
});

// =====================================================
// ✅ 1c) SALES ANALYTICS: khách mua + top hàng + COGS + profit
// GET /api/reports/sales-analytics?from&to
// =====================================================
router.get("/sales-analytics", authMiddleware, async (req, res) => {
  try {
    const { from, to, top = 10 } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const match = {};
    if (range.createdAt && Object.keys(range.createdAt).length) {
      match.createdAt = range.createdAt;
    }

    // 1) Revenue tổng
    const revenueAgg = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $ifNull: ["$totalAfterDiscount", "$total"] } },
          invoicesCount: { $sum: 1 },
        },
      },
    ]);
    const revenue = revenueAgg?.[0]?.revenue || 0;
    const invoicesCount = revenueAgg?.[0]?.invoicesCount || 0;

    // 2) Đếm khách mua (distinct theo customerPhone)
    const customersAgg = await Invoice.aggregate([
      { $match: match },
      { $group: { _id: "$customerPhone" } },
      { $count: "customersCount" },
    ]);
    const customersCount = customersAgg?.[0]?.customersCount || 0;

    // 3) Top mặt hàng bán + giá vốn + lợi nhuận (ước tính theo Material.giaNhap)
    const pipeline = [
      { $match: match },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "materials",
          localField: "items.materialId",
          foreignField: "_id",
          as: "m",
        },
      },
      { $unwind: { path: "$m", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          qty: { $ifNull: ["$items.qty", 0] },
          revenueLine: { $ifNull: ["$items.lineTotal", { $multiply: ["$items.qty", "$items.price"] }] },
          costLine: {
            $multiply: [
              { $ifNull: ["$items.qty", 0] },
              { $ifNull: ["$m.giaNhap", 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$items.materialId",
          itemName: { $first: "$items.itemName" },
          itemCode: { $first: "$items.itemCode" },
          unit: { $first: "$items.unit" },

          totalQty: { $sum: "$qty" },
          totalRevenue: { $sum: "$revenueLine" },
          totalCOGS: { $sum: "$costLine" },
        },
      },
      {
        $addFields: {
          profit: { $subtract: ["$totalRevenue", "$totalCOGS"] },
          marginPct: {
            $cond: [
              { $gt: ["$totalRevenue", 0] },
              { $multiply: [{ $divide: [{ $subtract: ["$totalRevenue", "$totalCOGS"] }, "$totalRevenue"] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: Math.max(1, Math.min(Number(top) || 10, 50)) },
    ];

    const topItems = await Invoice.aggregate(pipeline);

    // 4) Tổng COGS (ước tính) + Profit tổng
    const cogsAgg = await Invoice.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "materials",
          localField: "items.materialId",
          foreignField: "_id",
          as: "m",
        },
      },
      { $unwind: { path: "$m", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          cogs: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.qty", 0] },
                { $ifNull: ["$m.giaNhap", 0] },
              ],
            },
          },
        },
      },
    ]);
    const cogs = cogsAgg?.[0]?.cogs || 0;
    const profit = revenue - cogs;

    return res.json({
      from,
      to,
      invoicesCount,
      customersCount,
      revenue,
      cogs,
      profit,
      status: profit >= 0 ? "LỜI" : "LỖ",
      topItems,
      note: "COGS/profit là ước tính theo Material.giaNhap hiện tại (Invoice không lưu giá nhập theo thời điểm bán).",
    });
  } catch (err) {
    console.error("❌ report sales-analytics error:", err);
    return res.status(500).json({ message: "Lỗi báo cáo chi tiết bán hàng" });
  }
});

// =====================================================
// 2) STOCK IN REPORT (NHẬP KHO)
// GET /api/reports/stockin?from&to
// =====================================================
router.get("/stockin", authMiddleware, async (req, res) => {
  try {
    if (!StockIn) return res.status(500).json({ message: "Thiếu model StockIn" });

    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = range.createdAt && Object.keys(range.createdAt).length
      ? { createdAt: range.createdAt }
      : {};

    const list = await StockIn.find(q).sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error("❌ report stockin error:", err);
    return res.status(500).json({ message: "Lỗi báo cáo nhập kho" });
  }
});

// 2b) EXPORT STOCK IN EXCEL
router.get("/stockin/export", authMiddleware, async (req, res) => {
  try {
    if (!StockIn) return res.status(500).json({ message: "Thiếu model StockIn" });

    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = range.createdAt && Object.keys(range.createdAt).length
      ? { createdAt: range.createdAt }
      : {};

    const list = await StockIn.find(q).sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("NhapKho");

    ws.addRow(["Thời gian", "Đối tác", "Số dòng", "Tổng chi phí", "Ghi chú"]);
    list.forEach((doc) => {
      const items = Array.isArray(doc.items) ? doc.items : [];
      const totalCost = calcStockInDocCost(doc);

      ws.addRow([
        doc.createdAt ? new Date(doc.createdAt).toLocaleString("vi-VN") : "",
        doc.partner || doc.supplier || "",
        items.length,
        totalCost,
        doc.note || "",
      ]);
    });

    ws.columns = [
      { width: 22 },
      { width: 25 },
      { width: 10 },
      { width: 15 },
      { width: 40 },
    ];

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="BaoCaoNhapKho_${from || "ALL"}_${to || "ALL"}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ export stockin error:", err);
    return res.status(500).json({ message: "Lỗi export báo cáo nhập kho" });
  }
});

// =====================================================
// 3) SALES REPORT (ĐƠN ĐÃ BÁN = INVOICES)
// GET /api/reports/sales?from&to
// =====================================================
router.get("/sales", authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = range.createdAt && Object.keys(range.createdAt).length
      ? { createdAt: range.createdAt }
      : {};

    const list = await Invoice.find(q).sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error("❌ report sales error:", err);
    return res.status(500).json({ message: "Lỗi báo cáo bán hàng" });
  }
});

// 3b) EXPORT SALES EXCEL
router.get("/sales/export", authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = range.createdAt && Object.keys(range.createdAt).length
      ? { createdAt: range.createdAt }
      : {};

    const list = await Invoice.find(q).sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("DonDaBan");

    ws.addRow(["Thời gian", "Mã hóa đơn", "Khách hàng", "Nhân viên", "Tổng tiền", "Sau giảm"]);
    list.forEach((inv) => {
      ws.addRow([
        inv.createdAt ? new Date(inv.createdAt).toLocaleString("vi-VN") : "",
        inv.invoiceNo || "",
        inv.customerName || "",
        inv.staffName || "",
        money(inv.total),
        money(inv.totalAfterDiscount ?? inv.total),
      ]);
    });

    ws.columns = [
      { width: 22 },
      { width: 18 },
      { width: 25 },
      { width: 18 },
      { width: 14 },
      { width: 14 },
    ];

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="BaoCaoDonDaBan_${from || "ALL"}_${to || "ALL"}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ export sales error:", err);
    return res.status(500).json({ message: "Lỗi export báo cáo bán hàng" });
  }
});

module.exports = router;
