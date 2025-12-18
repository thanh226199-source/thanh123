// src/pages/InvoiceCreatePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";

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

export default function InvoiceCreatePage() {
  const navigate = useNavigate();
  const printRef = useRef(null);

  const user = useMemo(() => getLoggedUser(), []);

  const staffNameHidden = useMemo(() => {
    return user?.fullName || user?.username || user?.name || "";
  }, [user]);

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
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  // items
  const [items, setItems] = useState([]);

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

  // auto fill price when choose material
  useEffect(() => {
    if (!selectedMat) return;
    setUnitPrice(Number(selectedMat?.giaBan || 0));
  }, [selectedMat]);

  const getTonKho = (mat) => Number(mat?.soLuongTon ?? mat?.quantity ?? mat?.ton ?? 0);

  const totalBefore = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.thanhTien || 0), 0),
    [items]
  );

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
    const ton = getTonKho(selectedMat);

    if (soLuong > ton) {
      return alert(`Số lượng hàng của bạn không đủ: ${selectedMat.tenVatLieu} (tồn: ${ton})`);
    }

    const donGia = Number(unitPrice || selectedMat?.giaBan || 0);

    const row = {
      id:
        (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        String(Date.now()) + "-" + String(Math.random()).slice(2),
      materialId: selectedMat._id,
      maVatLieu: selectedMat.maVatLieu,
      tenVatLieu: selectedMat.tenVatLieu,
      donViTinh: selectedMat.donViTinh,
      soLuong,
      donGia,
      thanhTien: soLuong * donGia,
    };

    setItems((p) => [...p, row]);
    setQty(1);
  };

  const removeItem = (id) => setItems((p) => p.filter((x) => x.id !== id));
  const onPrint = () => window.print();

  const validateStockAllRows = () => {
    for (const it of items) {
      const mat = materials.find((m) => String(m._id) === String(it.materialId));
      const ton = mat ? getTonKho(mat) : null;
      if (ton == null) continue;
      if (Number(it.soLuong) > Number(ton)) {
        return `Số lượng hàng của bạn không đủ: ${it.tenVatLieu} (tồn: ${ton})`;
      }
    }
    return "";
  };

  const onSave = async () => {
    try {
      if (!customerName.trim()) return alert("Vui lòng nhập Khách hàng");
      if (!customerPhone.trim()) return alert("Vui lòng nhập Số điện thoại khách");
      if (items.length === 0) return alert("Chưa có dòng hàng nào");

      const stockErr = validateStockAllRows();
      if (stockErr) return alert(stockErr);

      const payload = {
        invoiceNo,
        customerId: customerId || undefined,
        customerName,
        customerPhone,
        customerAddress,
        note,

        // vẫn lưu cho backend (ẩn UI)
        staffName: staffNameHidden || undefined,

        total: totalBefore,
        discountAmount,
        totalPay,

        items: items.map((it) => ({
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
      alert("✅ Đã lưu hoá đơn! (Đã bán và trừ kho)");
      navigate("/invoices");
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.message || e?.message || "Unknown error";
      alert("❌ Lưu thất bại: " + msg);
    }
  };

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      {/* TOPBAR */}
      <div className="ttq-topbar no-print">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Invoices</div>
            <div className="ttq-topbar-sub">Tạo hoá đơn · Xin chào, {user?.username || "bạn"}</div>
          </div>
        </div>

        <div className="ttq-topbar-right">
          <button className="ttq-btn-outline" onClick={() => navigate("/dashboard")}>
            Về trang chính
          </button>
          <button className="ttq-btn-primary" onClick={onSave}>
            Lưu hoá đơn
          </button>
          <button className="ttq-btn-outline" onClick={onPrint}>
            In / Xuất PDF
          </button>
        </div>
      </div>

      <div className="ttq-materials-grid" style={{ marginTop: 12 }}>
        {/* LEFT */}
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
                <input className="ttq-input2" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
              </div>

              <div className="ttq-span2">
                <label className="ttq-label2">Chọn KH thân thiết (nếu có)</label>
                <select
                  className="ttq-input2"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={loadingCus}
                >
                  <option value="">{loadingCus ? "Đang tải khách..." : "-- Không chọn / Nhập tay --"}</option>
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
                      {" · "}(Chỉ áp dụng khi đơn ≥ {money(MIN_BILL)}đ)
                    </>
                  ) : (
                    "Nếu chọn khách, hệ thống sẽ tự điền Tên/SĐT/Địa chỉ."
                  )}
                </div>
              </div>

              <div className="ttq-span2">
                <label className="ttq-label2">Khách hàng *</label>
                <input className="ttq-input2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
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
                <textarea className="ttq-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />

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
                  <option value="">{loadingMat ? "Đang tải vật liệu..." : "-- Chọn vật liệu --"}</option>
                  {materials.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.maVatLieu} - {m.tenVatLieu} (tồn: {getTonKho(m)} {m.donViTinh || ""})
                    </option>
                  ))}
                </select>

                {selectedMat ? (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    Tồn kho: <b style={{ color: "#111827" }}>{getTonKho(selectedMat)}</b> {selectedMat.donViTinh || ""}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="ttq-label2">Số lượng *</label>
                <input
                  className="ttq-input2"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                {selectedMat && Number(qty || 0) > getTonKho(selectedMat) ? (
                  <div style={{ fontSize: 12, marginTop: 6, color: "#b91c1c", fontWeight: 700 }}>
                    Số lượng hàng của bạn không đủ
                  </div>
                ) : null}
              </div>

              <div>
                <label className="ttq-label2">Đơn giá</label>
                <input
                  className="ttq-input2"
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
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

        {/* RIGHT */}
        <div className="ttq-card">
          <div className="ttq-card-head no-print">
            <div>
              <div className="ttq-card-title">Xem trước hoá đơn</div>
              <div className="ttq-card-sub">Bấm “In / Xuất PDF” để in đúng A4.</div>
            </div>
            <span className="ttq-badge">Thanh toán: {money(totalPay)} đ</span>
          </div>

          <div id="print-area" ref={printRef} className="ttq-invoice-a4">
            <div className="inv-header">
              <div className="inv-brand">
                <img src={TTQLogo} alt="TTQ" className="inv-logo" />
                <div>
                  <div className="inv-company">TTQ Vật liệu xây dựng</div>
                  <div className="inv-sub">ĐC: … · ĐT: …</div>
                </div>
              </div>

              <div className="inv-title">
                <div className="inv-h1">HOÁ ĐƠN BÁN HÀNG</div>
                <div className="inv-meta">
                  <div>
                    Số: <b>{invoiceNo}</b>
                  </div>
                  <div>Ngày: {new Date().toLocaleString("vi-VN")}</div>
                </div>
              </div>
            </div>

            <div className="inv-info">
              <div>
                <div>
                  Khách hàng: <b>{customerName || "—"}</b>
                </div>
                <div>
                  SĐT: <b>{customerPhone || "—"}</b>
                </div>
                <div>Địa chỉ: {customerAddress || "—"}</div>
                <div>Ghi chú: {note || "—"}</div>
                {selectedCustomer ? (
                  <div style={{ marginTop: 6 }}>
                    Hạng: <b>{rankLabel(currentRank)}</b> · Giảm:{" "}
                    <b>{totalBefore >= MIN_BILL ? `${Math.round(discountRate * 100)}%` : "0%"}</b>
                  </div>
                ) : null}
              </div>
            </div>

            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Hàng hoá</th>
                  <th style={{ width: 90 }}>ĐVT</th>
                  <th style={{ width: 80, textAlign: "right" }}>SL</th>
                  <th style={{ width: 120, textAlign: "right" }}>Đơn giá</th>
                  <th style={{ width: 140, textAlign: "right" }}>Thành tiền</th>
                  <th className="no-print" style={{ width: 70, textAlign: "center" }}>
                    Xoá
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 12, textAlign: "center", color: "#6b7280" }}>
                      Chưa có dòng hàng nào.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>
                        <b>{it.tenVatLieu}</b>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>({it.maVatLieu})</div>
                      </td>
                      <td style={{ textAlign: "center" }}>{it.donViTinh || "-"}</td>
                      <td style={{ textAlign: "right" }}>{it.soLuong}</td>
                      <td style={{ textAlign: "right" }}>{money(it.donGia)}</td>
                      <td style={{ textAlign: "right" }}>{money(it.thanhTien)}</td>
                      <td className="no-print" style={{ textAlign: "center" }}>
                        <button className="ttq-btn-sm ttq-btn-sm-danger" onClick={() => removeItem(it.id)}>
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="inv-total">
              <div className="inv-total-box" style={{ width: 320 }}>
                <div style={{ display: "grid", gap: 6, width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tổng trước giảm</span>
                    <b>{money(totalBefore)} đ</b>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                    <span>Giảm giá</span>
                    <b>-{money(discountAmount)} đ</b>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: 8,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Thanh toán</span>
                    <b>{money(totalPay)} đ</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="inv-sign">
              <div>
                <b>Khách hàng</b>
                <div className="inv-sign-sub">(Ký, ghi rõ họ tên)</div>
              </div>
              <div>
                <b>Nhân viên</b>
                <div className="inv-sign-sub">(Ký, ghi rõ họ tên)</div>
              </div>
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
        .ttq-materials-grid{ display:grid; grid-template-columns: 1.05fr 1fr; gap: 12px; }
        .ttq-card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow: 0 18px 35px rgba(15,23,42,0.06); overflow:hidden; }
        .ttq-card-head{ padding: 12px 14px; border-bottom: 1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .ttq-card-title{ font-weight: 900; }
        .ttq-card-sub{ font-size: 12px; color:#6b7280; margin-top: 2px; }
        .ttq-badge{ font-size:12px; font-weight:900; padding:6px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f8fafc; }
        .ttq-form2{ padding: 12px 14px; }
        .ttq-grid2{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .ttq-span2{ grid-column: 1 / -1; }
        .ttq-label2{ font-size:12px; font-weight:900; color:#111827; display:block; margin-bottom:6px; }
        .ttq-input2{
          width:100%; padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb;
          outline:none; background:#fff;
        }
        .ttq-textarea{ width:100%; padding:10px 12px; border-radius:12px; border:1px solid #e5e7eb; outline:none; }
        .ttq-invoice-a4{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:18px; min-height: 520px; }
        .inv-header{display:flex; gap:14px; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e5e7eb; padding-bottom:12px;}
        .inv-brand{display:flex; gap:10px; align-items:center;}
        .inv-logo{width:44px; height:44px; object-fit:contain;}
        .inv-company{font-weight:900;}
        .inv-sub{font-size:12px; color:#6b7280;}
        .inv-title{text-align:right;}
        .inv-h1{font-size:18px; font-weight:900; letter-spacing:0.5px;}
        .inv-meta{font-size:12px; color:#111827; margin-top:6px;}
        .inv-info{display:flex; justify-content:space-between; gap:18px; padding:12px 0;}
        .inv-table{width:100%; border-collapse:collapse; font-size:13px;}
        .inv-table th,.inv-table td{border-top:1px solid #e5e7eb; padding:8px;}
        .inv-table thead th{border-top:none; background:#f8fafc; font-weight:900;}
        .inv-total{display:flex; justify-content:flex-end; padding-top:10px;}
        .inv-total-box{border:1px solid #e5e7eb; border-radius:12px; padding:10px 12px; background:#f8fafc;}
        .inv-sign{display:flex; justify-content:space-between; padding-top:26px;}
        .inv-sign-sub{font-size:12px; color:#6b7280; margin-top:4px;}
        .ttq-btn-sm{ padding:6px 10px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; font-weight:900; }
        .ttq-btn-sm-danger{ border-color:#fecaca; color:#991b1b; background:#fff5f5; }

        @media (max-width: 1000px){
          .ttq-materials-grid{ grid-template-columns: 1fr; }
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
            width: 210mm; border: none !important; border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
