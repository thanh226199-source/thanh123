// src/pages/InvoiceCreatePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import InvoiceVatTemplate from "../components/InvoiceVatTemplate";

import { getMaterials } from "../api/materialApi";
import { createInvoice } from "../api/invoiceApi";
import { getCustomers } from "../api/customerApi";

const money = (n) => Number(n || 0).toLocaleString("vi-VN");
const MIN_BILL = 100000;

const genCode = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rnd = Math.floor(100 + Math.random() * 900);
  return `HD-${ymd}-${rnd}`;
};

const rankLabel = (r) =>
  ({ SILVER: "Đồng", GOLD: "Bạc", PLATINUM: "Vàng", DIAMOND: "Kim cương" }[r] || "Đồng");

const benefitsByRank = (rank) => {
  switch (rank) {
    case "GOLD":
      return { discountRate: 0.05 };
    case "PLATINUM":
      return { discountRate: 0.07 };
    case "DIAMOND":
      return { discountRate: 0.1 };
    default:
      return { discountRate: 0 };
  }
};

const getRankByPoints = (points = 0) => {
  const p = Number(points || 0);
  if (p >= 10000) return "DIAMOND";
  if (p >= 5000) return "PLATINUM";
  if (p >= 1000) return "GOLD";
  return "SILVER";
};

function getLoggedUser() {
  try {
    const u1 = localStorage.getItem("ttq_user");
    if (u1) return JSON.parse(u1);

    const u2 = localStorage.getItem("user");
    if (u2) return JSON.parse(u2);

    return null;
  } catch {
    return null;
  }
}

// ===== helpers lấy field theo nhiều schema =====
const pickTonKho = (mat) => Number(mat?.soLuongTon ?? mat?.quantity ?? mat?.ton ?? 0);
const pickCode = (mat) => mat?.maVatLieu ?? mat?.code ?? "";
const pickName = (mat) => mat?.tenVatLieu ?? mat?.name ?? "";
const pickUnit = (mat) => mat?.donViTinh ?? mat?.unit ?? "";
const pickSellPrice = (mat) => Number(mat?.giaBan ?? mat?.sellPrice ?? 0);

export default function InvoiceCreatePage() {
  const navigate = useNavigate();
  const printRef = useRef(null);

  const user = useMemo(() => getLoggedUser(), []);
  const staffNameHidden = useMemo(() => user?.fullName || user?.username || user?.name || "", [user]);

  const [invoiceNo, setInvoiceNo] = useState(genCode());

  // customers
  const [customers, setCustomers] = useState([]);
  const [loadingCus, setLoadingCus] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [note, setNote] = useState("");

  // materials
  const [materials, setMaterials] = useState([]);
  const [loadingMat, setLoadingMat] = useState(true);

  // current line
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");

  const [unitPrice, setUnitPrice] = useState(0);

  // items
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const selectedMat = useMemo(
    () => materials.find((m) => String(m?._id) === String(materialId)),
    [materials, materialId]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c?._id) === String(customerId)),
    [customers, customerId]
  );

  // load materials
  useEffect(() => {
    (async () => {
      try {
        setLoadingMat(true);
        const data = await getMaterials();
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        setMaterials(list);
      } catch (e) {
        console.error(e);
        alert(e?.response?.data?.message || "Không tải được danh sách vật liệu (kho hàng).");
        setMaterials([]);
      } finally {
        setLoadingMat(false);
      }
    })();
  }, []);

  // load customers
  useEffect(() => {
    (async () => {
      try {
        setLoadingCus(true);
        const data = await getCustomers();
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        setCustomers(list);
      } catch (e) {
        console.error(e);
        alert(e?.response?.data?.message || "Không tải được danh sách khách hàng thân thiết");
        setCustomers([]);
      } finally {
        setLoadingCus(false);
      }
    })();
  }, []);

  // when choose customer -> autofill
  useEffect(() => {
    if (!selectedCustomer) return;
    setCustomerName(selectedCustomer.name || "");
    setCustomerPhone(selectedCustomer.phone || "");
    setCustomerAddress(selectedCustomer.address || "");
  }, [selectedCustomer]);

  // auto fill SELL PRICE when choose material
  useEffect(() => {
    if (!selectedMat) {
      setUnitPrice(0);
      return;
    }
    setUnitPrice(pickSellPrice(selectedMat));
  }, [selectedMat]);

  const totalBefore = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.thanhTien || 0), 0),
    [items]
  );

  const linesCount = useMemo(() => items.length, [items]);

  const currentRank = useMemo(() => {
    if (!selectedCustomer) return null;
    const r = selectedCustomer.rank;
    if (r && ["SILVER", "GOLD", "PLATINUM", "DIAMOND"].includes(r)) return r;
    return getRankByPoints(selectedCustomer.totalPoints || 0);
  }, [selectedCustomer]);

  const { discountRate, discountAmount, totalPay } = useMemo(() => {
    if (!currentRank) return { discountRate: 0, discountAmount: 0, totalPay: totalBefore };
    if (totalBefore < MIN_BILL) return { discountRate: 0, discountAmount: 0, totalPay: totalBefore };
    const dr = benefitsByRank(currentRank).discountRate;
    const da = Math.round(totalBefore * dr);
    return { discountRate: dr, discountAmount: da, totalPay: totalBefore - da };
  }, [currentRank, totalBefore]);

  const addItem = () => {
    if (!selectedMat) return alert("Vui lòng chọn vật liệu");
    if (!qty || Number(qty) <= 0) return alert("Số lượng phải > 0");

    const soLuong = Number(qty);
    const ton = pickTonKho(selectedMat);

    if (soLuong > ton) {
      return alert(`Số lượng hàng của bạn không đủ: ${pickName(selectedMat)} (tồn: ${ton})`);
    }

    const donGia = pickSellPrice(selectedMat);

    const row = {
      id:
        (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        String(Date.now()) + "-" + String(Math.random()).slice(2),
      materialId: selectedMat._id,
      maVatLieu: pickCode(selectedMat),
      tenVatLieu: pickName(selectedMat),
      donViTinh: pickUnit(selectedMat),
      soLuong,
      donGia,
      thanhTien: soLuong * donGia,
    };

    setItems((p) => [...p, row]);
    setQty("");
  };

  const validateStockAllRows = () => {
    for (const it of items) {
      const mat = materials.find((m) => String(m._id) === String(it.materialId));
      const ton = mat ? pickTonKho(mat) : null;
      if (ton == null) continue;
      if (Number(it.soLuong) > Number(ton)) {
        return `Số lượng hàng của bạn không đủ: ${it.tenVatLieu} (tồn: ${ton})`;
      }
    }
    return "";
  };

  const onSaveAndPrint = async () => {
    if (saving) return;
    setSaving(true);

    try {
      if (!customerName.trim()) return alert("Vui lòng nhập Khách hàng");
      if (!customerPhone.trim()) return alert("Vui lòng nhập Số điện thoại khách");
      if (items.length === 0) return alert("Chưa có dòng hàng nào");

      const stockErr = validateStockAllRows();
      if (stockErr) return alert(stockErr);

      if (typeof createInvoice !== "function") {
        throw new Error("createInvoice không phải function. Kiểm tra invoiceApi export/import.");
      }

      const normalizedItems = items.map((it) => {
        const mat = materials.find((m) => String(m._id) === String(it.materialId));
        const priceFromStock = mat ? pickSellPrice(mat) : Number(it.donGia || 0);
        const qtyNum = Number(it.soLuong || 0);
        return {
          ...it,
          donGia: priceFromStock,
          thanhTien: qtyNum * priceFromStock,
        };
      });

      const totalBefore2 = normalizedItems.reduce((s, it) => s + Number(it.thanhTien || 0), 0);

      let discountAmount2 = 0;
      let discountRate2 = 0;
      if (currentRank && totalBefore2 >= MIN_BILL) {
        discountRate2 = benefitsByRank(currentRank).discountRate;
        discountAmount2 = Math.round(totalBefore2 * discountRate2);
      }
      const totalPay2 = totalBefore2 - discountAmount2;

      const payload = {
        invoiceNo,
        customerId: customerId || undefined,
        customerName,
        customerPhone,
        customerAddress,
        note,
        staffName: staffNameHidden || undefined,
        total: totalBefore2,
        discountAmount: discountAmount2,
        totalPay: totalPay2,
        items: normalizedItems.map((it) => ({
          materialId: it.materialId,
          itemCode: it.maVatLieu,
          itemName: it.tenVatLieu,
          unit: it.donViTinh,
          qty: it.soLuong,
          price: it.donGia,
          lineTotal: it.thanhTien,
        })),
      };

      await createInvoice(payload);

      alert("✅ Đã lưu hoá đơn! Đang mở In / Xuất PDF...");

      const afterPrint = () => {
        window.removeEventListener("afterprint", afterPrint);

        setInvoiceNo(genCode());
        setCustomerId("");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setNote("");
        setMaterialId("");
        setQty("");
        setUnitPrice(0);
        setItems([]);

        navigate("/invoices");
      };

      window.addEventListener("afterprint", afterPrint);

      window.print();
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Unknown error";
      alert("❌ Lưu thất bại: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ttq-page">
      {/* TOPBAR */}
      <div className="ttq-topbar no-print">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Invoices</div>
            <div className="ttq-topbar-sub">
              Tạo hoá đơn · Xin chào, {user?.username || user?.fullName || "bạn"}
            </div>
          </div>
        </div>

        <div className="ttq-topbar-right">
          <div className="ttq-pill-mode">
            Mã hoá đơn: <b>{invoiceNo}</b>
          </div>
          {selectedCustomer && (
            <div className="ttq-pill-rank">
              KH thân thiết: <b>{selectedCustomer.name}</b> · Hạng{" "}
              <b>{rankLabel(currentRank)}</b>
            </div>
          )}
          <button className="ttq-btn-outline" type="button" onClick={() => navigate("/dashboard")}>
            Về trang chính
          </button>

          <button
            className="ttq-btn-primary"
            type="button"
            onClick={onSaveAndPrint}
            disabled={saving}
          >
            {saving ? "Đang xử lý..." : "Lưu & Xuất PDF"}
          </button>
        </div>
      </div>

      <div className="ttq-page-inner">
        {/* HEADER + STAT SUMMARY */}
        <div className="ttq-page-head no-print">
          <div className="ttq-title-wrap">
            <h1 className="ttq-h1">Tạo hoá đơn bán hàng</h1>
            <div className="ttq-hint">
              Xuất hoá đơn VAT cho khách lẻ / khách thân thiết. Kiểm tra kỹ số lượng trước khi in.
            </div>
          </div>

          <div className="ttq-invoice-stats">
            <div className="ttq-stat-card">
              <div className="ttq-stat-label">Số dòng hàng</div>
              <div className="ttq-stat-value">{linesCount}</div>
              <div className="ttq-stat-sub">
                {linesCount === 0 ? "Chưa thêm dòng nào" : "Dòng trên hoá đơn hiện tại"}
              </div>
            </div>
            <div className="ttq-stat-card">
              <div className="ttq-stat-label">Tạm tính</div>
              <div className="ttq-stat-value">{money(totalBefore)} đ</div>
              <div className="ttq-stat-sub">Chưa trừ chiết khấu</div>
            </div>
            <div className="ttq-stat-card">
              <div className="ttq-stat-label">Giảm giá</div>
              <div className="ttq-stat-value">
                {discountAmount > 0 ? `${money(discountAmount)} đ` : "0 đ"}
              </div>
              <div className="ttq-stat-sub">
                {selectedCustomer
                  ? totalBefore >= MIN_BILL
                    ? `Áp dụng hạng ${rankLabel(currentRank)}`
                    : `Đơn ≥ ${money(MIN_BILL)} đ mới áp dụng`
                  : "Chọn khách thân thiết để áp dụng"}
              </div>
            </div>
            <div className="ttq-stat-card ttq-stat-main">
              <div className="ttq-stat-label">Khách phải thanh toán</div>
              <div className="ttq-stat-value">{money(totalPay)} đ</div>
              <div className="ttq-stat-sub">Số tiền in trên hoá đơn</div>
            </div>
          </div>
        </div>

        {/* GRID: FORM + PREVIEW */}
        <div className="ttq-materials-grid">
          {/* LEFT FORM */}
          <div className="ttq-card no-print">
            <div className="ttq-card-head">
              <div>
                <div className="ttq-card-title">Thông tin hoá đơn</div>
                <div className="ttq-card-sub">Các trường có (*) là bắt buộc</div>
              </div>
              <span className="ttq-badge">{invoiceNo}</span>
            </div>

            <div className="ttq-form2">
              <div className="ttq-grid2">
                <div className="ttq-span2">
                  <label className="ttq-label2">Số hoá đơn *</label>
                  <input
                    className="ttq-input2"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>

                <div className="ttq-span2">
                  <label className="ttq-label2">Chọn KH thân thiết (nếu có)</label>
                  <select
                    className="ttq-input2"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={loadingCus}
                  >
                    <option value="">
                      {loadingCus ? "Đang tải khách..." : "-- Không chọn / Nhập tay --"}
                    </option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.phone ? `- ${c.phone}` : ""}
                      </option>
                    ))}
                  </select>

                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    {selectedCustomer ? (
                      <>
                        Hạng hiện tại: <b style={{ color: "#111827" }}>{rankLabel(currentRank)}</b>
                        {" · "}Giảm:{" "}
                        <b style={{ color: "#111827" }}>
                          {totalBefore >= MIN_BILL ? `${Math.round(discountRate * 100)}%` : "0%"}
                        </b>
                        {" · "}(Áp dụng khi đơn ≥ {money(MIN_BILL)} đ)
                      </>
                    ) : (
                      "Nếu chọn khách, hệ thống sẽ tự điền Tên/SĐT/Địa chỉ."
                    )}
                  </div>
                </div>

                <div className="ttq-span2">
                  <label className="ttq-label2">Khách hàng *</label>
                  <input
                    className="ttq-input2"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="ttq-span2">
                  <label className="ttq-label2">Số điện thoại *</label>
                  <input
                    className="ttq-input2"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="VD: 090xxxxxxx"
                  />
                </div>

                <div className="ttq-span2">
                  <label className="ttq-label2">Địa chỉ</label>
                  <input
                    className="ttq-input2"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>

                <div className="ttq-span2">
                  <label className="ttq-label2">Ghi chú</label>
                  <textarea
                    className="ttq-textarea"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #e5e7eb",
                  margin: "12px 0",
                }}
              />

              <div className="ttq-card-title" style={{ marginBottom: 8 }}>
                Thêm dòng hàng
              </div>

              <div className="ttq-grid2">
                <div className="ttq-span2">
                  <label className="ttq-label2">Vật liệu *</label>
                  <select
                    className="ttq-input2"
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                    disabled={loadingMat}
                  >
                    <option value="">
                      {loadingMat ? "Đang tải vật liệu..." : "-- Chọn vật liệu --"}
                    </option>
                    {materials.map((m) => (
                      <option key={m._id} value={m._id}>
                        {pickCode(m)} - {pickName(m)} (tồn: {pickTonKho(m)} {pickUnit(m) || ""})
                      </option>
                    ))}
                  </select>

                  {selectedMat ? (
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                      Tồn kho:{" "}
                      <b style={{ color: "#111827" }}>{pickTonKho(selectedMat)}</b>{" "}
                      {pickUnit(selectedMat) || ""}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="ttq-label2">Số lượng *</label>
                  <input
                    className="ttq-input2"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setQty("");
                        return;
                      }
                      setQty(String(Number(v)));
                    }}
                    onBlur={() => {
                      if (qty === "") return;
                      const n = Number(qty);
                      if (!Number.isFinite(n) || n < 1) setQty("1");
                      else setQty(String(Math.floor(n)));
                    }}
                  />

                  {selectedMat && Number(qty || 0) > pickTonKho(selectedMat) ? (
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 6,
                        color: "#b91c1c",
                        fontWeight: 700,
                      }}
                    >
                      Số lượng hàng của bạn không đủ
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="ttq-label2">Đơn giá</label>
                  <input
                    className="ttq-input2"
                    value={unitPrice}
                    readOnly
                    disabled
                    placeholder="Tự lấy theo kho hàng"
                    style={{ background: "#f1f5f9", cursor: "not-allowed", fontWeight: 900 }}
                  />
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    = <b style={{ color: "#111827" }}>{money(unitPrice)}</b> đ
                  </div>
                </div>

                <div className="ttq-span2" style={{ display: "flex", gap: 10 }}>
                  <button className="ttq-btn-primary" type="button" onClick={addItem}>
                    + Thêm dòng
                  </button>
                  <button className="ttq-btn-outline" type="button" onClick={() => setItems([])}>
                    Xoá danh sách
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PREVIEW */}
          <div className="ttq-card">
            <div className="ttq-card-head no-print">
              <div>
                <div className="ttq-card-title">Xem trước hoá đơn</div>
                <div className="ttq-card-sub">Bấm “Lưu & Xuất PDF” để in đúng khổ A4.</div>
              </div>
              <span className="ttq-badge ttq-badge-pay">
                Thanh toán: <b>{money(totalPay)} đ</b>
              </span>
            </div>

            <div id="print-area" ref={printRef}>
              <InvoiceVatTemplate
                invoiceNo={invoiceNo}
                createdAt={new Date()}
                customerName={customerName}
                customerPhone={customerPhone}
                customerAddress={customerAddress}
                note={note}
                staffName={staffNameHidden}
                items={items}
                totalBefore={totalBefore}
                discountAmount={discountAmount}
                totalPay={totalPay}
                idForQr={""} // create chưa có id
              />
            </div>
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
          --muted:#64748b;
        }

        .ttq-page{
          background:var(--bg);
          min-height:100vh;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .ttq-topbar{
          position: sticky;
          top: 0;
          z-index: 20;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid rgba(229,231,235,0.85);
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
          max-width: 1200px;
          margin: 8px auto 0;
        }
        .ttq-topbar-left{
          display:flex; align-items:center; gap: 10px; min-width: 220px;
        }
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

        .ttq-pill-mode{
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #0f172a;
        }
        .ttq-pill-rank{
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .ttq-btn-outline{
          padding:9px 13px;
          border-radius:12px;
          cursor:pointer;
          font-weight:900;
          border:1px solid var(--line);
          background:#fff;
          color: var(--text);
          font-size: 13px;
        }
        .ttq-btn-outline:hover{ filter: brightness(0.98); }

        .ttq-btn-primary{
          padding:9px 14px;
          border-radius:12px;
          cursor:pointer;
          font-weight:900;
          border:none;
          background: var(--blue);
          color:#fff;
          font-size: 13px;
          box-shadow: 0 10px 20px rgba(37,99,235,0.2);
        }
        .ttq-btn-primary:disabled{
          opacity: .7;
          cursor:not-allowed;
          box-shadow:none;
        }

        .ttq-page-inner{
          max-width: 1200px;
          margin: 10px auto 18px;
          padding: 0 8px 16px;
        }

        .ttq-page-head{
          display:flex;
          justify-content:space-between;
          gap: 12px;
          align-items:flex-start;
        }
        .ttq-title-wrap{ padding: 2px 2px; }
        .ttq-h1{ margin: 0; font-size: 22px; font-weight: 900; color: var(--text); }
        .ttq-hint{ font-size: 13px; color: var(--muted); margin-top: 6px; max-width: 520px; }

        .ttq-invoice-stats{
          display:grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px;
          min-width: 420px;
        }
        .ttq-stat-card{
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          padding: 8px 10px;
          box-shadow: 0 8px 20px rgba(15,23,42,0.03);
        }
        .ttq-stat-main{
          background: linear-gradient(135deg,#eef2ff,#ffffff);
          border-color:#c7d2fe;
        }
        .ttq-stat-label{
          font-size: 11px;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 700;
        }
        .ttq-stat-value{
          margin-top: 4px;
          font-size: 15px;
          font-weight: 900;
          color: #111827;
        }
        .ttq-stat-sub{
          margin-top: 3px;
          font-size: 11px;
          color: #94a3b8;
        }

        .ttq-materials-grid{
          margin-top: 12px;
          display:grid;
          grid-template-columns: minmax(0,1.1fr) minmax(0,1fr);
          gap: 12px;
          align-items:flex-start;
        }
        .ttq-card{
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          box-shadow: 0 18px 35px rgba(15,23,42,0.06);
          overflow:hidden;
        }
        .ttq-card-head{
          padding: 12px 14px;
          border-bottom: 1px solid #e5e7eb;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        }
        .ttq-card-title{ font-weight: 900; color:#111827; }
        .ttq-card-sub{ font-size: 12px; color:#6b7280; margin-top: 2px; }
        .ttq-badge{
          font-size:12px;
          font-weight:900;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid #e5e7eb;
          background:#f8fafc;
          white-space:nowrap;
        }
        .ttq-badge-pay{
          background:#ecfdf5;
          border-color:#bbf7d0;
          color:#166534;
        }

        .ttq-form2{ padding: 12px 14px 14px; }

        .ttq-grid2{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .ttq-span2{ grid-column: 1 / -1; }

        .ttq-label2{
          font-size:12px;
          font-weight:900;
          color:#111827;
          display:block;
          margin-bottom:6px;
        }
        .ttq-input2{
          width:100%;
          padding:10px 12px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          outline:none;
          background:#fff;
          font-size:14px;
        }
        .ttq-input2:focus{
          border-color:#2563eb;
          box-shadow:0 0 0 3px rgba(37,99,235,0.12);
        }

        .ttq-textarea{
          width:100%;
          padding:10px 12px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          outline:none;
          font-size:14px;
          resize: vertical;
        }
        .ttq-textarea:focus{
          border-color:#2563eb;
          box-shadow:0 0 0 3px rgba(37,99,235,0.12);
        }

        @media (max-width: 1100px){
          .ttq-invoice-stats{
            grid-template-columns: repeat(2,minmax(0,1fr));
            min-width: 0;
          }
        }
        @media (max-width: 900px){
          .ttq-topbar{
            flex-direction: column;
            align-items: flex-start;
          }
          .ttq-topbar-right{ justify-content:flex-start; }
          .ttq-page-head{
            flex-direction: column;
          }
          .ttq-invoice-stats{
            width:100%;
          }
          .ttq-materials-grid{
            grid-template-columns: minmax(0,1fr);
          }
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
            box-shadow:none !important;
          }
        }
      `}</style>
    </div>
  );
}
