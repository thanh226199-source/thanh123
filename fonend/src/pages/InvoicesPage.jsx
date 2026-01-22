// src/pages/InvoicesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { getInvoices } from "../api/invoiceApi";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

function safeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

// ✅ TÍNH TỔNG TIỀN HOÁ ĐƠN (hỗ trợ nhiều kiểu backend)
function calcInvoiceTotal(inv) {
  const direct =
    inv?.totalPay ??
    inv?.total_pay ??
    inv?.payTotal ??
    inv?.finalTotal ??
    inv?.thanhToan ??
    inv?.tongThanhToan ??
    inv?.totalAfterDiscount ??
    inv?.total ??
    inv?.tong ??
    inv?.amount ??
    inv?.totalAmount ??
    inv?.grandTotal;

  const directNum = Number(direct || 0);
  if (Number.isFinite(directNum) && directNum > 0) return directNum;

  const items = Array.isArray(inv?.items) ? inv.items : [];
  const sum = items.reduce((s, it) => {
    const qty = Number(it?.qty ?? it?.soLuong ?? it?.quantity ?? 0);
    const price = Number(it?.price ?? it?.donGia ?? it?.giaBan ?? it?.giaXuat ?? 0);

    const line =
      it?.lineTotal ??
      it?.thanhTien ??
      it?.total ??
      (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0);

    const lineNum = Number(line || 0);
    return s + (Number.isFinite(lineNum) ? lineNum : 0);
  }, 0);

  return Number.isFinite(sum) ? sum : 0;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [q, setQ] = useState(""); // tìm kiếm
  const [timeFilter, setTimeFilter] = useState("all"); // all | today | month

  const load = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setRows(safeArray(data));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Không tải được danh sách hoá đơn");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  // ====== DERIVED ======
  const totalCount = useMemo(() => rows.length, [rows]);

  const today = useMemo(() => new Date(), []);
  const stats = useMemo(() => {
    if (!rows.length) {
      return {
        total: 0,
        todayTotal: 0,
        monthTotal: 0,
        todayCount: 0,
        monthCount: 0,
      };
    }

    let total = 0;
    let todayTotal = 0;
    let monthTotal = 0;
    let todayCount = 0;
    let monthCount = 0;

    for (const inv of rows) {
      const t = calcInvoiceTotal(inv);
      total += t;

      if (!inv?.createdAt) continue;
      const d = new Date(inv.createdAt);

      if (isSameDay(d, today)) {
        todayTotal += t;
        todayCount += 1;
      }
      if (isSameMonth(d, today)) {
        monthTotal += t;
        monthCount += 1;
      }
    }

    return { total, todayTotal, monthTotal, todayCount, monthCount };
  }, [rows, today]);

  const filteredRows = useMemo(() => {
    let list = [...rows];

    const keyword = q.trim().toLowerCase();
    if (keyword) {
      list = list.filter((r) => {
        const invoiceNo = (r.invoiceNo || r.code || "").toString().toLowerCase();
        const name = (r.customerName || r.customer?.name || "").toString().toLowerCase();
        const phone = (r.customerPhone || r.customer?.phone || "").toString().toLowerCase();
        return (
          invoiceNo.includes(keyword) ||
          name.includes(keyword) ||
          phone.includes(keyword)
        );
      });
    }

    if (timeFilter !== "all") {
      list = list.filter((r) => {
        if (!r?.createdAt) return false;
        const d = new Date(r.createdAt);
        if (timeFilter === "today") return isSameDay(d, today);
        if (timeFilter === "month") return isSameMonth(d, today);
        return true;
      });
    }

    return list;
  }, [rows, q, timeFilter, today]);

  const goDetail = (row) => {
    const id = row?._id || row?.id;
    if (!id) {
      alert("Hoá đơn này thiếu ID (_id). Không thể xem chi tiết.");
      return;
    }
    navigate(`/invoices/${id}`);
  };

  return (
    <div className="pageWrap">
      {/* HEADER */}
      <div className="topHeader">
        <div className="topHeaderCard">
          <div className="topLeft">
            <div className="topLogoBox">
              <img src={TTQLogo} alt="TTQ" className="topLogo" />
            </div>
            <div>
              <div className="topTitle">TTQ Invoices</div>
              <div className="topSub">Danh sách hoá đơn</div>
            </div>
          </div>

          <div className="topActions">
            <button className="topBtn" onClick={load} type="button">
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
            <button
              className="topBtn"
              onClick={() => navigate("/invoices/create")}
              type="button"
            >
              + Tạo hoá đơn
            </button>
            <button className="topBtn" onClick={() => navigate("/dashboard")} type="button">
              Về trang chính
            </button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="pageBody">
        {/* SUMMARY BAR */}
        <div className="summaryRow">
          <div className="sumCard">
            <div className="sumLabel">Tổng hoá đơn</div>
            <div className="sumValue">{totalCount}</div>
            <div className="sumSub">Tất cả thời gian</div>
          </div>
          <div className="sumCard">
            <div className="sumLabel">Doanh thu</div>
            <div className="sumValue">{money(stats.total)} đ</div>
            <div className="sumSub">Tổng cộng</div>
          </div>
          <div className="sumCard">
            <div className="sumLabel">Hôm nay</div>
            <div className="sumValue">
              {stats.todayCount} HD · {money(stats.todayTotal)} đ
            </div>
            <div className="sumSub">Theo ngày hệ thống</div>
          </div>
          <div className="sumCard sumMain">
            <div className="sumLabel">Tháng này</div>
            <div className="sumValue">
              {stats.monthCount} HD · {money(stats.monthTotal)} đ
            </div>
            <div className="sumSub">Ước tính theo dữ liệu hiện tại</div>
          </div>
        </div>

        {/* card */}
        <div className="card">
          <div className="cardHead">
            <div>
              <div className="cardTitle">Danh sách hoá đơn</div>
              <div className="cardSub">
                {loading
                  ? "Đang tải..."
                  : `Tổng: ${totalCount} hoá đơn · Hiển thị: ${filteredRows.length}`}
              </div>
            </div>

            <div className="cardFilters">
              <input
                className="searchInput"
                placeholder="Tìm Số HD / Tên KH / SĐT..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <div className="filterTabs">
                <button
                  type="button"
                  className={`filterTab ${timeFilter === "all" ? "active" : ""}`}
                  onClick={() => setTimeFilter("all")}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`filterTab ${timeFilter === "today" ? "active" : ""}`}
                  onClick={() => setTimeFilter("today")}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  className={`filterTab ${timeFilter === "month" ? "active" : ""}`}
                  onClick={() => setTimeFilter("month")}
                >
                  Tháng này
                </button>
              </div>

              <div className="countPill">{totalCount} HD</div>
            </div>
          </div>

          <div className="cardContent">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="thLeft">Số HD</th>
                  <th className="thLeft">Khách hàng</th>
                  <th className="thLeft">SĐT</th>
                  <th className="thLeft">Ngày tạo</th>
                  <th className="thRight">Tổng</th>
                  <th className="thRight">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="emptyCell">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="emptyCell">
                      Không có hoá đơn nào khớp bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => {
                    const totalShow = calcInvoiceTotal(r);
                    const hasId = !!(r?._id || r?.id);

                    return (
                      <tr key={r._id || r.id || r.invoiceNo}>
                        <td className="td strong mono">{r.invoiceNo || r.code || "—"}</td>

                        <td className="td">
                          <div className="strong">
                            {r.customerName || r.customer?.name || "—"}
                          </div>
                          <div className="mutedSmall">
                            {r.customerAddress || r.customer?.address || ""}
                          </div>
                        </td>

                        <td className="td strong">
                          {r.customerPhone || r.customer?.phone || "—"}
                        </td>

                        <td className="td">
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleString("vi-VN")
                            : "—"}
                        </td>

                        <td className="td tdRight strong">{money(totalShow)} đ</td>

                        <td className="td tdRight">
                          <button
                            onClick={() => goDetail(r)}
                            disabled={!hasId}
                            className="actionBtn"
                            style={{
                              cursor: hasId ? "pointer" : "not-allowed",
                              background: hasId ? "#fff" : "#f3f4f6",
                              opacity: hasId ? 1 : 0.6,
                            }}
                            title={
                              !hasId
                                ? "Hoá đơn thiếu _id nên không xem chi tiết được"
                                : "Xem chi tiết & in"
                            }
                            type="button"
                          >
                            Xem / In
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        :root{
          --border:#e5e7eb;
          --text:#111827;
          --muted:#6b7280;
          --bg:#f6f8fc;
          --blue:#2563eb;
        }
        .pageWrap{
          background: var(--bg);
          min-height: 100vh;
          padding: 0;
          color: var(--text);
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* ===== HEADER ===== */
        .topHeader{
          padding: 10px 16px 0 16px;
        }
        .topHeaderCard{
          max-width: 1200px;
          margin: 0 auto;
          background:#fff;
          border:1px solid var(--border);
          border-radius:14px;
          box-shadow: 0 10px 28px rgba(15,23,42,0.08);
          padding: 10px 12px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 12px;
        }
        .topLeft{
          display:flex;
          align-items:center;
          gap: 10px;
          min-width: 220px;
        }
        .topLogoBox{
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid var(--border);
          display:flex;
          align-items:center;
          justify-content:center;
          background:#fff;
          overflow:hidden;
        }
        .topLogo{
          width: 26px;
          height: 26px;
          object-fit: contain;
        }
        .topTitle{
          font-weight: 900;
          font-size: 16px;
          line-height: 1.2;
        }
        .topSub{
          margin-top: 2px;
          font-size: 12px;
          color: var(--muted);
        }
        .topActions{
          display:flex;
          gap: 10px;
          align-items:center;
          justify-content:flex-end;
          flex-wrap: nowrap;
        }
        .topBtn{
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 12px;
          padding: 8px 14px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          font-size: 13px;
        }
        .topBtn:hover{ background:#f9fafb; }

        /* ===== BODY ===== */
        .pageBody{
          max-width: 1200px;
          margin: 12px auto 20px auto;
          padding: 0 16px 18px;
        }

        .summaryRow{
          display:grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 10px;
          margin-bottom: 12px;
        }
        .sumCard{
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          background:#fff;
          padding: 8px 10px;
          box-shadow: 0 10px 24px rgba(15,23,42,0.03);
        }
        .sumMain{
          background: linear-gradient(135deg,#eef2ff,#ffffff);
          border-color:#c7d2fe;
        }
        .sumLabel{
          font-size: 11px;
          letter-spacing: .05em;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 700;
        }
        .sumValue{
          margin-top: 4px;
          font-size: 15px;
          font-weight: 900;
          color:#111827;
        }
        .sumSub{
          margin-top: 3px;
          font-size: 11px;
          color: #94a3b8;
        }

        .card{
          background:#fff;
          border:1px solid var(--border);
          border-radius:16px;
          box-shadow: 0 18px 35px rgba(15,23,42,0.06);
          overflow:hidden;
        }
        .cardHead{
          padding: 14px 18px;
          border-bottom: 1px solid #eef2f7;
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap: 12px;
        }
        .cardTitle{ font-size: 18px; font-weight: 900; }
        .cardSub{ font-size: 12px; color: var(--muted); margin-top: 2px; }

        .cardFilters{
          display:flex;
          align-items:center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content:flex-end;
        }

        .searchInput{
          width: 220px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          font-size: 13px;
          outline:none;
          background:#fff;
        }
        .searchInput:focus{
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }

        .filterTabs{
          display:flex;
          border-radius: 999px;
          background:#f3f4f6;
          padding: 2px;
          gap: 2px;
        }
        .filterTab{
          border: none;
          background: transparent;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          cursor:pointer;
          color:#4b5563;
          font-weight:600;
        }
        .filterTab.active{
          background:#fff;
          box-shadow: 0 1px 4px rgba(15,23,42,0.12);
          color:#111827;
        }

        .countPill{
          font-size: 12px;
          font-weight: 900;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #f8fafc;
          height: fit-content;
          white-space: nowrap;
        }

        .cardContent{ padding: 0 18px 16px; }

        .tbl{
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .tbl thead tr{
          background:#f9fafb;
        }
        .tbl th{
          padding: 10px 8px;
          border-bottom: 1px solid #e5e7eb;
          color: #111827;
          font-weight: 800;
        }
        .thLeft{ text-align: left; }
        .thRight{ text-align: right; }

        .tbl tbody tr:hover{
          background:#f9fafb;
        }

        .tbl td{
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }
        .tdRight{ text-align: right; }
        .strong{ font-weight: 900; }
        .mutedSmall{ font-size: 12px; color: var(--muted); margin-top: 2px; }
        .mono{
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
        }

        .emptyCell{
          padding: 14px;
          text-align: center;
          color: var(--muted);
        }

        .actionBtn{
          padding: 8px 12px;
          border-radius: 12px;
          font-weight: 900;
          border: 1px solid var(--border);
          font-size: 12px;
        }

        @media (max-width: 1024px){
          .summaryRow{
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
          .cardHead{
            flex-direction: column;
            align-items:flex-start;
          }
          .cardFilters{
            width:100%;
            justify-content:flex-start;
          }
        }

        @media (max-width: 768px){
          .topHeaderCard{
            flex-direction: column;
            align-items:flex-start;
          }
          .topActions{
            flex-wrap: wrap;
            justify-content:flex-start;
          }
          .summaryRow{
            grid-template-columns: 1fr;
          }
          .cardContent{
            padding: 0 12px 12px;
          }
        }
      `}</style>
    </div>
  );
}
