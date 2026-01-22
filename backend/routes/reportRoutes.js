// backend/routes/reportRoutes.js
const express = require("express");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

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

// router
const router = express.Router();

// ===== helper =====
const getUserId = (req) => req.user?.userId || req.user?.id || req.user?._id;
const getUsername = (req) => req.user?.username || "";

// parse date range
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
  return items.reduce(
    (s, it) =>
      s +
      money(it.soLuong ?? it.qty ?? it.quantity) *
        money(it.giaNhap ?? it.importPrice ?? it.price),
    0
  );
}

// build query theo owner cho Invoice/Material
function buildOwnerQuery(req, extra = {}) {
  const userId = getUserId(req);
  if (!userId) return { error: "Unauthorized" };
  return { ...extra, owner: userId };
}

// build query cho StockIn: ưu tiên owner nếu có, fallback theo createdBy
function buildStockInOwnerQuery(req) {
  const userId = getUserId(req);
  const username = getUsername(req);
  if (!userId) return { error: "Unauthorized" };

  const createdByPath = StockIn?.schema?.path?.("createdBy");
  const createdByInstance = createdByPath?.instance; // "String" | "ObjectId" | undefined

  const orConds = [{ owner: userId }, { createdByUser: userId }];

  if (createdByInstance === "ObjectId") {
    orConds.push({ createdBy: userId });
  } else {
    orConds.push({ createdBy: String(userId) });
    if (username) orConds.push({ createdBy: username });
  }

  return { $or: orConds };
}

// =====================================================
// 1) SUMMARY: doanh thu - chi phí nhập - lợi nhuận (theo nhập kho)
// GET /api/reports/summary?from&to
// =====================================================
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const invoiceQuery = buildOwnerQuery(
      req,
      range.createdAt && Object.keys(range.createdAt).length
        ? { createdAt: range.createdAt }
        : {}
    );
    if (invoiceQuery.error)
      return res.status(401).json({ message: invoiceQuery.error });

    // doanh thu từ invoice (chỉ owner)
    const invoices = await Invoice.find(invoiceQuery).select(
      "total totalAfterDiscount discountAmount createdAt invoiceNo staffName customerName"
    );

    const revenue = invoices.reduce(
      (s, x) => s + money(x.totalAfterDiscount ?? x.total),
      0
    );

    // chi phí nhập kho (chỉ owner)
    let importsTotalCost = 0;
    let stockIns = [];
    if (StockIn) {
      const stockInQueryBase =
        range.createdAt && Object.keys(range.createdAt).length
          ? { createdAt: range.createdAt }
          : {};

      const stockInOwner = buildStockInOwnerQuery(req);
      if (stockInOwner.error)
        return res.status(401).json({ message: stockInOwner.error });

      const stockInQuery = { ...stockInQueryBase, ...stockInOwner };

      stockIns = await StockIn.find(stockInQuery).select(
        "createdAt partner note items createdBy owner"
      );
      importsTotalCost = stockIns.reduce(
        (sum, doc) => sum + calcStockInDocCost(doc),
        0
      );
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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = buildOwnerQuery(
      req,
      range.createdAt && Object.keys(range.createdAt).length
        ? { createdAt: range.createdAt }
        : {}
    );
    if (q.error) return res.status(401).json({ message: q.error });

    const invoices = await Invoice.find(q).select(
      "total totalAfterDiscount createdAt invoiceNo"
    );
    const revenue = invoices.reduce(
      (s, x) => s + money(x.totalAfterDiscount ?? x.total),
      0
    );

    let importsTotalCost = 0;
    if (StockIn) {
      const stockInQueryBase =
        range.createdAt && Object.keys(range.createdAt).length
          ? { createdAt: range.createdAt }
          : {};

      const stockInOwner = buildStockInOwnerQuery(req);
      if (stockInOwner.error)
        return res.status(401).json({ message: stockInOwner.error });

      const stockIns = await StockIn.find({
        ...stockInQueryBase,
        ...stockInOwner,
      }).select("items createdAt");
      importsTotalCost = stockIns.reduce(
        (sum, doc) => sum + calcStockInDocCost(doc),
        0
      );
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

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="BaoCaoTongHop_${from || "ALL"}_${to || "ALL"}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ export summary error:", err);
    return res.status(500).json({ message: "Lỗi export báo cáo tổng hợp" });
  }
});

// =====================================================
// 1c) SALES ANALYTICS: khách mua + COGS = tổng chi phí nhập + profit
// GET /api/reports/sales-analytics?from&to
// =====================================================
router.get("/sales-analytics", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    // ===== 1) Doanh thu + số đơn từ Invoice =====
    const matchInvoice = {
      owner: new mongoose.Types.ObjectId(String(userId)),
    };
    if (range.createdAt && Object.keys(range.createdAt).length) {
      matchInvoice.createdAt = range.createdAt;
    }

    const revenueAgg = await Invoice.aggregate([
      { $match: matchInvoice },
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

    // ===== 2) Số khách mua (distinct theo customerPhone + customerId) =====
    const customersAgg = await Invoice.aggregate([
      { $match: matchInvoice },
      {
        $group: {
          _id: {
            phone: "$customerPhone",
            cid: "$customerId",
          },
        },
      },
      { $count: "customersCount" },
    ]);
    const customersCount = customersAgg?.[0]?.customersCount || 0;

    // ===== 3) Tổng chi phí nhập kho (giá vốn) từ StockIn – giống /summary =====
    let importsTotalCost = 0;
    let stockIns = [];
    if (StockIn) {
      const stockInQueryBase =
        range.createdAt && Object.keys(range.createdAt).length
          ? { createdAt: range.createdAt }
          : {};

      const stockInOwner = buildStockInOwnerQuery(req);
      if (stockInOwner.error) {
        return res.status(401).json({ message: stockInOwner.error });
      }

      const stockInQuery = { ...stockInQueryBase, ...stockInOwner };
      stockIns = await StockIn.find(stockInQuery).select("items createdAt");
      importsTotalCost = stockIns.reduce(
        (sum, doc) => sum + calcStockInDocCost(doc),
        0
      );
    }

    const cogs = importsTotalCost;
    const profit = revenue - cogs;

    // ===== 4) TopItems: để FE tự tính fallback nên trả mảng rỗng =====
    const topItems = [];

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
      note: "COGS/lợi nhuận lấy trực tiếp từ tổng chi phí nhập kho (StockIn) cùng kỳ.",
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

    const qBase =
      range.createdAt && Object.keys(range.createdAt).length
        ? { createdAt: range.createdAt }
        : {};

    const qOwner = buildStockInOwnerQuery(req);
    if (qOwner.error) return res.status(401).json({ message: qOwner.error });

    const list = await StockIn.find({ ...qBase, ...qOwner }).sort({
      createdAt: -1,
    });
    return res.json(list);
  } catch (err) {
    console.error("❌ report stockin error:", err);
    return res.status(500).json({ message: "Lỗi báo cáo nhập kho" });
  }
});

// =====================================================
// 2b) EXPORT STOCK IN EXCEL
// GET /api/reports/stockin/export?from&to&type=summary|detail|both
// =====================================================
router.get("/stockin/export", authMiddleware, async (req, res) => {
  try {
    if (!StockIn) return res.status(500).json({ message: "Thiếu model StockIn" });

    const { from, to, type = "both" } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const qBase =
      range.createdAt && Object.keys(range.createdAt).length
        ? { createdAt: range.createdAt }
        : {};

    const qOwner = buildStockInOwnerQuery(req);
    if (qOwner.error) return res.status(401).json({ message: qOwner.error });

    const list = await StockIn.find({ ...qBase, ...qOwner })
      .populate(
        "items.material",
        "tenVatLieu maVatLieu donViTinh ten name ma code dvt unit"
      )
      .sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();

    if (type === "summary" || type === "both") {
      const ws = wb.addWorksheet("TongHopNhapKho");
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

      const grandTotal = list.reduce(
        (sum, d) => sum + calcStockInDocCost(d),
        0
      );
      ws.addRow([]);
      ws.addRow(["", "", "TỔNG", grandTotal, ""]);

      ws.columns = [
        { width: 22 },
        { width: 28 },
        { width: 10 },
        { width: 16 },
        { width: 40 },
      ];
    }

    if (type === "detail" || type === "both") {
      const ws = wb.addWorksheet("ChiTietNhapKho");
      ws.addRow([
        "Thời gian",
        "Đối tác",
        "Mã hàng",
        "Tên hàng",
        "ĐVT",
        "Số lượng nhập",
        "Giá nhập",
        "Thành tiền",
        "Ghi chú",
      ]);

      let detailTotal = 0;

      list.forEach((doc) => {
        const items = Array.isArray(doc.items) ? doc.items : [];
        items.forEach((it) => {
          const qty = money(it.soLuong ?? it.qty ?? it.quantity);
          const importPrice = money(
            it.giaNhap ?? it.importPrice ?? it.price
          );
          const lineCost = qty * importPrice;
          detailTotal += lineCost;

          const m = it.material || {};
          const code =
            it.maVatLieu ||
            it.ma ||
            it.code ||
            m.maVatLieu ||
            m.ma ||
            m.code ||
            "";
          const name =
            it.tenVatLieu ||
            it.ten ||
            it.name ||
            it.itemName ||
            m.tenVatLieu ||
            m.ten ||
            m.name ||
            "";
          const unit =
            it.donViTinh ||
            it.dvt ||
            it.unit ||
            m.donViTinh ||
            m.dvt ||
            m.unit ||
            "";

          ws.addRow([
            doc.createdAt ? new Date(doc.createdAt).toLocaleString("vi-VN") : "",
            doc.partner || doc.supplier || "",
            code,
            name,
            unit,
            qty,
            importPrice,
            lineCost,
            doc.note || "",
          ]);
        });
      });

      ws.addRow([]);
      ws.addRow(["", "", "", "", "", "", "TỔNG", detailTotal, ""]);

      ws.columns = [
        { width: 22 },
        { width: 28 },
        { width: 14 },
        { width: 30 },
        { width: 10 },
        { width: 14 },
        { width: 14 },
        { width: 16 },
        { width: 40 },
      ];
    }

    const fileType = ["summary", "detail", "both"].includes(type)
      ? type
      : "both";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="BaoCaoNhapKho_${fileType}_${from || "ALL"}_${to || "ALL"}.xlsx"`
    );

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
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = buildOwnerQuery(
      req,
      range.createdAt && Object.keys(range.createdAt).length
        ? { createdAt: range.createdAt }
        : {}
    );
    if (q.error) return res.status(401).json({ message: q.error });

    const list = await Invoice.find(q).sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error("❌ report sales error:", err);
    return res.status(500).json({ message: "Lỗi báo cáo bán hàng" });
  }
});

router.get("/sales/export", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { from, to } = req.query;
    const range = parseDateRange(from, to);
    if (range.error) return res.status(400).json({ message: range.error });

    const q = buildOwnerQuery(
      req,
      range.createdAt && Object.keys(range.createdAt).length
        ? { createdAt: range.createdAt }
        : {}
    );
    if (q.error) return res.status(401).json({ message: q.error });

    const list = await Invoice.find(q).sort({ createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("DonDaBan");

    ws.addRow([
      "Thời gian",
      "Mã hóa đơn",
      "Khách hàng",
      "Nhân viên",
      "Tổng tiền",
      "Sau giảm",
    ]);
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

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="BaoCaoDonDaBan_${from || "ALL"}_${to || "ALL"}.xlsx"`
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ export sales error:", err);
    return res.status(500).json({ message: "Lỗi export báo cáo bán hàng" });
  }
});

module.exports = router;
