// src/pages/InvoicePreviewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { getInvoiceById } from "../api/invoiceApi";
import QRCode from "qrcode";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

function safeInvoice(data) {
  // axiosClient của bạn trả res.data luôn, nên data thường là object invoice
  return data?.data ? data.data : data;
}

export default function InvoicePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  // load invoice detail
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await getInvoiceById(id);
        const doc = safeInvoice(data);
        setInv(doc || null);
      } catch (e) {
        console.error(e);
        setInv(null);
        setErr(e?.response?.data?.message || "Không tải được chi tiết hoá đơn");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const items = useMemo(() => (Array.isArray(inv?.items) ? inv.items : []), [inv]);

  const invoiceNo = inv?.invoiceNo || inv?.code || "—";
  const createdAt = inv?.createdAt ? new Date(inv.createdAt).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN");

  const customerName = inv?.customerName || "—";
  const customerPhone = inv?.customerPhone || "—";
  const customerAddress = inv?.customerAddress || "—";
  const note = inv?.note || "—";

  const staffName = inv?.staffName || inv?.employeeName || "—";


  const discountAmount = useMemo(() => Number(inv?.discountAmount ?? inv?.discount ?? 0) || 0, [inv]);
  const totalPay = useMemo(() => {
    const direct = inv?.totalAfterDiscount ?? inv?.totalPay ?? inv?.thanhToan ?? 0;
    const d = Number(direct || 0);
    if (Number.isFinite(d) && d > 0) return d;
    return Math.max(0, Number(totalBefore || 0) - Number(discountAmount || 0));
  }, [inv, totalBefore, discountAmount]);

  // build QR (text chứa info invoice để quét)
  useEffect(() => {
    (async () => {
      try {
        if (!inv) return setQrDataUrl("");
        const payload = [
          `TTQ-INVOICE`,
          `NO:${invoiceNo}`,
          `DATE:${inv?.createdAt || ""}`,
          `CUS:${customerPhone}`,
          `PAY:${totalPay}`,
          `ID:${inv?._id || id}`,
        ].join("|");

        const url = await QRCode.toDataURL(payload, {
          margin: 1,
          width: 160,
          errorCorrectionLevel: "M",
        });
        setQrDataUrl(url);
      } catch (e) {
        console.warn("QR generate failed:", e);
        setQrDataUrl("");
      }
    })();
  }, [inv, invoiceNo, customerPhone, totalPay, id]);

  const onPrint = () => window.print();

  if (loading) {
    return (
      <div style={{ padding: 16, background: "#f6f8fc", minHeight: "100vh" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
          Đang tải hoá đơn...
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ padding: 16, background: "#f6f8fc", minHeight: "100vh" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
          <div style={{ fontWeight: 900, color: "#b91c1c" }}>❌ {err}</div>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => navigate("/invoices")}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 900,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              ← Về danh sách
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      {/* TOPBAR */}
      <div className="ttq-topbar no-print">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Invoices</div>
            <div className="ttq-topbar-sub">Chi tiết hoá đơn · {invoiceNo}</div>
          </div>
        </div>

        <div className="ttq-topbar-right">
          <button className="ttq-btn-outline" type="button" onClick={() => navigate("/invoices")}>
            ← Về danh sách
          </button>

          <button className="ttq-btn-primary" type="button" onClick={onPrint}>
            In lại / Xuất PDF
          </button>
        </div>
      </div>

      {/* PREVIEW CARD */}
      <div className="ttq-card" style={{ marginTop: 12, maxWidth: 1100, marginLeft: "auto", marginRight: "auto" }}>
        <div className="ttq-card-head no-print">
          <div>
            <div className="ttq-card-title">Xem hoá đơn</div>
            <div className="ttq-card-sub">Bấm “In lại / Xuất PDF” để in đúng A4.</div>
          </div>
          <span className="ttq-badge">Thanh toán: {money(totalPay)} đ</span>
        </div>

        <div id="print-area" ref={printRef} className="ttq-invoice-a4 vat">
          {/* WATERMARK */}
          <div className="watermark">TTQ INVOICE</div>

          {/* HEADER */}
          <div className="vat-header">
            <div className="vat-brand">
              <img src={TTQLogo} alt="TTQ" className="vat-logo" />
              <div>
                <div className="vat-company">CÔNG TY VẬT LIỆU XÂY DỰNG TTQ</div>
                <div className="vat-sub">ĐC: …………………………………………</div>
                <div className="vat-sub">ĐT: ……………………………… · MST: ………………………</div>
              </div>
            </div>

            <div className="vat-title">
              <div className="vat-h1">HOÁ ĐƠN GIÁ TRỊ GIA TĂNG</div>
              <div className="vat-h2">(VAT INVOICE)</div>
              <div className="vat-meta">
                <div>
                  Số: <b>{invoiceNo}</b>
                </div>
                <div>
                  Ngày: <b>{createdAt}</b>
                </div>
              </div>
            </div>

            <div className="vat-qr">
              {qrDataUrl ? <img src={qrDataUrl} alt="QR" className="qr-img" /> : <div className="qr-box">QR</div>}
              <div className="qr-note">Quét để lưu</div>
            </div>
          </div>

          {/* INFO */}
          <div className="vat-info">
            <div className="vat-info-left">
              <div className="row">
                <span>Khách hàng:</span> <b>{customerName}</b>
              </div>
              <div className="row">
                <span>SĐT:</span> <b>{customerPhone}</b>
              </div>
              <div className="row">
                <span>Địa chỉ:</span> <b>{customerAddress}</b>
              </div>
              <div className="row">
                <span>Ghi chú:</span> <b>{note}</b>
              </div>
            </div>

            <div className="vat-info-right">
              <div className="row">
                <span>Nhân viên:</span> <b>{staffName}</b>
              </div>
              <div className="row">
                <span>Mã hoá đơn (ID):</span> <b>{inv?._id || id}</b>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <table className="inv-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Hàng hoá / Dịch vụ</th>
                <th>ĐVT</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 12, textAlign: "center", color: "#6b7280" }}>
                    Không có dòng hàng.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const name = it?.itemName || it?.tenVatLieu || it?.name || "—";
                  const code = it?.itemCode || it?.maVatLieu || it?.code || "";
                  const unit = it?.unit || it?.donViTinh || "—";
                  const qty = Number(it?.qty ?? it?.soLuong ?? 0) || 0;
                  const price = Number(it?.price ?? it?.donGia ?? 0) || 0;
                  const lineTotal = Number(it?.lineTotal ?? it?.thanhTien ?? (qty * price) ?? 0) || 0;

                  return (
                    <tr key={it?._id || `${idx}-${code}-${name}`}>
                      <td>{idx + 1}</td>
                      <td className="col-name">
                        <div className="name-main">{name}</div>
                        {code ? <div className="name-sub">({code})</div> : null}
                      </td>
                      <td>{unit}</td>
                      <td className="num">{qty}</td>
                      <td className="num">{money(price)}</td>
                      <td className="num">{money(lineTotal)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* TOTALS */}
          <div className="vat-total">
            <div className="vat-total-box">
              <div className="trow">
                <span>Tổng trước giảm</span>
                <b>{money(totalBefore)} đ</b>
              </div>
              <div className="trow muted">
                <span>Giảm giá</span>
                <b>-{money(discountAmount)} đ</b>
              </div>
              <div className="trow strong">
                <span>Thanh toán</span>
                <b>{money(totalPay)} đ</b>
              </div>
            </div>
          </div>

          {/* SIGNATURE */}
          <div className="vat-sign">
            <div className="sign-col">
              <b>Người mua hàng</b>
              <div className="sign-sub">(Ký, ghi rõ họ tên)</div>
              <div className="sign-line" />
              <div className="sign-name">{customerName}</div>
            </div>

            <div className="sign-col">
              <b>Người bán hàng</b>
              <div className="sign-sub">(Ký, ghi rõ họ tên)</div>
              <div className="sign-line" />
              <div className="sign-name">{staffName}</div>
            </div>
          </div>

          {/* FOOTER NOTE */}
          <div className="vat-footer">
            <div>Lưu ý: Hoá đơn này được tạo từ hệ thống TTQ Invoices.</div>
            <div>Vui lòng kiểm tra thông tin trước khi thanh toán.</div>
          </div>
        </div>
      </div>

      <style>{`
        :root{
          --bg:#f6f8fc;
          --card:#ffffff;
          --line:#e5e7eb;
          --text:#0f172a;
          --blue:#2563eb;
        }
        .ttq-page{ background:var(--bg); min-height:100vh; }
        .ttq-topbar{
          position: sticky; top: 0; z-index: 20;
          display:flex; justify-content:space-between; align-items:center; gap: 12px;
          padding: 12px 14px; border-radius: 14px;
          border: 1px solid rgba(229,231,235,0.85);
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(12px);
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
          max-width: 1100px;
          margin: 0 auto;
        }
        .ttq-topbar-left{ display:flex; align-items:center; gap: 10px; min-width: 220px; }
        .ttq-topbar-logo{
          width: 44px; height: 44px; object-fit: contain;
          border-radius: 12px; background: #fff;
          border: 1px solid #eef2f7;
        }
        .ttq-topbar-name{ font-weight: 900; color: var(--text); line-height: 1.1; }
        .ttq-topbar-sub{ font-size: 12px; color: #6b7280; margin-top: 2px; }
        .ttq-topbar-right{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
        .ttq-btn-outline{
          padding:10px 14px; border-radius:12px; cursor:pointer; font-weight:900;
          border:1px solid var(--line); background:#fff; color: var(--text);
        }
        .ttq-btn-primary{
          padding:10px 14px; border-radius:12px; cursor:pointer; font-weight:900;
          border:none; background: var(--blue); color:#fff;
          box-shadow: 0 10px 20px rgba(37,99,235,0.20);
        }

        .ttq-card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow: 0 18px 35px rgba(15,23,42,0.06); overflow:hidden; }
        .ttq-card-head{ padding: 12px 14px; border-bottom: 1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .ttq-card-title{ font-weight: 900; }
        .ttq-card-sub{ font-size: 12px; color:#6b7280; margin-top: 2px; }
        .ttq-badge{ font-size:12px; font-weight:900; padding:6px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f8fafc; }

        .ttq-invoice-a4{
          position: relative;
          background:#fff; border:1px solid #e5e7eb; border-radius:14px;
          padding:18px; min-height: 520px;
        }

        /* WATERMARK */
        .watermark{
          position:absolute;
          inset:0;
          display:flex;
          justify-content:center;
          align-items:center;
          font-size:64px;
          font-weight:900;
          color: rgba(15,23,42,0.06);
          transform: rotate(-20deg);
          pointer-events:none;
          user-select:none;
          letter-spacing: 6px;
        }

        /* VAT HEADER */
        .vat-header{
          display:grid;
          grid-template-columns: 1fr 1.1fr 170px;
          gap: 12px;
          align-items:start;
          border-bottom:1px solid #e5e7eb;
          padding-bottom:12px;
          position: relative;
          z-index: 1;
        }
        .vat-brand{display:flex; gap:10px; align-items:flex-start;}
        .vat-logo{width:52px; height:52px; object-fit:contain;}
        .vat-company{font-weight:900; font-size:14px;}
        .vat-sub{font-size:12px; color:#334155; margin-top:2px;}

        .vat-title{ text-align:center; }
        .vat-h1{font-size:18px; font-weight:900; letter-spacing:0.5px;}
        .vat-h2{font-size:12px; color:#475569; margin-top:2px;}
        .vat-meta{font-size:12px; color:#111827; margin-top:8px; display:grid; gap:4px;}

        .vat-qr{ display:flex; flex-direction:column; align-items:center; gap:6px; }
        .qr-img{ width:160px; height:160px; object-fit:contain; border:1px solid #e5e7eb; border-radius:12px; background:#fff; }
        .qr-box{ width:160px; height:160px; border:1px dashed #cbd5e1; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#64748b; font-weight:900; }
        .qr-note{ font-size:12px; color:#64748b; }

        /* INFO */
        .vat-info{
          display:flex;
          justify-content:space-between;
          gap: 16px;
          padding: 12px 0;
          position: relative;
          z-index: 1;
        }
        .vat-info .row{ margin: 4px 0; color:#0f172a; }
        .vat-info-left{ flex: 1.2; }
        .vat-info-right{ flex: 0.8; text-align:right; }
        .vat-info span{ color:#334155; }

        /* TABLE (CHIA ĐỀU + KHÔNG LỆCH) */
        .inv-table{
          width:100%;
          border-collapse:collapse;
          font-size:13px;
          table-layout: fixed; /* ✅ bắt buộc */
          position: relative;
          z-index: 1;
        }
        .inv-table th,
        .inv-table td{
          border-top:1px solid #e5e7eb;
          padding:8px;
          vertical-align: middle;
          word-wrap: break-word;
        }
        .inv-table thead th{
          border-top:none;
          background:#f8fafc;
          font-weight:900;
          text-align:center;
        }

        /* ✅ chia cột đều theo % */
        .inv-table th:nth-child(1),
        .inv-table td:nth-child(1){
          width:6%;
          text-align:center;
        }
        .inv-table th:nth-child(2),
        .inv-table td:nth-child(2){
          width:34%;
          text-align:left;
        }
        .inv-table th:nth-child(3),
        .inv-table td:nth-child(3){
          width:10%;
          text-align:center;
        }
        .inv-table th:nth-child(4),
        .inv-table td:nth-child(4){
          width:10%;
          text-align:right;
        }
        .inv-table th:nth-child(5),
        .inv-table td:nth-child(5){
          width:20%;
          text-align:right;
        }
        .inv-table th:nth-child(6),
        .inv-table td:nth-child(6){
          width:20%;
          text-align:right;
        }

        .col-name .name-main{ font-weight:900; }
        .col-name .name-sub{ font-size:12px; color:#64748b; margin-top:2px; }
        .num{ text-align:right; }

        /* TOTALS */
        .vat-total{ display:flex; justify-content:flex-end; padding-top:10px; position: relative; z-index: 1; }
        .vat-total-box{
          width: 340px;
          border:1px solid #e5e7eb; border-radius:12px;
          padding:10px 12px; background:#f8fafc;
          display:grid; gap:6px;
        }
        .trow{ display:flex; justify-content:space-between; }
        .muted{ color:#64748b; }
        .strong{ border-top:1px solid #e5e7eb; padding-top:8px; margin-top:2px; font-weight:900; color:#0f172a; }

        /* SIGN */
        .vat-sign{
          display:flex; justify-content:space-between;
          padding-top:26px;
          position: relative; z-index: 1;
        }
        .sign-col{ width: 45%; text-align:center; }
        .sign-sub{ font-size:12px; color:#64748b; margin-top:4px; }
        .sign-line{ height: 54px; border-bottom: 1px dashed #cbd5e1; margin: 10px 0 6px; }
        .sign-name{ font-weight:900; color:#0f172a; }

        .vat-footer{
          margin-top: 14px;
          font-size: 12px;
          color:#64748b;
          text-align:center;
          position: relative; z-index: 1;
        }

        @media (max-width: 1000px){
          .vat-header{ grid-template-columns: 1fr; }
          .vat-title{ text-align:left; }
          .vat-qr{ align-items:flex-start; }
          .vat-info{ flex-direction:column; }
          .vat-info-right{ text-align:left; }
          .ttq-topbar{ flex-direction: column; align-items: flex-start; }
          .ttq-topbar-right{ justify-content:flex-start; }
        }

        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden !important; }
          .no-print { display:none !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area{
            position: absolute; left: 0; top: 0;
            width: 210mm;
            border: none !important;
            border-radius: 0 !important;
          }
          .ttq-invoice-a4{ border: none !important; }
          .watermark{ color: rgba(15,23,42,0.05); }
        }
      `}</style>
    </div>
  );
}
