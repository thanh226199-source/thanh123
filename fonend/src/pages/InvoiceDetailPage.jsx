import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { getInvoiceById } from "../api/invoiceApi";
import QRCode from "qrcode";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

// ===== helpers =====
const pickInvoiceNo = (inv) => inv?.invoiceNo ?? inv?.code ?? inv?.soHoaDon ?? "—";
const pickCustomerName = (inv) => inv?.customerName ?? inv?.customer?.name ?? "—";
const pickCustomerPhone = (inv) => inv?.customerPhone ?? inv?.customer?.phone ?? "—";
const pickCustomerAddress = (inv) => inv?.customerAddress ?? inv?.customer?.address ?? "—";
const pickNote = (inv) => inv?.note ?? inv?.ghiChu ?? "";
const pickCreatedAt = (inv) => inv?.createdAt ?? null;
const pickStaffName = (inv) => inv?.staffName ?? inv?.nhanVien ?? "—";

const safeItems = (inv) => (Array.isArray(inv?.items) ? inv.items : []);
const pickItemName = (it) => it?.itemName ?? it?.tenVatLieu ?? "—";
const pickItemUnit = (it) => it?.unit ?? it?.donViTinh ?? "-";
const pickItemQty = (it) => Number(it?.qty ?? it?.soLuong ?? 0);
const pickItemPrice = (it) => Number(it?.price ?? it?.donGia ?? 0);
const pickItemLineTotal = (it) => {
  const line = Number(it?.lineTotal ?? it?.thanhTien ?? 0);
  return line > 0 ? line : pickItemQty(it) * pickItemPrice(it);
};

// ================= QR OFFLINE =================
function QRBox({ value, size = 170 }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    async function gen() {
      try {
        if (!value) return setSrc("");
        const dataUrl = await QRCode.toDataURL(value, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: size,
        });
        if (alive) setSrc(dataUrl);
      } catch (e) {
        console.error("QR error:", e);
        if (alive) setSrc("");
      }
    }
    gen();
    return () => (alive = false);
  }, [value, size]);

  if (!src) return null;

  return <img src={src} alt="QR" className="qrImg" width={size} height={size} />;
}

export default function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState(null);

  const items = useMemo(() => safeItems(inv), [inv]);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + pickItemLineTotal(it), 0),
    [items]
  );

  const invoiceNo = useMemo(() => pickInvoiceNo(inv), [inv]);
  const createdAt = useMemo(() => pickCreatedAt(inv), [inv]);

  // ✅ QR = URL PUBLIC
  const qrUrl = useMemo(() => {
    const base = process.env.REACT_APP_PUBLIC_BASE_URL || window.location.origin;
    if (!invoiceNo || invoiceNo === "—") return "";
    return `${base}/invoices/view/${encodeURIComponent(invoiceNo)}`;
  }, [invoiceNo]);

  // ✅ tổng/giảm/thuế: lấy từ DB nếu có, fallback theo subtotal
  const discountAmount = useMemo(() => {
    const d = Number(inv?.discountAmount ?? inv?.giamGia ?? 0);
    return Math.max(0, d);
  }, [inv]);

  const vatAmount = useMemo(() => {
    const v = Number(inv?.vatAmount ?? inv?.vat ?? 0);
    return Math.max(0, v);
  }, [inv]);

  const totalPay = useMemo(() => {
    const t = Number(inv?.totalAfterDiscount ?? inv?.thanhToan ?? 0);
    if (t > 0) return t;
    return Math.max(0, subtotal - discountAmount + vatAmount);
  }, [inv, subtotal, discountAmount, vatAmount]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getInvoiceById(id);
      setInv(res?.data || res);
    } catch (e) {
      alert("Không tải được hóa đơn");
      setInv(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!inv) return <div style={{ padding: 20 }}>Không tìm thấy hóa đơn</div>;

  return (
    <div className="pageWrap">
      {/* ===== HEADER GIỐNG ẢNH + thay nút Sang nhập kho bằng Thanh toán + In PDF ===== */}
      <div className="topHeader no-print">
        <div className="topHeaderCard">
          <div className="topLeft">
            <div className="topLogoBox">
              <img src={TTQLogo} alt="TTQ" className="topLogo" />
            </div>
            <div>
              <div className="topTitle">TTQ Warehouse</div>
            </div>
          </div>

          <div className="topActions">
            <button className="topBtn" onClick={loadData} type="button">
              Làm mới
            </button>
            <button className="topBtn" onClick={() => window.print()} type="button">
              In / Lưu PDF
            </button>

            <button className="topBtn" onClick={() => navigate("/")} type="button">
              Về trang chính
            </button>
          </div>
        </div>
      </div>

      {/* A4 card */}
      <div id="print-area" className="a4Card">
        <div className="watermark">TTQ</div>

        {/* Header hóa đơn */}
        <div className="header">
          <div className="headerLeft">
            <img src={TTQLogo} alt="TTQ" className="logo" />
            <div className="companyBlock">
              <div className="companyName">CỬA HÀNG VLXD TTQ</div>
              <div className="muted">Địa chỉ: ấp Phú An, xã Phú Hữu, Đồng Tháp</div>
              <div className="muted">MST: 3987452036</div>
              <div className="muted">Điện thoại: 0382900423</div>
            </div>
          </div>

          <div className="headerRight">
            <div className="invoiceTitle">HÓA ĐƠN GIÁ TRỊ GIA TĂNG (VAT)</div>

            <div className="meta">
              <div>
                <span className="metaLabel">Số HD:</span> {invoiceNo}
              </div>
              <div>
                <span className="metaLabel">Ngày:</span>{" "}
                {createdAt ? new Date(createdAt).toLocaleString("vi-VN") : "—"}
              </div>
            </div>

            <div className="qrWrap">
              <QRBox value={qrUrl} size={175} />
              <div className="qrCaption">Quét để xem lại</div>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Buyer info */}
        <div className="infoGrid">
          <div>
            <div>
              Người mua hàng: <b>{pickCustomerName(inv)}</b>
            </div>
            <div>Địa chỉ: {pickCustomerAddress(inv)}</div>
            <div>Hình thức thanh toán: Tiền mặt / Chuyển khoản</div>
          </div>

          <div className="infoRight">
            <div>SDT: {pickCustomerPhone(inv)}</div>
            <div>Ghi chú: {pickNote(inv) || "—"}</div>
            <div>
              Nhân viên: <b>{pickStaffName(inv)}</b>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>STT</th>
                <th>Tên hàng hóa, dịch vụ</th>
                <th style={{ width: 80 }}>ĐVT</th>
                <th style={{ width: 80 }}>SL</th>
                <th style={{ width: 120 }}>Đơn giá</th>
                <th style={{ width: 140 }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="emptyRow">
                    Chưa có dòng hàng nào.
                  </td>
                </tr>
              ) : (
                items.map((it, i) => (
                  <tr key={i}>
                    <td className="center">{i + 1}</td>
                    <td>{pickItemName(it)}</td>
                    <td className="center">{pickItemUnit(it)}</td>
                    <td className="center">{pickItemQty(it)}</td>
                    <td className="right">{money(pickItemPrice(it))}</td>
                    <td className="right">{money(pickItemLineTotal(it))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary box */}
        <div className="bottomRow">
          <div />
          <div className="sumBox">
            <div className="sumLine">
              <span>Tổng tiền hàng</span>
              <b>{money(subtotal)} đ</b>
            </div>
            <div className="sumLine mutedLine">
              <span>Giảm giá</span>
              <b>-{money(discountAmount)} đ</b>
            </div>
            <div className="sumLine">
              <span>Thuế GTGT (VAT)</span>
              <b>{money(vatAmount)} đ</b>
            </div>
            <div className="sumLine sumTotal">
              <span>Tổng thanh toán</span>
              <b>{money(totalPay)} đ</b>
            </div>
          </div>
        </div>

        {/* Sign */}
        <div className="signRow">
          <div className="signCol">
            <div className="signTitle">Người mua hàng</div>
            <div className="signHint">(Ký, ghi rõ họ tên)</div>
            <div className="signLine" />
          </div>
          <div className="signCol">
            <div className="signTitle">Người bán hàng</div>
            <div className="signHint">(Ký, đóng dấu)</div>
            <div className="signLine" />
          </div>
        </div>
      </div>

      <style>{`
        :root{
          --border:#e5e7eb;
          --text:#111827;
          --muted:#6b7280;
          --bg:#f3f4f6;
        }
        .pageWrap{
          background:var(--bg);
          min-height:100vh;
          padding:0;
          color:var(--text);
          font-family: Arial, Helvetica, sans-serif;
        }

        /* ===== TOP HEADER (giống ảnh) ===== */
        .topHeader{
          padding: 12px 16px 0 16px;
          background: var(--bg);
        }
        .topHeaderCard{
          max-width: 1200px;
          margin: 0 auto;
          background:#fff;
          border:1px solid var(--border);
          border-radius:14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
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
          min-width: 260px;
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
          font-weight: 800;
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
          flex-wrap: wrap;
          justify-content:flex-end;
        }
        .topBtn{
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 12px;
          padding: 8px 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .topBtn:hover{ background:#f9fafb; }

        /* ===== A4 CARD ===== */
        .a4Card{
          width:210mm;
          min-height:297mm;
          background:#fff;
          margin: 12px auto 16px auto;
          border:1px solid var(--border);
          border-radius:14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          padding:18mm 16mm;
          position:relative;
          overflow:hidden;
        }

        .watermark{
          position:absolute;
          inset:0;
          display:flex;
          justify-content:center;
          align-items:center;
          font-size:140px;
          font-weight:800;
          color:rgba(0,0,0,0.05);
          transform:rotate(-20deg);
          pointer-events:none;
          user-select:none;
        }

        .header{
          display:flex;
          justify-content:space-between;
          gap:16px;
          margin-top: 10px;
        }
        .headerLeft{
          display:flex;
          gap:12px;
          align-items:flex-start;
          min-width: 55%;
        }
        .logo{ width:62px; height:62px; object-fit:contain; }
        .companyName{ font-weight:800; font-size:16px; letter-spacing:0.2px; }
        .muted{ color:var(--muted); font-size:12px; margin-top:2px; }
        .headerRight{ text-align:right; min-width: 35%; }
        .invoiceTitle{ font-weight:800; font-size:15px; }
        .meta{ margin-top:8px; font-size:12px; }
        .metaLabel{ color:var(--muted); }
        .qrWrap{ margin-top:10px; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
        .qrImg{
          display:block;
          border:1px solid var(--border);
          border-radius:10px;
          background:#fff;
        }
        .qrCaption{ font-size:11px; color:var(--muted); }

        .divider{ height:1px; background:var(--border); margin:14px 0; }

        .infoGrid{
          display:flex;
          justify-content:space-between;
          gap:12px;
          font-size:12px;
          line-height:1.6;
        }
        .infoRight{ text-align:right; }

        .tableWrap{ margin-top:12px; }
        .tbl{
          width:100%;
          border-collapse:collapse;
          font-size:12px;
        }
        .tbl th, .tbl td{
          border:1px solid var(--border);
          padding:8px;
          vertical-align:top;
        }
        .tbl thead th{
          background:#f9fafb;
          font-weight:800;
        }
        .center{ text-align:center; }
        .right{ text-align:right; }
        .emptyRow{ text-align:center; color:var(--muted); padding:14px; }

        .bottomRow{
          margin-top:14px;
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        }
        .sumBox{
          width: 320px;
          border:1px solid var(--border);
          border-radius:12px;
          padding:12px 14px;
          background:#fff;
        }
        .sumLine{
          display:flex;
          justify-content:space-between;
          gap:10px;
          padding:4px 0;
          font-size:12px;
        }
        .mutedLine{ color:var(--muted); }
        .sumTotal{
          border-top:1px solid var(--border);
          margin-top:6px;
          padding-top:8px;
          font-size:13px;
          font-weight:800;
        }

        .signRow{
          margin-top:28px;
          display:flex;
          justify-content:space-between;
          gap:16px;
        }
        .signCol{ width:45%; text-align:center; }
        .signTitle{ font-weight:800; font-size:13px; }
        .signHint{ color:var(--muted); font-size:11px; margin-top:2px; }
        .signLine{
          margin:40px auto 0 auto;
          height:1px;
          width: 80%;
          background:var(--border);
        }

        /* responsive */
        @media (max-width: 980px){
          .a4Card{
            width: 100%;
            min-height: auto;
            padding: 18px;
            border-radius: 12px;
          }
          .topHeaderCard{
            flex-direction: column;
            align-items: stretch;
          }
          .topActions{
            justify-content:flex-start;
          }
        }

        /* print */
        @page { size: A4; margin: 10mm; }
        @media print{
          body { background:#fff !important; }
          .no-print{ display:none !important; }
          .a4Card{
            box-shadow:none !important;
            border:none !important;
            border-radius:0 !important;
            width:auto !important;
            min-height:auto !important;
            padding:0 !important;
            margin:0 !important;
          }
          .watermark{ color:rgba(0,0,0,0.06) !important; }
        }
      `}</style>
    </div>
  );
}
