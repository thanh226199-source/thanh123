// src/pages/MaterialsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
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

export default function MaterialsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

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

  const onEdit = async (it) => {
    const tenVatLieu = prompt("Tên hàng:", it.tenVatLieu || "");
    if (tenVatLieu == null) return;

    const giaBan = prompt("Giá bán (VD: 120000 hoặc 120.000):", String(it.giaBan || "0"));
    if (giaBan == null) return;

    try {
      await updateMaterial(it._id, {
        maVatLieu: it.maVatLieu,
        tenVatLieu: tenVatLieu.trim(),
        giaBan,
      });
      alert("✅ Đã cập nhật");
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
      {/* TOPBAR (giống StockInPage) */}
      <div className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Warehouse</div>
            <div className="ttq-topbar-sub">Kho hàng · Xin chào, bạn</div>
          </div>
        </div>

        <div className="ttq-topbar-right">
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

      <div className="ttq-page-head" style={{ marginTop: 12 }}>
        <div className="ttq-title-wrap">
          <h1 className="ttq-h1">Kho hàng</h1>
          <div className="ttq-hint">
            Chỉ hiển thị danh sách kho. Nhập kho/Xuất kho thao tác ở mục Nhập kho / Xuất kho.
          </div>
        </div>
      </div>

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
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th>ĐVT</th>
                  <th className="r">Giá nhập</th>
                  <th className="r">Giá bán</th>
                  <th className="r">Tồn</th>
                  <th>NCC</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((it) => (
                  <tr key={it._id}>
                    <td className="mono">{it.maVatLieu || "-"}</td>
                    <td style={{ fontWeight: 900 }}>{it.tenVatLieu || "-"}</td>
                    <td>{it.loai || "-"}</td>
                    <td>{it.donViTinh || "-"}</td>
                    <td className="r">{money(it.giaNhap)}</td>
                    <td className="r">{money(it.giaBan)}</td>
                    <td className="r">{money(it.soLuongTon)}</td>
                    <td>{it.nhaCungCap || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="mini" onClick={() => onEdit(it)}>
                        Sửa
                      </button>
                      <button className="mini danger" onClick={() => onDelete(it._id)}>
                        Xoá
                      </button>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", color: "#64748b", padding: 14 }}>
                      {loading ? "Đang tải..." : "Chưa có hàng hoá nào trong kho."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        :root{
          --bg:#f6f8fc;
          --card:#ffffff;
          --line:#e5e7eb;
          --muted:#64748b;
          --text:#0f172a;
          --blue:#2563eb;
        }

        .ttq-page{ background:var(--bg); min-height:100vh; }

        .ttq-topbar{
          position: sticky;
          top: 0;
          z-index: 20;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
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
        .ttq-topbar-right{
          display:flex; gap:10px; align-items:center; flex-wrap:wrap;
          justify-content:flex-end;
        }

        .ttq-btn-outline{
          padding:10px 14px;
          border-radius:12px;
          cursor:pointer;
          font-weight:900;
          border:1px solid var(--line);
          background:#fff;
          color: var(--text);
        }
        .ttq-btn-outline:hover{ filter: brightness(0.98); }

        .ttq-page-head{ max-width: 1200px; margin: 0 auto; padding: 0 2px; }
        .ttq-title-wrap{ padding: 2px 2px; }
        .ttq-h1{ margin: 0; font-size: 22px; font-weight: 900; color: var(--text); }
        .ttq-hint{ font-size: 13px; color: var(--muted); margin-top: 6px; }

        .container{ max-width: 1200px; margin: 0 auto; padding: 0; }

        @media (max-width: 1000px){
          .ttq-topbar{ flex-direction: column; align-items: flex-start; }
          .ttq-topbar-right{ justify-content:flex-start; }
        }

        .card{
          background:var(--card);
          border:1px solid var(--line);
          border-radius:18px;
          padding:16px;
          box-shadow: 0 14px 30px rgba(15,23,42,0.06);
        }

        .topbar{
          display:flex;
          gap:10px;
          align-items:center;
          justify-content:space-between;
          flex-wrap: wrap;
        }

        input{
          width: min(520px, 100%);
          padding:10px 12px;
          border-radius:12px;
          border:1px solid var(--line);
          outline:none;
          background:#fff;
        }

        .badge{
          padding:8px 10px;
          border-radius:999px;
          font-weight:900;
          background:#eef2ff;
          border:1px solid #e0e7ff;
        }

        .tableWrap{ margin-top: 12px; overflow:auto; }
        .table{ width:100%; border-collapse:collapse; }
        .table th,.table td{
          border-bottom:1px solid #eef2f7;
          padding:10px 10px;
          font-size:14px;
          vertical-align: middle;
        }
        .table th{
          font-size:12px;
          color: var(--muted);
          font-weight: 900;
          text-transform: none;
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
        }
        .mini:hover{ filter: brightness(0.98); }
        .mini.danger{
          background:#fff1f2;
          border-color:#ffe4e6;
        }
      `}</style>
    </div>
  );
}
