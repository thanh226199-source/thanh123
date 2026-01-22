// src/pages/ReportsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";

import {
  getReportSummary,
  exportReportSummaryExcel,
  getReportStockIn,
  exportReportStockInExcel,
  getReportSales,
  exportReportSalesExcel,
  getSalesAnalytics,
} from "../api/reportApi";

// ===== Utils =====
function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "0";
}

// parse số an toàn từ chuỗi "12.090.000" / "12,090,000" / "12 090 000"
function toNumber(x, fallback = 0) {
  if (x === null || x === undefined) return fallback;
  if (typeof x === "number") return Number.isFinite(x) ? x : fallback;

  const s = String(x).trim();
  if (!s) return fallback;

  const cleaned = s.replace(/[^\d-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function toISODateInput(d) {
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonthISO() {
  const now = new Date();
  return toISODateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}
function todayISO() {
  return toISODateInput(new Date());
}

function safeArr(x) {
  return Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [];
}

function safeObj(x) {
  return x && typeof x === "object" ? x : {};
}

// tính tổng tiền 1 record nếu backend không có totalCost/total/amount
function getRowTotal(row, mode /* 'stockin' | 'sales' */) {
  const direct = toNumber(
    row?.totalCost ?? row?.total ?? row?.totalAmount ?? row?.amount ?? 0,
    0
  );
  if (direct > 0) return direct;

  const items = Array.isArray(row?.items) ? row.items : [];
  if (!items.length) return 0;

  if (mode === "stockin") {
    return items.reduce((sum, it) => {
      const qty = toNumber(it?.soLuong ?? it?.quantity ?? it?.qty ?? 0, 0);
      const price = toNumber(
        it?.giaNhap ?? it?.importPrice ?? it?.price ?? it?.donGia ?? 0,
        0
      );
      return sum + qty * price;
    }, 0);
  }

  return items.reduce((sum, it) => {
    const qty = toNumber(it?.soLuong ?? it?.quantity ?? it?.qty ?? 0, 0);
    const price = toNumber(
      it?.giaBan ?? it?.sellPrice ?? it?.price ?? it?.donGia ?? 0,
      0
    );
    return sum + qty * price;
  }, 0);
}

// COGS (giá vốn) cho SALES: qty * giá nhập (import price)
function getRowCOGS(row) {
  const items = Array.isArray(row?.items) ? row.items : [];
  if (!items.length) return 0;

  return items.reduce((sum, it) => {
    const qty = toNumber(it?.soLuong ?? it?.quantity ?? it?.qty ?? 0, 0);

    const importPrice = toNumber(
      it?.giaNhap ??
        it?.importPrice ??
        it?.cost ??
        it?.costPrice ??
        it?.giaVon ??
        it?.donGiaNhap ??
        it?.donGia ??
        0,
      0
    );

    return sum + qty * importPrice;
  }, 0);
}

// ===== normalize (cho TAB TỔNG HỢP) =====
function normalizeSummary(resData) {
  const d0 = safeObj(resData);
  const d =
    safeObj(d0?.data) && Object.keys(d0?.data || {}).length ? d0.data : d0;

  const revenue = toNumber(
    d?.revenue ??
      d?.doanhThu ??
      d?.tongDoanhThu ??
      d?.totalRevenue ??
      d?.salesRevenue ??
      d?.invoices?.revenue ??
      d?.sales?.revenue ??
      d?.data?.revenue ??
      d?.data?.doanhThu ??
      0,
    0
  );

  const totalCost = toNumber(
    d?.totalCost ??
      d?.chiPhiNhap ??
      d?.tongChiPhiNhap ??
      d?.importCost ??
      d?.imports?.totalCost ??
      d?.stockin?.totalCost ??
      d?.data?.totalCost ??
      d?.data?.chiPhiNhap ??
      0,
    0
  );

  const profitBackend = toNumber(
    d?.profit ??
      d?.loiNhuan ??
      d?.grossProfit ??
      d?.netProfit ??
      d?.invoices?.profit ??
      d?.sales?.profit ??
      d?.data?.profit ??
      d?.data?.loiNhuan ??
      0,
    0
  );
  const profit = profitBackend !== 0 ? profitBackend : revenue - totalCost;

  const orders = toNumber(
    d?.orders ??
      d?.donBan ??
      d?.totalOrders ??
      d?.invoices?.count ??
      d?.sales?.orders ??
      d?.data?.orders ??
      d?.data?.donBan ??
      0,
    0
  );

  const imports = toNumber(
    d?.importsCount ??
      d?.luotNhap ??
      d?.totalImports ??
      d?.imports?.count ??
      d?.stockin?.count ??
      d?.data?.imports ??
      d?.data?.importsCount ??
      d?.data?.luotNhap ??
      0,
    0
  );

  return { revenue, totalCost, profit, orders, imports, raw: d };
}

// ===== normalize SALES ANALYTICS =====
function normalizeSalesAnalytics(resData) {
  const d0 = safeObj(resData);
  const d =
    safeObj(d0?.data) && Object.keys(d0?.data || {}).length ? d0.data : d0;

  const customers = toNumber(
    d?.customers ??
      d?.customersCount ??
      d?.customerCount ??
      d?.uniqueCustomers ??
      d?.uniqueCustomerCount ??
      0,
    0
  );

  const cogs = toNumber(
    d?.cogs ?? d?.totalCOGS ?? d?.totalCost ?? d?.cost ?? 0,
    0
  );

  const profit = toNumber(
    d?.profit ?? d?.grossProfit ?? d?.netProfit ?? 0,
    0
  );

  const revenue = toNumber(
    d?.revenue ?? d?.totalRevenue ?? d?.salesRevenue ?? 0,
    0
  );

  const topItems =
    safeArr(d?.topItems).length
      ? safeArr(d?.topItems)
      : safeArr(d?.topProducts).length
      ? safeArr(d?.topProducts)
      : safeArr(d?.items).length
      ? safeArr(d?.items)
      : [];

  // lưu raw để lấy revenue / cogs / profit nếu cần
  return { customers, cogs, profit, revenue, topItems, raw: d };
}

function formatDateTimeVN(x) {
  if (!x) return "-";
  const dt = new Date(x);
  if (Number.isNaN(dt.getTime())) return String(x);
  return dt.toLocaleString("vi-VN");
}

// ===== Chart helpers =====
function fmtShortVN(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  if (v >= 1_000_000_000) return `${Math.round(v / 1_000_000_000)}B`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return `${Math.round(v)}`;
}

function BarChart({ data = [], height = 220 }) {
  const max = Math.max(1, ...data.map((d) => toNumber(d.value, 0)));
  const W = 640;
  const H = height;
  const pad = { l: 16, r: 16, t: 14, b: 54 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const barGap = 18;
  const barW = data.length
    ? Math.max(26, Math.floor((innerW - barGap * (data.length - 1)) / data.length))
    : 0;

  return (
    <div className="chartWrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chartSvg" role="img" aria-label="Bar chart">
        {[0.25, 0.5, 0.75, 1].map((p) => {
          const y = pad.t + innerH * (1 - p);
          return (
            <g key={p}>
              <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y} className="chartGrid" />
              <text x={pad.l} y={y - 6} className="chartAxis">
                {fmtShortVN(max * p)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const v = toNumber(d.value, 0);
          const h = Math.max(0, (v / max) * innerH);
          const x = pad.l + i * (barW + barGap);
          const y = pad.t + (innerH - h);
          return (
            <g key={i}>
              <title>
                {d.label}: {money(v)} {d.hint ? `(${d.hint})` : ""}
              </title>
              <rect x={x} y={y} width={barW} height={h} rx={10} className="chartBar" />
              <text
                x={x + barW / 2}
                y={pad.t + innerH + 20}
                textAnchor="middle"
                className="chartLabel"
              >
                {d.label}
              </text>
              <text x={x + barW / 2} y={y - 8} textAnchor="middle" className="chartValue">
                {fmtShortVN(v)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function groupByDateValue(rows, getDate, getValue) {
  const map = new Map();
  rows.forEach((r) => {
    const raw = getDate(r);
    if (!raw) return;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return;
    const key = toISODateInput(dt);
    const v = toNumber(getValue(r), 0);
    map.set(key, (map.get(key) || 0) + v);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));
}

// ===== UI bits =====
function Pill({ active, children, onClick }) {
  return (
    <button className={`chip ${active ? "active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function KPI({ title, value, sub, badge }) {
  return (
    <div className="kpi">
      <div className="kpiTop">
        <div className="kpiTitle">{title}</div>
        {badge ? <div className="kpiBadge">{badge}</div> : null}
      </div>
      <div className="kpiValue">{value}</div>
      <div className="kpiSub">{sub}</div>
    </div>
  );
}

function EmptyState({ loading, text = "Không có dữ liệu." }) {
  return (
    <div
      style={{
        textAlign: "center",
        color: "#64748b",
        padding: 18,
        border: "1px dashed #e5e7eb",
        borderRadius: 14,
        background: "rgba(255,255,255,0.6)",
      }}
    >
      {loading ? "Đang tải..." : text}
    </div>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [tab, setTab] = useState("summary"); // summary | stockin | sales
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  const title = useMemo(() => {
    if (tab === "summary") return "Báo cáo tổng hợp";
    if (tab === "stockin") return "Báo cáo nhập kho";
    return "Báo cáo đơn đã bán";
  }, [tab]);

  const resetData = () => {
    setSummary(null);
    setRows([]);
    setAnalytics(null);
    setError("");
  };

  // fallback tính summary nếu backend summary trả toàn 0
  async function tryFallbackSummaryIfZero(sumObj) {
    const isAllZero =
      toNumber(sumObj?.revenue, 0) === 0 &&
      toNumber(sumObj?.totalCost, 0) === 0 &&
      toNumber(sumObj?.profit, 0) === 0 &&
      toNumber(sumObj?.orders, 0) === 0 &&
      toNumber(sumObj?.imports, 0) === 0;

    if (!isAllZero) return sumObj;

    try {
      const [salesRes, stockinRes] = await Promise.all([
        getReportSales({ from, to }),
        getReportStockIn({ from, to }),
      ]);

      const salesRows = safeArr(salesRes);
      const stockRows = safeArr(stockinRes);

      const revenue = salesRows.reduce((s, r) => s + getRowTotal(r, "sales"), 0);
      const totalCost = stockRows.reduce(
        (s, r) => s + getRowTotal(r, "stockin"),
        0
      );

      const orders = salesRows.length;
      const imports = stockRows.length;
      const profit = revenue - totalCost;

      return { ...sumObj, revenue, totalCost, orders, imports, profit, __fallback: true };
    } catch {
      return sumObj;
    }
  }

  const load = async () => {
    if (!from || !to) return alert("Vui lòng chọn từ ngày / đến ngày");

    try {
      setLoading(true);
      setError("");

      if (tab === "summary") setSummary(null);
      else setRows([]);
      if (tab === "sales") setAnalytics(null);

      if (tab === "summary") {
        const res = await getReportSummary({ from, to });
        const normalized = normalizeSummary(res);
        const finalSummary = await tryFallbackSummaryIfZero(normalized);
        setSummary(finalSummary);
        return;
      }

      if (tab === "stockin") {
        const res = await getReportStockIn({ from, to });
        setRows(safeArr(res));
        return;
      }

      const res = await getReportSales({ from, to });
      setRows(safeArr(res));

      try {
        const a = await getSalesAnalytics({ from, to, top: 10 });
        setAnalytics(normalizeSalesAnalytics(a));
      } catch {
        setAnalytics(null);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Lỗi tải báo cáo";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!from || !to) return alert("Vui lòng chọn từ ngày / đến ngày");

    try {
      setExporting(true);

      if (tab === "summary") {
        await exportReportSummaryExcel({ from, to });
        return;
      }
      if (tab === "stockin") {
        await exportReportStockInExcel({ from, to });
        return;
      }
      await exportReportSalesExcel({ from, to });
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Lỗi xuất Excel");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    resetData();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const salesDerived = useMemo(() => {
    if (tab !== "sales")
      return { customers: 0, cogs: 0, profit: 0, revenue: 0 };

    const revenue = rows.reduce(
      (sum, r) => sum + getRowTotal(r, "sales"),
      0
    );
    const cogs = rows.reduce((sum, r) => sum + getRowCOGS(r), 0);
    const profit = revenue - cogs;

    const set = new Set();
    rows.forEach((r) => {
      const key =
        r?.customerId ||
        r?.customerCode ||
        r?.maKhachHang ||
        r?.customerPhone ||
        r?.sdt ||
        r?.phone ||
        r?.customerName ||
        r?.customer ||
        r?.khachHang ||
        "";
      const s = String(key || "").trim().toLowerCase();
      if (s) set.add(s);
    });

    return { customers: set.size, cogs, profit, revenue };
  }, [tab, rows]);

  // Top items fallback: hỗ trợ itemName cho Invoice.items
  const topItemsFallback = useMemo(() => {
    if (tab !== "sales") return [];
    const map = new Map();

    rows.forEach((r) => {
      const items = Array.isArray(r?.items) ? r.items : [];
      items.forEach((it) => {
        const name =
          it?.name ??
          it?.itemName ??
          it?.tenVatLieu ??
          it?.productName ??
          it?.vatLieu ??
          "Không tên";

        const qty = toNumber(
          it?.qty ?? it?.soLuong ?? it?.quantity ?? 0,
          0
        );
        const price = toNumber(
          it?.price ?? it?.giaBan ?? it?.sellPrice ?? it?.donGia ?? 0,
          0
        );
        const revenue = qty * price;

        const key = String(name).trim().toLowerCase();
        const prev = map.get(key) || { name, qty: 0, revenue: 0 };
        prev.qty += qty;
        prev.revenue += revenue;
        map.set(key, prev);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [tab, rows]);

  const kpis = useMemo(() => {
    if (tab === "summary") {
      const s = summary || {};
      return [
        { title: "Doanh thu", value: money(s.revenue || 0), sub: "VNĐ", badge: "SUMMARY" },
        { title: "Chi phí nhập", value: money(s.totalCost || 0), sub: "VNĐ", badge: "SUMMARY" },
        { title: "Lợi nhuận", value: money(s.profit || 0), sub: "VNĐ", badge: "SUMMARY" },
        { title: "Đơn bán", value: money(s.orders || 0), sub: "đơn", badge: "SUMMARY" },
      ];
    }

    if (tab === "stockin") {
      const totalValue = rows.reduce(
        (sum, r) => sum + getRowTotal(r, "stockin"),
        0
      );
      return [
        { title: "Tổng phiếu nhập", value: money(rows.length), sub: "phiếu", badge: "STOCKIN" },
        { title: "Tổng giá trị (ước tính)", value: money(totalValue), sub: "VNĐ", badge: "STOCKIN" },
      ];
    }

    const a = analytics || {};
    const revenueBackend = toNumber(
      a.revenue ?? a.raw?.revenue ?? a.raw?.totalRevenue ?? 0,
      0
    );
    const totalSales =
      revenueBackend ||
      rows.reduce(
        (sum, r) => sum + getRowTotal(r, "sales"),
        0
      );

    const customers =
      toNumber(a.customers, 0) || salesDerived.customers || 0;
    const profit =
      toNumber(a.profit, 0) || salesDerived.profit || 0;

    return [
      { title: "Tổng đơn", value: money(rows.length), sub: "đơn", badge: "SALES" },
      { title: "Tổng doanh thu", value: money(totalSales), sub: "VNĐ", badge: "SALES" },
      { title: "Số khách mua", value: money(customers), sub: "khách", badge: "SALES" },
      { title: "Lợi nhuận", value: money(profit), sub: "VNĐ", badge: "SALES" },
    ];
  }, [tab, summary, rows, analytics, salesDerived]);

  const summaryChartData = useMemo(() => {
    const s = summary || {};
    return [
      { label: "Doanh thu", value: toNumber(s.revenue, 0), hint: "VNĐ" },
      { label: "Chi phí", value: toNumber(s.totalCost, 0), hint: "VNĐ" },
      { label: "Lợi nhuận", value: toNumber(s.profit, 0), hint: "VNĐ" },
    ];
  }, [summary]);

  const stockinChartData = useMemo(() => {
    if (tab !== "stockin") return [];
    const grouped = groupByDateValue(
      rows,
      (r) => r.createdAt || r.date || r.time,
      (r) => getRowTotal(r, "stockin")
    );
    const last = grouped.slice(-10);
    return last.map((x) => ({
      label: x.date.slice(5),
      value: x.value,
      hint: x.date,
    }));
  }, [tab, rows]);

  // ===== Chart cho sales – ƯU TIÊN số từ /reports/sales-analytics =====
  const salesChartData = useMemo(() => {
    if (tab !== "sales") return [];

    // lấy từ analytics.raw nếu có
    const revenueFromAnalytics = toNumber(
      analytics?.revenue ??
        analytics?.raw?.revenue ??
        analytics?.raw?.totalRevenue ??
        analytics?.raw?.salesRevenue ??
        0,
      0
    );

    const cogsFromAnalytics = toNumber(
      analytics?.cogs ??
        analytics?.raw?.cogs ??
        analytics?.raw?.totalCOGS ??
        analytics?.raw?.totalCost ??
        0,
      0
    );

    const profitFromAnalytics = toNumber(
      analytics?.profit ??
        analytics?.raw?.profit ??
        analytics?.raw?.grossProfit ??
        analytics?.raw?.netProfit ??
        0,
      0
    );

    // fallback tự tính từ danh sách đơn
    const revenueFallback = rows.reduce(
      (s, r) => s + getRowTotal(r, "sales"),
      0
    );
    const cogsFallback = rows.reduce(
      (s, r) => s + getRowCOGS(r),
      0
    );
    const profitFallback = revenueFallback - cogsFallback;

    const revenue = revenueFromAnalytics || revenueFallback;
    const cogs = cogsFromAnalytics || cogsFallback;
    const profit = profitFromAnalytics || profitFallback;

    return [
      { label: "Doanh thu", value: revenue, hint: "VNĐ" },
      { label: "Giá vốn", value: cogs, hint: "VNĐ" },
      { label: "Lợi nhuận", value: profit, hint: "VNĐ" },
    ];
  }, [tab, rows, analytics]);

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      {/* TOPBAR */}
      <div className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Reports</div>
            <div className="ttq-topbar-sub">
              Báo cáo · Xin chào, {user?.username || "bạn"}
            </div>
          </div>
        </div>

        <div className="ttq-topbar-right">
          <button className="ttq-btn-outline" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <button
            className="ttq-btn-outline"
            onClick={() => navigate("/dashboard")}
          >
            Về trang chính
          </button>
        </div>
      </div>

      <div className="container" style={{ marginTop: 12 }}>
        {/* HEADER */}
        <div className="head">
          <div>
            <h1 className="h1">{title}</h1>
            <div className="hint">
              Chọn khoảng thời gian → Xem báo cáo → Xuất Excel theo từng mục.
            </div>
          </div>

          <div className="chips">
            <Pill active={tab === "summary"} onClick={() => setTab("summary")}>
              Tổng hợp
            </Pill>
            <Pill active={tab === "stockin"} onClick={() => setTab("stockin")}>
              Nhập kho
            </Pill>
            <Pill active={tab === "sales"} onClick={() => setTab("sales")}>
              Đơn đã bán
            </Pill>
          </div>
        </div>

        {/* FILTER */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="filterRow">
            <div className="field">
              <label>Từ ngày</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Đến ngày</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="actions">
              <button className="btnDark" onClick={load} disabled={loading}>
                {loading ? "Đang tải..." : "Xem báo cáo"}
              </button>
              <button
                className="btnBrand"
                onClick={exportExcel}
                disabled={exporting}
              >
                {exporting ? "Đang xuất..." : "Xuất Excel"}
              </button>
            </div>
          </div>

          {error ? <div className="errorBox">❌ {error}</div> : null}
          {tab === "summary" && summary?.__fallback ? (
            <div className="note" style={{ marginTop: 8 }}>
              * Backend summary trả 0 nên UI đã tự tính từ đơn bán + phiếu nhập
              để hiển thị đúng.
            </div>
          ) : null}
        </div>

        {/* KPI */}
        <div className="kpiGrid">
          {kpis.map((k, idx) => (
            <KPI
              key={idx}
              title={k.title}
              value={k.value}
              sub={k.sub}
              badge={k.badge}
            />
          ))}
        </div>

        {/* CONTENT */}
        <div className="grid2">
          {/* Left */}
          <div className="card">
            <div className="cardHead">
              <div className="cardTitle">
                {tab === "sales" ? "Phân tích bán hàng" : "Ghi chú & Biểu đồ"}
              </div>
              <div className="cardSub">
                {from} → {to}
              </div>
            </div>

            {tab === "summary" && (
              <div style={{ marginTop: 12 }}>
                {!summary ? (
                  <EmptyState
                    loading={loading}
                    text="Chưa có dữ liệu tổng hợp để vẽ biểu đồ."
                  />
                ) : (
                  <>
                    <div className="noteLead">
                      Biểu đồ so sánh nhanh các chỉ số chính trong kỳ (VNĐ).
                    </div>
                    <div className="chartCard">
                      <div className="chartHead">
                        <div className="chartTitle">
                          Doanh thu · Chi phí · Lợi nhuận
                        </div>
                        <div className="chartSub">Nguồn: /reports/summary</div>
                      </div>
                      <BarChart data={summaryChartData} height={230} />
                      <div className="chartFoot">
                        <div>
                          <span className="dot" /> Doanh thu:{" "}
                          <b>{money(summary.revenue || 0)}</b> VNĐ
                        </div>
                        <div>
                          <span className="dot" /> Chi phí:{" "}
                          <b>{money(summary.totalCost || 0)}</b> VNĐ
                        </div>
                        <div>
                          <span className="dot" /> Lợi nhuận:{" "}
                          <b>{money(summary.profit || 0)}</b> VNĐ
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "stockin" && (
              <div style={{ marginTop: 12 }}>
                {!rows.length ? (
                  <EmptyState
                    loading={loading}
                    text="Chưa có phiếu nhập để vẽ biểu đồ."
                  />
                ) : (
                  <>
                    <div className="noteLead">
                      Biểu đồ tổng giá trị nhập theo ngày (lấy từ tổng tiền
                      mỗi phiếu).
                    </div>
                    <div className="chartCard">
                      <div className="chartHead">
                        <div className="chartTitle">
                          Tổng giá trị nhập theo ngày
                        </div>
                        <div className="chartSub">Tối đa 10 ngày gần nhất</div>
                      </div>
                      <BarChart data={stockinChartData} height={230} />
                      <div className="chartFoot">
                        <div>
                          <span className="dot" /> Tổng phiếu:{" "}
                          <b>{money(rows.length)}</b>
                        </div>
                        <div>
                          <span className="dot" /> Tổng giá trị:{" "}
                          <b>
                            {money(
                              rows.reduce(
                                (s, r) => s + getRowTotal(r, "stockin"),
                                0
                              )
                            )}
                          </b>{" "}
                          VNĐ
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "sales" && (
              <div style={{ marginTop: 12 }}>
                <div className="noteLead">
                  Tổng quan doanh thu, giá vốn và lợi nhuận trong kỳ.
                </div>

                <div className="chartCard" style={{ marginBottom: 12 }}>
                  <div className="chartHead">
                    <div className="chartTitle">
                      Doanh thu · Giá vốn · Lợi nhuận
                    </div>
                    <div className="chartSub">
                      Ưu tiên số từ /reports/sales-analytics · fallback từ danh
                      sách đơn
                    </div>
                  </div>
                  <BarChart data={salesChartData} height={230} />
                </div>

                {!analytics ? (
                  <>
                    <EmptyState
                      loading={loading}
                      text="Chưa có dữ liệu phân tích (hoặc backend chưa có /reports/sales-analytics)."
                    />
                    <div className="note" style={{ marginTop: 10 }}>
                      * KPI & chart vẫn hiển thị nhờ fallback từ danh sách đơn.
                    </div>
                  </>
                ) : (
                  <div className="note" style={{ marginBottom: 10 }}>
                    * Dữ liệu phân tích lấy từ endpoint{" "}
                    <b>/reports/sales-analytics</b>. Nếu backend trả thiếu, UI
                    sẽ fallback.
                  </div>
                )}

                <div className="miniGrid">
                  <div className="miniCard">
                    <div className="miniLabel">COGS (giá vốn)</div>
                    <div className="miniValue">
                      {money(
                        toNumber(analytics?.cogs, 0) ||
                          salesDerived.cogs ||
                          0
                      )}
                    </div>
                    <div className="miniSub">VNĐ</div>
                  </div>
                  <div className="miniCard">
                    <div className="miniLabel">Profit</div>
                    <div className="miniValue">
                      {money(
                        toNumber(analytics?.profit, 0) ||
                          salesDerived.profit ||
                          0
                      )}
                    </div>
                    <div className="miniSub">VNĐ</div>
                  </div>
                  <div className="miniCard">
                    <div className="miniLabel">Khách mua</div>
                    <div className="miniValue">
                      {money(
                        toNumber(analytics?.customers, 0) ||
                          salesDerived.customers ||
                          0
                      )}
                    </div>
                    <div className="miniSub">khách</div>
                  </div>
                </div>

                <div className="subTitle">Top mặt hàng bán nhiều</div>
                <div className="tableWrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Mặt hàng</th>
                        <th className="r">Số lượng</th>
                        <th className="r">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        (analytics?.topItems?.length
                          ? analytics.topItems
                          : topItemsFallback) || []
                      )
                        .slice(0, 10)
                        .map((it, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 900 }}>
                              {it.name ||
                                it.itemName ||
                                it.tenVatLieu ||
                                it.productName ||
                                "-"}
                            </td>
                            <td className="r">
                              {money(
                                it.qty ||
                                  it.totalQty ||
                                  it.quantity ||
                                  it.soldQty ||
                                  0
                              )}
                            </td>
                            <td className="r">
                              {money(
                                it.revenue ||
                                  it.totalRevenue ||
                                  it.total ||
                                  it.amount ||
                                  0
                              )}
                            </td>
                          </tr>
                        ))}

                      {!analytics?.topItems?.length &&
                      !topItemsFallback.length ? (
                        <tr>
                          <td
                            colSpan={3}
                            style={{
                              textAlign: "center",
                              color: "#64748b",
                              padding: 14,
                            }}
                          >
                            Không có dữ liệu top mặt hàng.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="card">
            <div className="cardHead">
              <div className="cardTitle">Chi tiết</div>
              <div className="cardSub">
                {tab === "summary"
                  ? "Tổng hợp từ backend"
                  : tab === "stockin"
                  ? "Danh sách phiếu nhập"
                  : "Danh sách đơn bán"}
              </div>
            </div>

            <div className="tableWrap">
              {/* SUMMARY */}
              {tab === "summary" && (
                <>
                  {!summary ? (
                    <div style={{ marginTop: 12 }}>
                      <EmptyState
                        loading={loading}
                        text="Chưa có dữ liệu tổng hợp."
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div className="rowLine">
                        <span>Doanh thu</span>
                        <b>{money(summary.revenue || 0)} VNĐ</b>
                      </div>
                      <div className="rowLine">
                        <span>Chi phí nhập</span>
                        <b>{money(summary.totalCost || 0)} VNĐ</b>
                      </div>
                      <div className="rowLine">
                        <span>Lợi nhuận</span>
                        <b>{money(summary.profit || 0)} VNĐ</b>
                      </div>
                      <div className="rowLine">
                        <span>Đơn bán</span>
                        <b>{money(summary.orders || 0)}</b>
                      </div>
                      <div className="rowLine">
                        <span>Lượt nhập</span>
                        <b>{money(summary.imports || 0)}</b>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* STOCKIN */}
              {tab === "stockin" && (
                <>
                  {!rows.length ? (
                    <div style={{ marginTop: 12 }}>
                      <EmptyState
                        loading={loading}
                        text="Không có phiếu nhập trong khoảng thời gian này."
                      />
                    </div>
                  ) : (
                    <table className="table" style={{ marginTop: 12 }}>
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Nhà cung cấp / Đối tác</th>
                          <th className="r">Số dòng</th>
                          <th className="r">Tổng tiền</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 80).map((r) => (
                          <tr
                            key={
                              r._id || r.id || `${r.createdAt}-${Math.random()}`
                            }
                          >
                            <td>
                              {formatDateTimeVN(
                                r.createdAt || r.date || r.time
                              )}
                            </td>
                            <td style={{ fontWeight: 900 }}>
                              {r.partner ||
                                r.supplier ||
                                r.nhaCungCap ||
                                r.supplierName ||
                                "-"}
                            </td>
                            <td className="r">
                              {money(
                                (r.items?.length ??
                                  r.lines ??
                                  r.countItems) || 0
                              )}
                            </td>
                            <td className="r">
                              {money(getRowTotal(r, "stockin"))}
                            </td>
                            <td>{r.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {rows.length > 80 ? (
                    <div className="note">
                      * Preview hiển thị 80 dòng. Excel sẽ xuất đầy đủ.
                    </div>
                  ) : null}
                </>
              )}

              {/* SALES */}
              {tab === "sales" && (
                <>
                  {!rows.length ? (
                    <div style={{ marginTop: 12 }}>
                      <EmptyState
                        loading={loading}
                        text="Không có đơn bán trong khoảng thời gian này."
                      />
                    </div>
                  ) : (
                    <table className="table" style={{ marginTop: 12 }}>
                      <thead>
                        <tr>
                          <th>Mã HĐ</th>
                          <th>Thời gian</th>
                          <th>Khách hàng</th>
                          <th className="r">Số SP</th>
                          <th className="r">Tổng tiền</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 80).map((r) => (
                          <tr
                            key={
                              r._id || r.id || `${r.createdAt}-${Math.random()}`
                            }
                          >
                            <td className="mono">
                              {r.invoiceNo || r.code || r.maHoaDon || "-"}
                            </td>
                            <td>
                              {formatDateTimeVN(
                                r.createdAt || r.date || r.time
                              )}
                            </td>
                            <td style={{ fontWeight: 900 }}>
                              {r.customerName ||
                                r.customer ||
                                r.khachHang ||
                                "Khách lẻ"}
                            </td>
                            <td className="r">
                              {money(
                                (r.items?.length ??
                                  r.itemsCount ??
                                  r.totalItems) || 0
                              )}
                            </td>
                            <td className="r">
                              {money(getRowTotal(r, "sales"))}
                            </td>
                            <td>{r.note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {rows.length > 80 ? (
                    <div className="note">
                      * Preview hiển thị 80 dòng. Excel sẽ xuất đầy đủ.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS giữ nguyên */}
      <style>{`
        :root{
          --bg:#f6f8fc;
          --card:#ffffff;
          --line:#e5e7eb;
          --muted:#64748b;
          --text:#0f172a;
          --brand:#0ea5e9;
          --dark:#111827;
        }
        .ttq-page{ background:var(--bg); min-height:100vh; }
        .container{ max-width: 1150px; margin: 0 auto; }

        .ttq-topbar{
          position: sticky; top:0; z-index:20;
          display:flex; justify-content:space-between; align-items:center; gap:12px;
          padding: 12px 14px; border-radius: 14px;
          border:1px solid rgba(229,231,235,0.85);
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
        }
        .ttq-topbar-left{ display:flex; align-items:center; gap:10px; min-width: 220px; }
        .ttq-topbar-logo{
          width:44px; height:44px; object-fit:contain;
          border-radius:12px; background:#fff;
          border: 1px solid #eef2f7;
        }
        .ttq-topbar-name{ font-weight:900; color:var(--text); line-height:1.1; }
        .ttq-topbar-sub{ font-size:12px; color:#6b7280; margin-top:2px; }
        .ttq-topbar-right{ display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }

        .ttq-btn-outline{
          padding:10px 14px; border-radius:12px;
          cursor:pointer; font-weight:900;
          border:1px solid var(--line); background:#fff; color:var(--text);
        }
        .ttq-btn-outline:hover{ filter: brightness(0.98); }
        .ttq-btn-outline:disabled{ opacity:.7; cursor:not-allowed; }

        .head{
          display:flex; justify-content:space-between; align-items:flex-end;
          gap:12px; margin-top:12px;
        }
        .h1{ margin:0; font-size:22px; font-weight:900; color:var(--text); }
        .hint{ margin-top:6px; font-size:13px; color:var(--muted); }

        .chips{ display:flex; gap:8px; flex-wrap:wrap; }
        .chip{
          padding:8px 12px; border-radius:999px;
          border:1px solid var(--line); background:#fff;
          cursor:pointer; font-weight:900; color:var(--text);
        }
        .chip.active{
          border-color: rgba(14,165,233,.35);
          background: rgba(14,165,233,.12);
          color: #0369a1;
        }

        .card{
          background:var(--card);
          border:1px solid var(--line);
          border-radius:18px;
          padding:16px;
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
        }

        .filterRow{
          display:flex; gap:12px; flex-wrap:wrap;
          align-items:flex-end; justify-content:space-between;
        }
        .field{ min-width: 220px; flex: 1; }
        .field label{
          display:block; font-size:12px; color:var(--muted);
          font-weight:900; margin-bottom:6px;
        }
        input{
          width:100%;
          padding:10px 12px;
          border-radius:12px;
          border:1px solid var(--line);
          outline:none;
          background:#fff;
        }

        .actions{
          display:flex; gap:10px; align-items:center;
          justify-content:flex-end;
          min-width: 260px;
        }
        .btnDark{
          padding:10px 14px; border-radius:12px;
          border:0; cursor:pointer; font-weight:900;
          background: var(--dark); color:#fff;
        }
        .btnDark:disabled{ opacity:.7; cursor:not-allowed; }
        .btnBrand{
          padding:10px 14px; border-radius:12px;
          border:0; cursor:pointer; font-weight:900;
          background: var(--brand); color:#fff;
        }
        .btnBrand:disabled{ opacity:.7; cursor:not-allowed; }

        .errorBox{
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #991b1b;
          font-weight: 800;
          font-size: 13px;
        }

        .kpiGrid{
          margin-top:12px;
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap:12px;
        }
        @media (max-width: 1000px){
          .kpiGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .head{ flex-direction: column; align-items:flex-start; }
        }
        @media (max-width: 560px){
          .kpiGrid{ grid-template-columns: 1fr; }
          .actions{ min-width: 100%; justify-content:stretch; }
          .actions button{ flex:1; }
        }

        .kpi{
          background:#fff;
          border:1px solid rgba(229,231,235,0.9);
          border-radius:16px;
          padding:14px;
          box-shadow: 0 10px 24px rgba(15,23,42,0.05);
        }
        .kpiTop{ display:flex; justify-content:space-between; align-items:center; }
        .kpiTitle{ font-size:12px; color:var(--muted); font-weight:900; }
        .kpiBadge{
          font-size:11px; font-weight:900;
          padding:6px 10px; border-radius:999px;
          background:#f1f5f9; border:1px solid #e2e8f0;
          color:#0f172a;
        }
        .kpiValue{ margin-top:10px; font-size:20px; font-weight:900; color:var(--text); }
        .kpiSub{ margin-top:2px; font-size:12px; color:var(--muted); }

        .grid2{
          margin-top:12px;
          display:grid;
          grid-template-columns: 1.05fr 1.55fr;
          gap:12px;
        }
        @media (max-width: 1000px){
          .grid2{ grid-template-columns: 1fr; }
        }

        .cardHead{ display:flex; justify-content:space-between; align-items:flex-end; gap:10px; }
        .cardTitle{ font-weight:900; color:var(--text); }
        .cardSub{ font-size:12px; color:var(--muted); }

        .tableWrap{ margin-top: 12px; overflow:auto; }
        .table{ width:100%; border-collapse:collapse; }
        .table th,.table td{
          border-bottom:1px solid #eef2f7;
          padding:10px 10px;
          font-size:14px;
          vertical-align: middle;
        }
        .table th{
          font-size:12px;
          color: var(--muted);
          font-weight: 900;
        }
        .r{ text-align:right; }
        .mono{
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New";
        }

        .note{
          margin-top:10px;
          font-size:12px;
          color: var(--muted);
        }

        .rowLine{
          display:flex; justify-content:space-between; align-items:center;
          padding: 10px 12px;
          border: 1px solid #eef2f7;
          border-radius: 12px;
          background: #fff;
        }

        .miniGrid{
          display:grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap:10px;
          margin-top: 10px;
        }
        @media (max-width: 560px){
          .miniGrid{ grid-template-columns: 1fr; }
        }
        .miniCard{
          border: 1px solid #eef2f7;
          border-radius: 14px;
          padding: 12px;
          background: #fff;
        }
        .miniLabel{
          font-size: 12px;
          color: var(--muted);
          font-weight: 900;
        }
        .miniValue{
          margin-top: 8px;
          font-size: 18px;
          font-weight: 900;
          color: var(--text);
        }
        .miniSub{
          margin-top: 2px;
          font-size: 12px;
          color: var(--muted);
        }
        .subTitle{
          margin-top: 14px;
          font-weight: 900;
          color: var(--text);
        }

        .noteLead{
          font-size: 13px;
          color: var(--muted);
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .chartCard{
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 12px;
          background: #fff;
          box-shadow: 0 10px 24px rgba(15,23,42,0.04);
        }
        .chartHead{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap: 10px;
          margin-bottom: 8px;
        }
        .chartTitle{
          font-weight: 900;
          color: var(--text);
          font-size: 14px;
        }
        .chartSub{
          font-size: 12px;
          color: var(--muted);
        }
        .chartWrap{ width: 100%; overflow:hidden; border-radius: 14px; }
        .chartSvg{ width: 100%; height: auto; display:block; }
        .chartGrid{ stroke: #eef2f7; stroke-width: 2; }
        .chartAxis{ font-size: 12px; fill: #94a3b8; font-weight: 800; }
        .chartBar{ fill: rgba(14,165,233,0.9); }
        .chartLabel{ font-size: 12px; fill: #334155; font-weight: 800; }
        .chartValue{ font-size: 12px; fill: #0f172a; font-weight: 900; }

        .chartFoot{
          margin-top: 10px;
          display:flex;
          flex-wrap: wrap;
          gap: 10px 14px;
          font-size: 12px;
          color: #475569;
        }
        .dot{
          display:inline-block;
          width: 10px; height: 10px;
          border-radius: 999px;
          background: rgba(14,165,233,0.9);
          margin-right: 6px;
          position: relative;
          top: 1px;
        }
      `}</style>
    </div>
  );
}
