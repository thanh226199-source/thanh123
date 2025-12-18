import React, { useState } from "react";
import { getReportSummary, exportReportSummaryExcel } from "../api/reportApi";

export default function ReportPage() {
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState("2025-01-31");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getReportSummary({ from, to });
      setData(res.data);
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi tải báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      await exportReportSummaryExcel({ from, to });
    } catch (e) {
      alert(e?.response?.data?.message || "Lỗi xuất Excel");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Báo cáo</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={load} disabled={loading}>
          {loading ? "Đang tải..." : "Xem báo cáo"}
        </button>
        <button onClick={exportExcel}>Xuất Excel</button>
      </div>

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>Doanh thu</div>
            <div style={{ fontSize: 22, marginTop: 6 }}>
              {Number(data?.invoices?.revenue || 0).toLocaleString()} đ
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>Chi phí nhập</div>
            <div style={{ fontSize: 22, marginTop: 6 }}>
              {Number(data?.imports?.totalCost || 0).toLocaleString()} đ
            </div>
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>Lợi nhuận</div>
            <div style={{ fontSize: 22, marginTop: 6 }}>
              {Number(data?.profit || 0).toLocaleString()} đ
            </div>
            <div style={{ marginTop: 6, color: "#64748b" }}>{data?.status}</div>
          </div>
        </div>
      )}
    </div>
  );
}
