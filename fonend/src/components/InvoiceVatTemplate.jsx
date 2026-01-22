import React, { useEffect, useMemo, useState } from "react";
import TTQLogo from "../assets/ttq-logo.png";
import QRCode from "qrcode";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

// ✅ QR OFFLINE: tạo ra ảnh base64 nên Print/Save PDF không bị mất
function QRBox({ value, size = 160 }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;

    async function gen() {
      try {
        if (!value) {
          if (alive) setSrc("");
          return;
        }
        const dataUrl = await QRCode.toDataURL(value, {
          errorCorrectionLevel: "H", // dày, dễ quét
          margin: 0,
          width: size,
        });
        if (alive) setSrc(dataUrl);
      } catch (e) {
        console.error("QR generate error:", e);
        if (alive) setSrc("");
      }
    }

    gen();
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!value) return null;

  return (
    <img
      src={src}
      alt="QR"
      width={size}
      height={size}
      style={{
        display: "block",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
      }}
    />
  );
}

export default function InvoiceVatTemplate({
  invoiceNo = "—",
  createdAt,
  customerName = "—",
  customerPhone = "—",
  customerAddress = "—",
  note = "—",
  staffName = "—",
  items = [],
  totalBefore = 0,
  discountAmount = 0,
  totalPay = 0,
  idForQr = "", // ✅ truyền invoiceNo vào đây cũng được
}) {
  const createdText = createdAt
    ? new Date(createdAt).toLocaleString("vi-VN")
    : new Date().toLocaleString("vi-VN");

  /**
   * ✅ QR LUÔN LÀ URL để mở lại hoá đơn
   * route public: /invoices/view/:invoiceNo
   */
  const qrUrl = useMemo(() => {
    const base =
      (typeof process !== "undefined" &&
        process.env &&
        process.env.REACT_APP_PUBLIC_BASE_URL) ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const no = String(idForQr || invoiceNo || "").trim();
    if (!base || !no || no === "—") return "";

    return `${base}/invoices/view/${encodeURIComponent(no)}`;
  }, [invoiceNo, idForQr]);

  return (
    <div className="vat-a4 vat-watermark">
      <div className="vat-wm">TTQ</div>

      <div className="vat-top">
        <div className="vat-left">
          <img src={TTQLogo} alt="TTQ" className="vat-logo" />
          <div className="vat-seller">
            <div className="vat-seller-name">CỬA HÀNG VLXD TTQ</div>
            <div className="vat-line">Địa chỉ: ấp Phú An, xã Phú Hựu, Đồng Tháp</div>
            <div className="vat-line">MST: 3987452036</div>
            <div className="vat-line">Điện thoại: 0382900423</div>
          </div>
        </div>

        <div className="vat-right">
          <div className="vat-title">HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)</div>

          <div className="vat-meta">
            <div>
              Số HĐ: <b>{invoiceNo}</b>
            </div>
            <div>
              Ngày: <b>{createdText}</b>
            </div>
          </div>

          <div className="vat-qr">
            {qrUrl ? (
              <>
                {/* ✅ size lớn hơn để quét dễ */}
                <QRBox value={qrUrl} size={150} />

                {/* ✅ Nếu muốn test xem QR đang chứa URL gì, mở comment dòng dưới */}
                {/* <div style={{ fontSize: 10, color: "#6b7280" }}>{qrUrl}</div> */}
              </>
            ) : (
              <div className="vat-qr-cap" style={{ color: "#b91c1c" }}>
                (Chưa có QR: thiếu invoiceNo)
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="vat-buyer">
        <div className="vat-row">
          <div>
            Người mua hàng: <b>{customerName || "—"}</b>
          </div>
          <div>
            SĐT: <b>{customerPhone || "—"}</b>
          </div>
        </div>

        <div className="vat-row">
          <div>Địa chỉ: {customerAddress || "—"}</div>
          <div>Ghi chú: {note || "—"}</div>
        </div>

        <div className="vat-row">
          <div>Hình thức thanh toán: Tiền mặt / Chuyển khoản</div>
          <div>
          </div>
        </div>
      </div>

      <table className="vat-table">
        <colgroup>
          <col style={{ width: "6%" }} />
          <col style={{ width: "44%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "15%" }} />
        </colgroup>

        <thead>
          <tr>
            <th>STT</th>
            <th>Tên hàng hóa, dịch vụ</th>
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
                Chưa có dòng hàng nào.
              </td>
            </tr>
          ) : (
            items.map((it, idx) => {
              const name = it?.tenVatLieu ?? it?.itemName ?? it?.name ?? "—";
              const code = it?.maVatLieu ?? it?.itemCode ?? it?.code ?? "";
              const unit = it?.donViTinh ?? it?.unit ?? it?.dvt ?? "-";
              const qty = Number(it?.soLuong ?? it?.qty ?? 0);
              const price = Number(it?.donGia ?? it?.price ?? 0);
              const lineTotal = Number(it?.thanhTien ?? it?.lineTotal ?? qty * price);

              return (
                <tr key={it?.id || it?._id || idx}>
                  <td>{idx + 1}</td>
                  <td className="vat-name">
                    <div className="vat-name-main">
                      <b>{name}</b>
                    </div>
                    {code ? <div className="vat-name-sub">Mã: {code}</div> : null}
                  </td>
                  <td>{unit}</td>
                  <td>{qty}</td>
                  <td>{money(price)}</td>
                  <td>{money(lineTotal)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="vat-total">
        <div className="vat-total-box">
          <div className="vat-total-row">
            <span>Tổng tiền hàng</span>
            <b>{money(totalBefore)} đ</b>
          </div>
          <div className="vat-total-row vat-muted">
            <span>Giảm giá</span>
            <b>-{money(discountAmount)} đ</b>
          </div>
          <div className="vat-total-row">
            <span>Thuế GTGT (VAT)</span>
            <b>0 đ</b>
          </div>

          <div className="vat-total-row vat-final">
            <span>Tổng thanh toán</span>
            <b>{money(totalPay)} đ</b>
          </div>
        </div>
      </div>

      <div className="vat-signs">
        <div className="vat-sign">
          <b>Người mua hàng</b>
          <div className="vat-sign-sub">(Ký, ghi rõ họ tên)</div>
          <div className="vat-sign-line" />
        </div>

        <div className="vat-sign">
          <b>Người bán hàng</b>
          <div className="vat-sign-sub">(Ký, đóng dấu)</div>
          <div className="vat-sign-line" />
        </div>
      </div>

      <style>{`
        .vat-a4{
          position: relative;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          min-height: 740px;
          overflow:hidden;
        }
        .vat-watermark .vat-wm{
          position:absolute;
          inset:0;
          display:flex;
          justify-content:center;
          align-items:center;
          font-size: 120px;
          font-weight: 900;
          color: rgba(15, 23, 42, 0.06);
          letter-spacing: 10px;
          transform: rotate(-18deg);
          pointer-events:none;
          user-select:none;
          z-index:0;
        }
        .vat-a4 > *{ position: relative; z-index: 1; }

        .vat-top{
          display:flex;
          justify-content:space-between;
          gap: 14px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 12px;
        }
        .vat-left{ display:flex; gap:10px; align-items:flex-start; }
        .vat-logo{ width:54px; height:54px; object-fit:contain; }
        .vat-seller-name{ font-weight:900; text-transform:uppercase; }
        .vat-line{ font-size:12px; color:#374151; margin-top:3px; }

        .vat-right{ text-align:right; min-width: 240px; }
        .vat-title{ font-size:16px; font-weight:900; letter-spacing:0.3px; }
        .vat-sub{ font-size:12px; color:#6b7280; margin-top:2px; }
        .vat-meta{ font-size:12px; margin-top:8px; display:grid; gap:4px; }

        .vat-qr{
          margin-top: 10px;
          display:flex;
          flex-direction:column;
          align-items:flex-end;
          gap:4px;
        }
        .vat-qr-cap{ font-size:11px; color:#6b7280; }

        .vat-buyer{
          padding: 10px 0 12px;
          border-bottom: 1px dashed #e5e7eb;
          display:grid;
          gap: 6px;
          font-size: 13px;
        }
        .vat-row{
          display:flex;
          justify-content:space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .vat-table{
          width:100%;
          border-collapse:collapse;
          font-size:13px;
          table-layout: fixed;
          margin-top: 10px;
        }
        .vat-table th,
        .vat-table td{
          border-top:1px solid #e5e7eb;
          padding:10px 8px;
          vertical-align: middle;
          text-align: center;
        }
        .vat-table thead th{
          border-top:none;
          background:#f8fafc;
          font-weight:900;
          white-space: nowrap;
        }
        .vat-table tbody td:nth-child(2){ text-align:left; }
        .vat-table tbody td:nth-child(4),
        .vat-table tbody td:nth-child(5),
        .vat-table tbody td:nth-child(6){ text-align:right; }

        .vat-name{ overflow:hidden; }
        .vat-name-main{
          overflow:hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .vat-name-sub{
          font-size:12px;
          color:#6b7280;
          overflow:hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 2px;
        }

        .vat-total{ display:flex; justify-content:flex-end; padding-top:12px; }
        .vat-total-box{
          width: 360px;
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:10px 12px;
          background:#f8fafc;
          display:grid;
          gap:6px;
        }
        .vat-total-row{ display:flex; justify-content:space-between; }
        .vat-muted{ color:#6b7280; }
        .vat-final{
          border-top:1px solid #e5e7eb;
          padding-top:8px;
          margin-top:4px;
        }

        .vat-signs{
          display:flex;
          justify-content:space-between;
          gap: 18px;
          padding-top: 18px;
        }
        .vat-sign{
          width: 46%;
          text-align:center;
        }
        .vat-sign-sub{
          font-size:12px;
          color:#6b7280;
          margin-top:4px;
        }
        .vat-sign-line{
          margin: 54px auto 0;
          width: 80%;
          border-top: 1px solid #cbd5e1;
        }
      `}</style>
    </div>
  );
}
