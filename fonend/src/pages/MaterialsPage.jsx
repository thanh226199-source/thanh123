// src/pages/MaterialsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import { getMaterials, deleteMaterial, updateMaterial } from "../api/materialApi";

function pick(item, a, b, fallback = "") {
  return item?.[a] ?? item?.[b] ?? fallback;
}

function money(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("vi-VN") : "0";
}

// ✅ normalize response về dạng mảng (fix lỗi tải kho)
function normalizeMaterials(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.materials)) return res.materials;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.materials)) return res.data.materials;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

/* =========================================================
   ✅ MONEY INPUT (MƯỢT, KHÔNG NHẢY CARET)
   ========================================================= */

// Cho phép gõ tự do số + . , và khoảng trắng
function sanitizeMoneyTyping(raw) {
  if (raw == null) return "";
  return String(raw).replace(/[^\d.,\s]/g, "");
}

// Chuẩn hoá khi BLUR/LƯU
function normalizeMoneyRawAutoPad(raw) {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).trim();
  if (!s) return "";

  if (/[.,]/.test(s)) {
    const parts = s.split(/[.,]/).map((p) => p.replace(/[^\d]/g, ""));
    if (parts.length >= 2) {
      const last = parts[parts.length - 1] || "";
      if (last.length === 1) parts[parts.length - 1] = last + "00";
      if (last.length === 2) parts[parts.length - 1] = last + "0";
    }
    return parts.join("");
  }

  return s.replace(/[^\d]/g, "");
}

// format hiển thị (dấu chấm) khi blur/init
function formatMoneyInput(value) {
  const digits = normalizeMoneyRawAutoPad(value);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// parse để gửi backend
function parseMoneyInput(input) {
  const digits = normalizeMoneyRawAutoPad(input);
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : NaN;
}

/** ===== Modal sửa giá ===== */
function EditPriceModal({
  open,
  title,
  initialGiaNhap,
  initialGiaBan,
  onClose,
  onSubmit,
}) {
  const [giaNhapStr, setGiaNhapStr] = useState("");
  const [giaBanStr, setGiaBanStr] = useState("");
  const [saving, setSaving] = useState(false);
  const giaNhapRef = useRef(null);

  useEffect(() => {
    if (open) {
      setGiaNhapStr(formatMoneyInput(initialGiaNhap ?? 0));
      setGiaBanStr(formatMoneyInput(initialGiaBan ?? 0));
      setSaving(false);

      requestAnimationFrame(() => {
        giaNhapRef.current?.focus?.();
        const len = giaNhapRef.current?.value?.length ?? 0;
        try {
          giaNhapRef.current?.setSelectionRange?.(len, len);
        } catch {}
      });
    }
  }, [open, initialGiaNhap, initialGiaBan]);

  if (!open) return null;

  const handleSave = async () => {
    const giaNhap = parseMoneyInput(giaNhapStr);
    const giaBan = parseMoneyInput(giaBanStr);

    if (Number.isNaN(giaNhap) || Number.isNaN(giaBan)) {
      alert("❌ Giá không hợp lệ. Vui lòng nhập số (VD: 120000 hoặc 120.000 hoặc 120.00)");
      return;
    }
    if (giaNhap <= 0 || giaBan <= 0) {
      alert("❌ Giá phải lớn hơn 0");
      return;
    }
    if (giaBan < giaNhap) {
      alert("❌ Giá bán phải ≥ giá nhập");
      return;
    }

    try {
      setSaving(true);
      await onSubmit({ giaNhap, giaBan });
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") handleSave();
  };

  return (
    <div
      className="ttq-modal-backdrop"
      onClick={onClose}
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <div className="ttq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ttq-modal-head">
          <div className="ttq-modal-title">{title || "Sửa giá"}</div>
          <button className="ttq-modal-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="ttq-modal-body">
          <label className="ttq-modal-label">Giá nhập</label>
          <input
            ref={giaNhapRef}
            className="ttq-modal-input"
            value={giaNhapStr}
            onChange={(e) => setGiaNhapStr(sanitizeMoneyTyping(e.target.value))}
            onBlur={() => setGiaNhapStr(formatMoneyInput(giaNhapStr))}
            placeholder="VD: 120000 hoặc 120.000 hoặc 120.00"
            inputMode="numeric"
          />

          <label className="ttq-modal-label" style={{ marginTop: 12 }}>
            Giá bán
          </label>
          <input
            className="ttq-modal-input"
            value={giaBanStr}
            onChange={(e) => setGiaBanStr(sanitizeMoneyTyping(e.target.value))}
            onBlur={() => setGiaBanStr(formatMoneyInput(giaBanStr))}
            placeholder="VD: 130000 hoặc 130.000 hoặc 130.00"
            inputMode="numeric"
          />

          <div className="ttq-modal-hint">
            Gợi ý: Nhập <b>120.00</b>, hệ thống sẽ hiểu là <b>120.000</b>.
          </div>
        </div>

        <div className="ttq-modal-foot">
          <button className="ttq-btn-outline" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button className="ttq-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ===== Page chính ===== */
export default function MaterialsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // modal
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getMaterials();
      const arr = normalizeMaterials(res);
      setList(arr);
    } catch (e) {
      console.error("LOAD MATERIALS ERROR:", e);
      alert(e?.response?.data?.message || e?.message || "Lỗi tải kho hàng");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    const normalized = list.map((it) => ({
      _id: it._id || it.id,
      maVatLieu: pick(it, "maVatLieu", "code", ""),
      tenVatLieu: pick(it, "tenVatLieu", "name", ""),
      loai: pick(it, "loai", "category", ""),
      donViTinh: pick(it, "donViTinh", "unit", ""),
      giaNhap: pick(it, "giaNhap", "importPrice", 0),
      giaBan: pick(it, "giaBan", "sellPrice", 0),
      soLuongTon: pick(it, "soLuongTon", "stock", 0),
      nhaCungCap: pick(it, "nhaCungCap", "supplier", ""),
    }));

    if (!keyword) return normalized;

    return normalized.filter((it) => {
      const s = `${it.maVatLieu} ${it.tenVatLieu} ${it.loai} ${it.donViTinh} ${it.nhaCungCap}`.toLowerCase();
      return s.includes(keyword);
    });
  }, [list, q]);

  // ✅ thống kê nhanh: số mặt hàng, tổng tồn, tổng giá trị tồn kho (theo giá nhập)
  const stats = useMemo(() => {
    const totalItems = rows.length;
    let totalQty = 0;
    let totalValue = 0;
    rows.forEach((it) => {
      const qty = Number(it.soLuongTon || 0);
      const importPrice = Number(it.giaNhap || 0);
      totalQty += qty;
      totalValue += qty * importPrice;
    });
    return {
      totalItems,
      totalQty,
      totalValue,
    };
  }, [rows]);

  const openEditModal = (it) => {
    setEditItem(it);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditItem(null);
  };

  const submitEdit = async ({ giaNhap, giaBan }) => {
    if (!editItem?._id) return;

    try {
      await updateMaterial(editItem._id, {
        maVatLieu: editItem.maVatLieu,
        tenVatLieu: editItem.tenVatLieu,
        loai: editItem.loai,
        donViTinh: editItem.donViTinh,
        soLuongTon: editItem.soLuongTon,
        nhaCungCap: editItem.nhaCungCap,

        giaNhap,
        giaBan,
      });

      alert("✅ Đã cập nhật");
      closeEditModal();
      load();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Lỗi cập nhật");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Xoá vật liệu này?")) return;
    try {
      await deleteMaterial(id);
      alert("✅ Đã xoá");
      load();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Lỗi xoá");
    }
  };

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      {/* Modal sửa giá */}
      <EditPriceModal
        open={editOpen}
        title={editItem ? `Sửa giá: ${editItem.tenVatLieu || ""}` : "Sửa giá"}
        initialGiaNhap={editItem?.giaNhap}
        initialGiaBan={editItem?.giaBan}
        onClose={closeEditModal}
        onSubmit={submitEdit}
      />

      {/* TOPBAR */}
      <div className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Warehouse</div>
            <div className="ttq-topbar-sub">Kho hàng · Xin chào, bạn</div>
          </div>
        </div>

        <div className="ttq-topbar-right">
          <div className="ttq-pill-mode">
            Chế độ: <b>Danh sách kho</b>
          </div>
          <button className="ttq-btn-outline" onClick={load}>
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <button className="ttq-btn-outline" onClick={() => navigate("/stock/in")}>
            Sang nhập kho
          </button>
          <button className="ttq-btn-outline" onClick={() => navigate("/dashboard")}>
            Về trang chính
          </button>
        </div>
      </div>

      {/* HEADER + STATS */}
      <div className="ttq-page-head" style={{ marginTop: 12 }}>
        <div className="ttq-title-wrap">
          <h1 className="ttq-h1">Kho hàng</h1>
          <div className="ttq-hint">
            Chỉ hiển thị danh sách kho. Nhập/Xuất kho thao tác ở màn Nhập kho / Xuất kho.
          </div>
        </div>

        <div className="ttq-stat-row">
          <div className="ttq-stat-card">
            <div className="ttq-stat-label">Mặt hàng</div>
            <div className="ttq-stat-value">{stats.totalItems}</div>
            <div className="ttq-stat-sub">SKU đang theo dõi</div>
          </div>
          <div className="ttq-stat-card">
            <div className="ttq-stat-label">Tổng tồn kho</div>
            <div className="ttq-stat-value">{money(stats.totalQty)}</div>
            <div className="ttq-stat-sub">Tính theo ĐVT gốc</div>
          </div>
          <div className="ttq-stat-card">
            <div className="ttq-stat-label">Giá trị tồn (nhập)</div>
            <div className="ttq-stat-value">{money(stats.totalValue)}</div>
            <div className="ttq-stat-sub">Quy đổi theo giá nhập</div>
          </div>
        </div>
      </div>

      {/* BẢNG KHO */}
      <div className="container" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="topbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo mã / tên / loại / NCC..."
            />
            <span className="badge">Tổng: {rows.length}</span>
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã</th>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th style={{ width: 70 }}>ĐVT</th>
                  <th className="r">Giá nhập</th>
                  <th className="r">Giá bán</th>
                  <th className="r">Tồn</th>
                  <th>NCC</th>
                  <th style={{ width: 120 }}>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((it) => {
                  const isOut = Number(it.soLuongTon || 0) === 0;
                  return (
                    <tr key={it._id} className={isOut ? "row-out" : ""}>
                      <td className="mono">{it.maVatLieu || "-"}</td>
                      <td style={{ fontWeight: 900 }}>{it.tenVatLieu || "-"}</td>
                      <td>{it.loai || "-"}</td>
                      <td>{it.donViTinh || "-"}</td>
                      <td className="r">{money(it.giaNhap)}</td>
                      <td className="r">{money(it.giaBan)}</td>
                      <td className="r">
                        {money(it.soLuongTon)}
                        {isOut && <span className="pill-out">Hết</span>}
                      </td>
                      <td>{it.nhaCungCap || "-"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="mini" onClick={() => openEditModal(it)}>
                          Sửa giá
                        </button>
                        <button className="mini danger" onClick={() => onDelete(it._id)}>
                          Xoá
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ textAlign: "center", color: "#64748b", padding: 14 }}
                    >
                      {loading ? "Đang tải..." : "Chưa có hàng hoá nào trong kho."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==== STYLE ==== */}
      <style>{`
        :root{
          --bg:#f6f8fc;
          --card:#ffffff;
          --line:#e5e7eb;
          --muted:#64748b;
          --text:#0f172a;
          --blue:#2563eb;

          --brand:#7b2d2d;
          --brandSoft:#fff1f2;
        }

        .ttq-page{ background:var(--bg); min-height:100vh; }

        /* TOPBAR */
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
          margin: 0 auto;
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
        .ttq-btn-outline:disabled{ opacity: .6; cursor:not-allowed; }

        .ttq-btn-primary{
          padding:9px 14px;
          border-radius:12px;
          cursor:pointer;
          font-weight:900;
          border: 0;
          background: var(--brand);
          color: #fff;
          font-size: 13px;
        }
        .ttq-btn-primary:disabled{ opacity: .75; cursor:not-allowed; }

        /* HEADER + STATS */
        .ttq-page-head{ max-width: 1200px; margin: 10px auto 0; padding: 0 2px; }
        .ttq-title-wrap{ padding: 2px 2px; }
        .ttq-h1{ margin: 0; font-size: 22px; font-weight: 900; color: var(--text); }
        .ttq-hint{ font-size: 13px; color: var(--muted); margin-top: 6px; }

        .ttq-stat-row{
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 10px;
        }
        .ttq-stat-card{
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          padding: 10px 12px;
          box-shadow: 0 8px 20px rgba(15,23,42,0.03);
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
          font-size: 16px;
          font-weight: 900;
          color: #111827;
        }
        .ttq-stat-sub{
          margin-top: 3px;
          font-size: 11px;
          color: #94a3b8;
        }

        @media (max-width: 900px){
          .ttq-topbar{ flex-direction: column; align-items: flex-start; }
          .ttq-topbar-right{ justify-content:flex-start; }
          .ttq-stat-row{ grid-template-columns: 1fr; }
        }

        .container{ max-width: 1200px; margin: 0 auto; padding: 0; }

        .card{
          background:var(--card);
          border:1px solid var(--line);
          border-radius:18px;
          padding:16px;
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
          margin-top: 10px;
        }

        .topbar{
          display:flex;
          gap:10px;
          align-items:center;
          justify-content:space-between;
          flex-wrap: wrap;
        }

        .card input{
          width: min(520px, 100%);
          padding:10px 12px;
          border-radius:12px;
          border:1px solid var(--line);
          outline:none;
          background:#fff;
          font-size: 14px;
        }

        .badge{
          padding:8px 10px;
          border-radius:999px;
          font-weight:900;
          background:#eef2ff;
          border:1px solid #e0e7ff;
          font-size: 12px;
        }

        .tableWrap{ margin-top: 12px; overflow:auto; max-height: 520px; }
        .table{ width:100%; border-collapse:collapse; }
        .table th,.table td{
          border-bottom:1px solid #eef2f7;
          padding:9px 10px;
          font-size:14px;
          vertical-align: middle;
        }
        .table th{
          font-size:12px;
          color: var(--muted);
          font-weight: 900;
          background: #f9fafb;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .table tbody tr:nth-child(even){
          background: #fcfcff;
        }
        .table tbody tr:hover{
          background:#f1f5f9;
        }

        .r{ text-align:right; }
        .mono{
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New";
        }

        .mini{
          padding:7px 10px;
          border-radius:10px;
          cursor:pointer;
          font-weight:900;
          border:1px solid var(--line);
          background:#fff;
          margin-right:6px;
          font-size: 12px;
        }
        .mini:hover{ filter: brightness(0.97); }
        .mini.danger{
          background: var(--brandSoft);
          border-color:#ffe4e6;
        }

        .row-out td{
          color:#9ca3af;
        }
        .pill-out{
          display:inline-flex;
          margin-left:6px;
          padding:2px 6px;
          border-radius:999px;
          background:#fee2e2;
          color:#b91c1c;
          font-size:10px;
          font-weight:800;
        }

        /* MODAL */
        .ttq-modal-backdrop{
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .ttq-modal{
          width: min(520px, 100%);
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(229,231,235,0.9);
          box-shadow: 0 18px 55px rgba(15,23,42,0.25);
          animation: ttqPop .14s ease-out;
        }
        @keyframes ttqPop{
          from{ transform: translateY(6px); opacity: .6; }
          to{ transform: translateY(0); opacity: 1; }
        }
        .ttq-modal-head{
          display:flex;
          align-items:center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #eef2f7;
          background: rgba(255,255,255,0.96);
        }
        .ttq-modal-title{
          font-weight: 900;
          color: var(--text);
          font-size: 15px;
        }
        .ttq-modal-x{
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 6px 8px;
          border-radius: 10px;
        }
        .ttq-modal-x:hover{ background: #f1f5f9; }

        .ttq-modal-body{
          padding: 16px;
        }
        .ttq-modal-label{
          display:block;
          font-size: 13px;
          font-weight: 900;
          color: var(--text);
          margin-bottom: 6px;
        }
        .ttq-modal-input{
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--line);
          outline: none;
          font-size: 14px;
        }
        .ttq-modal-input:focus{
          border-color: rgba(123,45,45,0.45);
          box-shadow: 0 0 0 4px rgba(123,45,45,0.08);
        }
        .ttq-modal-hint{
          margin-top: 10px;
          font-size: 12px;
          color: var(--muted);
        }
        .ttq-modal-foot{
          display:flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 16px;
          border-top: 1px solid #eef2f7;
          background: rgba(255,255,255,0.96);
        }
      `}</style>
    </div>
  );
}
