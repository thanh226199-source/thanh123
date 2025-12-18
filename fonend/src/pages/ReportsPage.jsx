import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";

import {
  getReportSummary,
  exportReportSummaryExcel,
  getReportStockIn,
  exportReportStockInExcel,
  getReportSales,
  exportReportSalesExcel,
} from "../api/reportApi";

export default function ReportsPage() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const [from, setFrom] = useState(`${yyyy}-${mm}-01`);
  const [to, setTo] = useState(`${yyyy}-${mm}-${dd}`);

  const [tab, setTab] = useState("summary"); // summary | stockin | sales
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const title = useMemo(() => {
    if (tab === "summary") return "Báo cáo tổng hợp";
    if (tab === "stockin") return "Báo cáo nhập kho";
    return "Báo cáo đơn đã bán";
  }, [tab]);

  const load = async () => {
    try {
      setLoading(true);
      setData(null);

      if (tab === "summary") {
        const res = await getReportSummary({ from, to });
        setData(res.data);
      } else if (tab === "stockin") {
        const res = await getReportStockIn({ from, to });
        setData(res.data);
      } else {
        const res = await getReportSales({ from, to });
        setData(res.data);
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi tải báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      if (!from || !to) return alert("Vui lòng chọn từ ngày/đến ngày");

      if (tab === "summary") await exportReportSummaryExcel({ from, to });
      else if (tab === "stockin") await exportReportStockInExcel({ from, to });
      else await exportReportSalesExcel({ from, to });
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi export excel");
    }
  };

  const onRefresh = () => {
    // làm mới UI: giữ tab & ngày, chỉ xoá dữ liệu đang xem
    setData(null);
  };

  const Card = ({ label, value, sub }) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        minWidth: 220,
      }}
    >
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      {/* ✅ HEADER (đồng bộ như các trang khác) */}
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
          <button className="ttq-btn-outline" onClick={onRefresh} disabled={loading}>
            Làm mới
          </button>
          <button className="ttq-btn-outline" onClick={() => navigate("/dashboard")}>
            Về trang chính
          </button>
        </div>
      </div>

      <div className="ttq-page-head" style={{ marginTop: 12 }}>
        <div className="ttq-title-wrap">
          <h1 className="ttq-h1">{title}</h1>
          <div className="ttq-hint">Chọn khoảng thời gian → Xem báo cáo → Xuất Excel theo từng mục.</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={() => { setTab("summary"); setData(null); }}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: tab === "summary" ? "#0ea5e9" : "#fff",
            color: tab === "summary" ? "#fff" : "#111827",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Tổng hợp
        </button>

        <button
          onClick={() => { setTab("stockin"); setData(null); }}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: tab === "stockin" ? "#0ea5e9" : "#fff",
            color: tab === "stockin" ? "#fff" : "#111827",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Nhập kho
        </button>

        <button
          onClick={() => { setTab("sales"); setData(null); }}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: tab === "sales" ? "#0ea5e9" : "#fff",
            color: tab === "sales" ? "#fff" : "#111827",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Đơn đã bán
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginTop: 14,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Từ ngày</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Đến ngày</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#111827",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {loading ? "Đang tải..." : "Xem báo cáo"}
        </button>

        <button
          onClick={exportExcel}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#0ea5e9",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Xuất Excel
        </button>
      </div>

      {/* Content */}
      <div style={{ marginTop: 14 }}>
        {tab === "summary" && data && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Card label="Doanh thu" value={data?.invoices?.revenue || 0} />
            <Card label="Chi phí nhập" value={data?.imports?.totalCost || 0} />
            <Card
              label="Lợi nhuận"
              value={data?.profit || 0}
              sub={data?.status ? `Trạng thái: ${data.status}` : ""}
            />
          </div>
        )}

        {tab !== "summary" && Array.isArray(data) && (
          <div
            style={{
              marginTop: 10,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Tổng số bản ghi: {data.length}</div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>Thời gian</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>Thông tin</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row) => (
                    <tr key={row._id}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString("vi-VN") : "-"}
                      </td>

                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
                        {tab === "stockin" ? (
                          <>
                            <div>
                              <b>Đối tác:</b> {row.partner || row.supplier || "-"}
                            </div>
                            <div>
                              <b>Số dòng:</b> {Array.isArray(row.items) ? row.items.length : 0}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <b>HĐ:</b> {row.invoiceNo || "-"}
                            </div>
                            <div>
                              <b>KH:</b> {row.customerName || "-"}
                            </div>
                          </>
                        )}
                      </td>

                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{row.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                *Bảng preview hiển thị 50 dòng gần nhất. File Excel sẽ xuất đầy đủ.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ Styles header đồng bộ */}
      <style>{`
        :root{
          --bg:#f6f8fc;
          --card:#ffffff;
          --line:#e5e7eb;
          --muted:#64748b;
          --text:#0f172a;
        }

        .ttq-page{ background:var(--bg); min-height:100vh; }

        .ttq-topbar{
          position: sticky;
          top: 0;
          z-index: 20;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(229,231,235,0.85);
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
        }
        .ttq-topbar-left{ display:flex; align-items:center; gap: 10px; min-width: 220px; }
        .ttq-topbar-logo{
          width: 44px; height: 44px; object-fit: contain;
          border-radius: 12px; background: #fff;
          border: 1px solid #eef2f7;
        }
        .ttq-topbar-name{ font-weight: 900; color: var(--text); line-height: 1.1; }
        .ttq-topbar-sub{ font-size: 12px; color: #6b7280; margin-top: 2px; }
        .ttq-topbar-right{
          display:flex; gap:10px; align-items:center; flex-wrap:wrap;
          justify-content:flex-end;
        }

        .ttq-btn-outline{
          padding:10px 14px;
          border-radius:12px;
          cursor:pointer;
          font-weight:900;
          border:1px solid var(--line);
          background:#fff;
          color: var(--text);
        }
        .ttq-btn-outline:hover{ filter: brightness(0.98); }
        .ttq-btn-outline:disabled{ opacity:.6; cursor:not-allowed; }

        .ttq-page-head{ max-width: 1200px; margin: 0 auto; padding: 0 2px; }
        .ttq-title-wrap{ padding: 2px 2px; }
        .ttq-h1{ margin: 0; font-size: 22px; font-weight: 900; color: var(--text); }
        .ttq-hint{ font-size: 13px; color: var(--muted); margin-top: 6px; }

        @media (max-width: 1000px){
          .ttq-topbar{ flex-direction: column; align-items: flex-start; }
          .ttq-topbar-right{ justify-content:flex-start; }
        }
      `}</style>
    </div>
  );
}
