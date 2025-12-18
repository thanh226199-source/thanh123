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
  return [];
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const totalCount = useMemo(() => rows.length, [rows]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getInvoices();
      setRows(safeArray(data));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Không tải được danh sách hóa đơn");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ padding: 16, background: "#f6f8fc", minHeight: "100vh" }}>
      {/* topbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid rgba(229,231,235,0.85)",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 14px 30px rgba(15,23,42,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={TTQLogo}
            alt="TTQ"
            style={{
              width: 44,
              height: 44,
              objectFit: "contain",
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #eef2f7",
            }}
          />
          <div>
            <div style={{ fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>TTQ Invoices</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Danh sách hoá đơn</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={load}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            Làm mới
          </button>
          <button
            onClick={() => navigate("/invoices/create")}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            + Tạo hoá đơn
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              border: "1px solid #e5e7eb",
              background: "#fff",
            }}
          >
            Về trang chính
          </button>
        </div>
      </div>

      {/* card */}
      <div
        style={{
          marginTop: 14,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          boxShadow: "0 18px 35px rgba(15,23,42,0.06)",
          overflow: "hidden",
          maxWidth: 1100,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #eef2f7", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Danh sách hoá đơn</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {loading ? "Đang tải..." : `Tổng: ${totalCount} hoá đơn`}
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              height: "fit-content",
            }}
          >
            {totalCount} HD
          </div>
        </div>

        <div style={{ padding: "0 18px 16px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#111827" }}>
                <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eef2f7" }}>Số HD</th>
                <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eef2f7" }}>Khách hàng</th>
                <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eef2f7" }}>SĐT</th>
                <th style={{ textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #eef2f7" }}>Ngày tạo</th>
                <th style={{ textAlign: "right", padding: "10px 8px", borderBottom: "1px solid #eef2f7" }}>Tổng</th>
                <th style={{ textAlign: "right", padding: "10px 8px", borderBottom: "1px solid #eef2f7" }}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, textAlign: "center", color: "#6b7280" }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 14, textAlign: "center", color: "#6b7280" }}>
                    Chưa có hoá đơn nào. Bấm “+ Tạo hoá đơn” để bắt đầu.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id || r.id || r.invoiceNo}>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>
                      {r.invoiceNo || r.code || "—"}
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ fontWeight: 900 }}>{r.customerName || r.customer?.name || "—"}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{r.customerAddress || r.customer?.address || ""}</div>
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>
                      {r.customerPhone || r.customer?.phone || "—"}
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"}
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", fontWeight: 900 }}>
                      {money(r.totalPay ?? r.total ?? 0)} đ
                    </td>
                    <td style={{ padding: "12px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                      <button
                        onClick={() => navigate(`/invoices/${r._id || r.id || r.invoiceNo}`)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontWeight: 900,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                        }}
                      >
                        Xem / In
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
