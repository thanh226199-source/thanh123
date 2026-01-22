// src/pages/LoyalCustomersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../api/customerApi";

const rankLabel = (r) =>
  ({ SILVER: "Đồng", GOLD: "Bạc", PLATINUM: "Vàng", DIAMOND: "Kim cương" }[r] ||
    "Đồng");

// ✅ helper: tránh lỗi backend trả field khác nhau
const pickName = (c) => c?.name || c?.customerName || c?.fullName || "—";
const pickPhone = (c) => c?.phone || c?.customerPhone || "—";
const pickAddress = (c) => c?.address || c?.customerAddress || "";

// ✅ tính rank nếu backend chưa gửi rank
const getRankByPoints = (points = 0) => {
  const p = Number(points || 0);
  if (p >= 10000) return "DIAMOND";
  if (p >= 5000) return "PLATINUM";
  if (p >= 1000) return "GOLD";
  return "SILVER";
};

const diffDays = (from, to) =>
  Math.floor((from.getTime() - to.getTime()) / (1000 * 60 * 60 * 24));

export default function LoyalCustomersPage() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");

  // form create/update
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const today = useMemo(() => new Date(), []);

  const fetchList = async () => {
    try {
      setErr("");
      setLoading(true);
      const data = await getCustomers(q);
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Không tải được danh sách khách hàng");
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setAddress("");
  };

  const startEdit = (c) => {
    setEditingId(c._id);
    setName(pickName(c));
    const p = pickPhone(c);
    setPhone(p === "—" ? "" : p);
    setAddress(pickAddress(c));
  };

  const onSubmit = async () => {
    try {
      if (!name.trim()) return alert("Vui lòng nhập tên khách hàng");

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };

      if (!editingId) await createCustomer(payload);
      else await updateCustomer(editingId, payload);

      startCreate();
      fetchList();
    } catch (e) {
      alert("❌ " + (e?.message || "Lỗi"));
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Xoá khách hàng này?")) return;
    try {
      await deleteCustomer(id);
      fetchList();
    } catch (e) {
      alert("❌ " + (e?.message || "Lỗi"));
    }
  };

  // ====== SUMMARY BAR ======
  const stats = useMemo(() => {
    if (!list.length) {
      return {
        totalCustomers: 0,
        totalPoints: 0,
        vipCount: 0,
        active30d: 0,
      };
    }

    let totalPoints = 0;
    let vipCount = 0;
    let active30d = 0;

    for (const c of list) {
      const pts = Number(c.totalPoints || 0);
      totalPoints += Number.isFinite(pts) ? pts : 0;

      const rankCode = c.rank || getRankByPoints(pts);
      if (rankCode === "PLATINUM" || rankCode === "DIAMOND") vipCount += 1;

      if (c.lastPurchaseAt) {
        const last = new Date(c.lastPurchaseAt);
        const days = diffDays(today, last);
        if (days <= 30) active30d += 1;
      }
    }

    return {
      totalCustomers: list.length,
      totalPoints,
      vipCount,
      active30d,
    };
  }, [list, today]);

  const formatNumber = (n) => Number(n || 0).toLocaleString("vi-VN");

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      {/* TOPBAR */}
      <div className="ttq-topbar" style={{ borderRadius: 14 }}>
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Loyalty</div>
            <div className="ttq-topbar-sub">
              Khách hàng thân thiết · Xin chào, {user?.username || "bạn"}
            </div>
          </div>
        </div>

        <div className="ttq-topbar-right" style={{ display: "flex", gap: 10 }}>
          <button className="ttq-btn-outline" onClick={fetchList} disabled={loading}>
            {loading ? "Đang tải..." : "Tải lại"}
          </button>

          <button className="ttq-btn-outline" onClick={() => navigate("/dashboard")}>
            Về trang chính
          </button>
        </div>
      </div>

      {/* SUMMARY – 4 KHUNG THỐNG KÊ */}
      <div
        className="ttq-summaryRow"
        style={{
          maxWidth: 1200,
          margin: "12px auto 0",
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(4,minmax(0,1fr))",
        }}
      >
        <div className="ttq-summaryCard">
          <div className="ttq-summaryLabel">Tổng khách</div>
          <div className="ttq-summaryValue">{stats.totalCustomers}</div>
          <div className="ttq-summarySub">Đang được theo dõi trong hệ thống</div>
        </div>
        <div className="ttq-summaryCard">
          <div className="ttq-summaryLabel">Tổng điểm</div>
          <div className="ttq-summaryValue">{formatNumber(stats.totalPoints)}</div>
          <div className="ttq-summarySub">Tích luỹ của tất cả khách hàng</div>
        </div>
        <div className="ttq-summaryCard ttq-summaryVip">
          <div className="ttq-summaryLabel">Khách VIP</div>
          <div className="ttq-summaryValue">{stats.vipCount}</div>
          <div className="ttq-summarySub">Hạng Vàng / Kim cương</div>
        </div>
        <div className="ttq-summaryCard">
          <div className="ttq-summaryLabel">Hoạt động 30 ngày</div>
          <div className="ttq-summaryValue">{stats.active30d}</div>
          <div className="ttq-summarySub">Mua ít nhất 1 lần trong 30 ngày</div>
        </div>
      </div>

      <div className="ttq-materials-grid" style={{ marginTop: 12 }}>
        {/* LEFT: FORM */}
        <div className="ttq-card">
          <div className="ttq-card-head">
            <div>
              <div className="ttq-card-title">
                {editingId ? "Cập nhật khách hàng" : "Thêm khách hàng"}
              </div>
              <div className="ttq-card-sub">
                Quản lý thông tin khách và đồng bộ với hệ thống tích điểm.
              </div>
            </div>
            <span className="ttq-badge">{editingId ? "EDIT" : "NEW"}</span>
          </div>

          <div className="ttq-form2">
            <div className="ttq-grid2">
              <div className="ttq-span2">
                <label className="ttq-label2">Tên khách hàng *</label>
                <input
                  className="ttq-input2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="ttq-span2">
                <label className="ttq-label2">Số điện thoại</label>
                <input
                  className="ttq-input2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 090xxxxxxx"
                />
              </div>

              <div className="ttq-span2">
                <label className="ttq-label2">Địa chỉ</label>
                <input
                  className="ttq-input2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: Sa Đéc, Đồng Tháp"
                />
              </div>

              <div
                className="ttq-span2"
                style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
              >
                <button className="ttq-btn-primary" type="button" onClick={onSubmit}>
                  {editingId ? "Lưu cập nhật" : "Tạo khách"}
                </button>

                <button className="ttq-btn-outline" type="button" onClick={startCreate}>
                  Làm mới
                </button>

                <button
                  className="ttq-btn-outline"
                  type="button"
                  onClick={() => navigate("/loyalty/rules")}
                >
                  Xem quy tắc tích điểm
                </button>
              </div>

              <div
                className="ttq-span2"
                style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}
              >
                Lưu ý: Thông tin khách hàng chỉ dùng cho mục đích bán hàng & chăm sóc khách,
                không chia sẻ cho bên thứ ba.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: LIST */}
        <div className="ttq-card">
          <div className="ttq-card-head">
            <div>
              <div className="ttq-card-title">Danh sách khách hàng</div>
              <div className="ttq-card-sub">
                {loading ? "Đang tải..." : `Tổng: ${list.length} khách`}
              </div>
            </div>
            <span className="ttq-badge">{loading ? "..." : `${list.length} KH`}</span>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 10, padding: 12 }}>
            <input
              className="ttq-input2"
              placeholder="Tìm theo tên / SĐT..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchList();
              }}
            />
            <button className="ttq-btn-outline" onClick={fetchList}>
              Tìm
            </button>
          </div>

          {err ? <div style={{ padding: 12, color: "#991b1b" }}>❌ {err}</div> : null}

          <div className="ttq-table-wrap">
            <table className="ttq-table">
              <thead>
                <tr>
                  <th className="col-name">Khách hàng</th>
                  <th className="col-phone">SĐT</th>
                  <th className="col-rank">Hạng / Trạng thái</th>
                  <th className="col-points">Tổng điểm</th>
                  <th className="col-last">Lần mua cuối</th>
                  <th className="col-actions">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: 14, textAlign: "center", color: "#6b7280" }}
                    >
                      Đang tải...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: 14, textAlign: "center", color: "#6b7280" }}
                    >
                      Chưa có khách hàng.
                    </td>
                  </tr>
                ) : (
                  list.map((c) => {
                    const pts = Number(c.totalPoints || 0);
                    const rankCode = c.rank || getRankByPoints(pts);
                    const lastAt = c.lastPurchaseAt
                      ? new Date(c.lastPurchaseAt)
                      : null;

                    let statusLabel = "Mới";
                    if (lastAt) {
                      const days = diffDays(today, lastAt);
                      if (days <= 30) statusLabel = "Hoạt động";
                      else if (days <= 90) statusLabel = "Nguy cơ mất";
                      else statusLabel = "Không mua lâu";
                    }

                    const isVip =
                      rankCode === "PLATINUM" || rankCode === "DIAMOND";

                    return (
                      <tr key={c._id} className={isVip ? "ttq-row-vip" : ""}>
                        <td className="col-name">
                          <div className="ttq-cell-title" title={pickName(c)}>
                            {pickName(c)}
                          </div>
                          <div className="ttq-cell-sub" title={pickAddress(c)}>
                            {pickAddress(c)}
                          </div>
                        </td>

                        <td
                          className="ttq-td-phone col-phone"
                          style={{ fontWeight: 800 }}
                        >
                          <span title={pickPhone(c)}>{pickPhone(c)}</span>
                        </td>

                        <td className="col-rank">
                          <div
                            className={`ttq-rank-pill ttq-rank-${rankCode}`}
                            title={rankLabel(rankCode)}
                          >
                            {rankLabel(rankCode)}
                          </div>
                          <div className="ttq-cell-sub">{statusLabel}</div>
                        </td>

                        <td
                          className="col-points"
                          style={{ textAlign: "right", fontWeight: 900 }}
                        >
                          {formatNumber(pts)}
                        </td>

                        <td
                          className="ttq-td-last col-last"
                          style={{ color: "#6b7280" }}
                        >
                          {lastAt ? lastAt.toLocaleString("vi-VN") : "—"}
                        </td>

                        <td className="col-actions" style={{ textAlign: "center" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              justifyContent: "center",
                            }}
                          >
                            <button
                              className="ttq-btn-outline"
                              onClick={() => startEdit(c)}
                            >
                              Sửa
                            </button>
                            <button
                              className="ttq-btn-outline"
                              onClick={() => onDelete(c._id)}
                            >
                              Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <style>{`
            /* ===== KHUNG TÓM TẮT (4 CARD) ===== */
            .ttq-summaryCard{
              background:#ffffff;
              border-radius:14px;
              border:1px solid #e5e7eb;
              padding:10px 12px;
              box-shadow:0 10px 26px rgba(15,23,42,0.06);
            }
            .ttq-summaryLabel{
              font-size:11px;
              font-weight:800;
              letter-spacing:.05em;
              text-transform:uppercase;
              color:#9ca3af;
            }
            .ttq-summaryValue{
              margin-top:4px;
              font-size:18px;
              font-weight:900;
              color:#0f172a;
            }
            .ttq-summarySub{
              margin-top:2px;
              font-size:12px;
              color:#94a3b8;
            }
            .ttq-summaryVip{
              background:linear-gradient(135deg,#fef9c3,#fefce8);
              border-color:#fde68a;
            }
            @media (max-width: 1024px){
              .ttq-summaryRow{
                grid-template-columns:repeat(2,minmax(0,1fr)) !important;
              }
            }
            @media (max-width: 640px){
              .ttq-summaryRow{
                grid-template-columns:repeat(1,minmax(0,1fr)) !important;
              }
            }

            /* ===== BẢNG DANH SÁCH ===== */
            .ttq-table-wrap{ padding: 0 12px 12px; }

            .ttq-table{
              width:100%;
              border-collapse:collapse;
              font-size:14px;
              table-layout: fixed;
            }

            .ttq-table th{
              text-align:left;
              background:#f8fafc;
              padding:12px;
              font-weight:900;
              border-top:1px solid #e5e7eb;
              border-bottom:1px solid #e5e7eb;
              white-space:nowrap;
            }

            .ttq-table td{
              padding:12px;
              border-bottom:1px solid #eef2f7;
              vertical-align:top;
              background:#fff;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
            }

            .ttq-table tr:hover td{ background:#fbfdff; }

            .ttq-row-vip td{
              background:linear-gradient(90deg,rgba(250,250,255,0.9),#ffffff);
            }

            .col-name{ width: 30%; }
            .col-phone{ width: 14%; }
            .col-rank{ width: 16%; }
            .col-points{ width: 12%; text-align:right; }
            .col-last{ width: 16%; }
            .col-actions{ width: 12%; text-align:center; }

            .ttq-cell-title{
              font-weight:900;
              overflow:hidden;
              text-overflow:ellipsis;
            }
            .ttq-cell-sub{
              margin-top:2px;
              font-size:12px;
              color:#6b7280;
              overflow:hidden;
              text-overflow:ellipsis;
            }

            /* Badge hạng */
            .ttq-rank-pill{
              display:inline-flex;
              align-items:center;
              justify-content:center;
              min-width:72px;
              padding:4px 8px;
              border-radius:999px;
              font-size:12px;
              font-weight:800;
              border:1px solid #e5e7eb;
              background:#f9fafb;
              color:#111827;
              margin-bottom:2px;
            }
            .ttq-rank-SILVER{
              background:#f9fafb;
            }
            .ttq-rank-GOLD{
              background:linear-gradient(135deg,#fef9c3,#fef3c7);
              border-color:#fde68a;
            }
            .ttq-rank-PLATINUM{
              background:linear-gradient(135deg,#e0f2fe,#e5e7eb);
              border-color:#bfdbfe;
            }
            .ttq-rank-DIAMOND{
              background:linear-gradient(135deg,#e0f2fe,#f5d0fe);
              border-color:#bfdbfe;
            }

            /* responsive: nhỏ thì ẩn bớt cột để khỏi scroll ngang */
            @media (max-width: 1100px){
              .col-last{ display:none; }
              .ttq-td-last{ display:none; }
              .col-name{ width: 36%; }
              .col-actions{ width: 14%; }
            }

            @media (max-width: 900px){
              .col-phone{ display:none; }
              .ttq-td-phone{ display:none; }
              .col-name{ width: 42%; }
              .col-actions{ width: 18%; }
              .col-rank{ width: 22%; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
