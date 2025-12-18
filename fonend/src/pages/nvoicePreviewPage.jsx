import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TTQLogo from "../../assets/ttq-logo.png"; // ✅ đúng đường dẫn trong /pages/invoices

import { getInvoiceById } from "../api/invoiceApi";

const formatMoney = (n) => Number(n || 0).toLocaleString("vi-VN");

export default function InvoicePreviewPage() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams();

  const [invoice, setInvoice] = useState(location.state?.invoice || null);
  const [loading, setLoading] = useState(false);

  const invoiceId = params.id; // route /invoices/:id/preview

  useEffect(() => {
    // Nếu không có state.invoice => fetch theo id
    const fetchById = async () => {
      if (!invoiceId || invoice) return;
      try {
        setLoading(true);
        const data = await getInvoiceById(invoiceId);
        setInvoice(data);
      } catch (e) {
        alert(e?.response?.data?.message || "Không tải được hóa đơn");
      } finally {
        setLoading(false);
      }
    };
    fetchById();
    // eslint-disable-next-line
  }, [invoiceId]);

  const totals = useMemo(() => {
    const items = invoice?.items || [];
    const subtotal = items.reduce((s, it) => s + Number(it.lineTotal || 0), 0);
    return { subtotal };
  }, [invoice]);

  const onPrint = () => window.print();

  if (loading) return <div className="ttq-page">Đang tải hóa đơn...</div>;
  if (!invoice) {
    return (
      <div className="ttq-page">
        <div className="ttq-empty">Không có dữ liệu hóa đơn.</div>
        <button className="ttq-btn-outline" onClick={() => nav("/invoices")}>
          Về danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="ttq-page">
      {/* ✅ toolbar ẩn khi in */}
      <div className="ttq-inv-toolbar no-print">
        <div>
          <div className="ttq-h1">Xem trước hóa đơn</div>
          <div className="ttq-hint">Bấm “In / Xuất PDF” để in A4 hoặc lưu PDF.</div>
        </div>
        <div className="ttq-inv-toolbar-actions">
          <button className="ttq-btn-outline" onClick={() => nav("/invoices")}>
            Về danh sách
          </button>
          <button className="ttq-btn-primary" onClick={onPrint}>
            In / Xuất PDF
          </button>
        </div>
      </div>

      {/* ✅ A4 */}
      <div className="ttq-a4">
        {/* Header công ty + logo */}
        <div className="ttq-a4-head">
          <div className="ttq-a4-brand">
            <img className="ttq-a4-logo" src={TTQLogo} alt="TTQ" />
            <div>
              <div className="ttq-a4-company">TTQ Materials</div>
              <div className="ttq-a4-sub">
                Quản lý vật liệu xây dựng • Hotline: 0900 000 000
              </div>
              <div className="ttq-a4-sub">Địa chỉ: (bạn điền sau)</div>
            </div>
          </div>

          <div className="ttq-a4-meta">
            <div className="ttq-a4-title">HÓA ĐƠN BÁN HÀNG</div>
            <div className="ttq-a4-meta-row">
              <span>Số:</span>
              <b className="ttq-mono">{invoice.invoiceNo}</b>
            </div>
            <div className="ttq-a4-meta-row">
              <span>Ngày:</span>
              <b>{invoice.createdAt}</b>
            </div>
          </div>
        </div>

        <hr className="ttq-a4-hr" />

        {/* Thông tin KH */}
        <div className="ttq-a4-info">
          <div>
            <div className="ttq-a4-info-row">
              <b>Khách hàng:</b> {invoice.customerName || "—"}
            </div>
            <div className="ttq-a4-info-row">
              <b>Địa chỉ:</b> {invoice.customerAddress || "—"}
            </div>
            <div className="ttq-a4-info-row">
              <b>SĐT:</b> {invoice.customerPhone || "—"}
            </div>
          </div>
          <div>
            <div className="ttq-a4-info-row">
              <b>Nhân viên tạo:</b> {invoice.staffName || "—"}
            </div>
            <div className="ttq-a4-info-row">
              <b>Ghi chú:</b> {invoice.note || "—"}
            </div>
          </div>
        </div>

        {/* Bảng hàng */}
        <table className="ttq-a4-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Hàng hóa</th>
              <th style={{ width: 70 }}>ĐVT</th>
              <th style={{ width: 70 }}>SL</th>
              <th style={{ width: 110 }}>Đơn giá</th>
              <th style={{ width: 120 }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 14 }}>
                  Chưa có dòng hàng.
                </td>
              </tr>
            ) : (
              invoice.items.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td>
                    <b>{it.itemName}</b>
                    <div className="ttq-a4-muted">{it.itemCode}</div>
                  </td>
                  <td style={{ textAlign: "center" }}>{it.unit || "—"}</td>
                  <td style={{ textAlign: "right" }}>{it.qty}</td>
                  <td style={{ textAlign: "right" }}>{formatMoney(it.price)}</td>
                  <td style={{ textAlign: "right" }}>{formatMoney(it.lineTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Tổng */}
        <div className="ttq-a4-total">
          <div className="ttq-a4-total-box">
            <div>Tổng cộng</div>
            <div className="ttq-a4-total-money">{formatMoney(totals.subtotal)} đ</div>
          </div>
        </div>

        {/* Chữ ký */}
        <div className="ttq-a4-sign">
          <div>
            <b>Khách hàng</b>
            <div className="ttq-a4-muted">(Ký, ghi rõ họ tên)</div>
          </div>
          <div>
            <b>Nhân viên</b>
            <div className="ttq-a4-muted">(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
