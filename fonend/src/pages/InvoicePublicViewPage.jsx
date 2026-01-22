import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";

export default function InvoicePublicViewPage() {
  // App.js: /invoices/view/:invoiceNo
  const { invoiceNo } = useParams();

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async (signal) => {
    const raw = (invoiceNo || "").trim();
    if (!raw) {
      setErr("Thiếu mã hoá đơn trong URL");
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setErr("");
      setLoading(true);

      // ✅ CHỈ encode 1 lần ngay khi gọi URL
      const url = `/invoices/by-no/${encodeURIComponent(raw)}`;

      const res = await axiosClient.get(url, { signal });

      // ✅ hỗ trợ cả 2 kiểu axiosClient:
      // 1) axiosClient trả thẳng data
      // 2) axiosClient trả {data: ...}
      const payload = res?.data ?? res;

      setData(payload);
    } catch (e) {
      // Abort => im lặng
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;

      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Không tải được hóa đơn";
      setErr(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchInvoice(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceNo]);

  // ------- helpers -------
  const invoiceCode = data?.invoiceNo || data?.maHD || invoiceNo || "-";
  const customerName =
    data?.customer?.name ||
    data?.khachHang?.ten ||
    data?.customerName ||
    "-";

  const createdAtRaw = data?.createdAt || data?.ngayLap || data?.date;
  const createdAt = (() => {
    if (!createdAtRaw) return "-";
    const d = new Date(createdAtRaw);
    return isNaN(d.getTime()) ? String(createdAtRaw) : d.toLocaleString();
  })();

  const items = data?.items || data?.chiTiet || data?.details || [];
  const total =
    data?.total || data?.tongTien || data?.totalAmount || 0;

  const formatMoney = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString("vi-VN") + " ₫";
  };

  // ------- UI -------
  if (loading) return <div style={{ padding: 16 }}>⏳ Đang tải hóa đơn...</div>;

  if (err)
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "#c00", fontWeight: 600 }}>❌ {err}</div>
        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
          Mã trên QR: <b>{invoiceNo}</b>
        </div>

        <button
          onClick={() => fetchInvoice()}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Tải lại
        </button>
      </div>
    );

  if (!data)
    return <div style={{ padding: 16 }}>Không có dữ liệu hóa đơn</div>;

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>Hóa đơn: {invoiceCode}</h2>

      <div style={{ marginBottom: 16, lineHeight: 1.7 }}>
        <div>
          <b>Khách hàng:</b> {customerName}
        </div>
        <div>
          <b>Ngày:</b> {createdAt}
        </div>
      </div>

      <h3>Chi tiết</h3>

      {Array.isArray(items) && items.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it, idx) => {
            const name = it?.name || it?.ten || it?.materialName || "-";
            const qty = it?.quantity ?? it?.soLuong ?? 0;
            const price = it?.price ?? it?.donGia ?? 0;

            // ưu tiên field DB nếu có, không thì tính
            const lineTotal =
              it?.lineTotal ?? it?.thanhTien ?? Number(qty) * Number(price);

            return (
              <div
                key={idx}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 700 }}>{name}</div>
                <div style={{ opacity: 0.85, marginTop: 6 }}>
                  SL: <b>{qty}</b> — Giá: <b>{formatMoney(price)}</b> — Thành tiền:{" "}
                  <b>{formatMoney(lineTotal)}</b>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ opacity: 0.8 }}>Không có dòng chi tiết</div>
      )}

      <hr style={{ margin: "16px 0" }} />
      <h3>Tổng tiền: {formatMoney(total)}</h3>

      {/* Nếu cần debug dữ liệu trả về:
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
      */}
    </div>
  );
}
