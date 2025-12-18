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

  return (
    <div className="ttq-page" style={{ padding: 16 }}>
      {/* TOPBAR: chỉ 2 nút "Tải lại" + "Về trang chính" */}
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

      <div className="ttq-materials-grid" style={{ marginTop: 12 }}>
        {/* LEFT: FORM */}
        <div className="ttq-card">
          <div className="ttq-card-head">
            <div>
              <div className="ttq-card-title">
                {editingId ? "Cập nhật khách hàng" : "Thêm khách hàng"}
              </div>
              <div className="ttq-card-sub">
                Quản lý thông tin + điểm + hạng tự động (cập nhật khi tích điểm từ hoá đơn).
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
                />
              </div>

              <div className="ttq-span2">
                <label className="ttq-label2">Địa chỉ</label>
                <input
                  className="ttq-input2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="ttq-span2" style={{ display: "flex", gap: 10 }}>
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

          {/* ✅ bảng không scroll ngang, cột tự co */}
          <div className="ttq-table-wrap">
            <table className="ttq-table">
              <thead>
                <tr>
                  <th className="col-name">Khách hàng</th>
                  <th className="col-phone">SĐT</th>
                  <th className="col-rank">Hạng</th>
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
                  list.map((c) => (
                    <tr key={c._id}>
                      <td className="col-name">
                        <div className="ttq-cell-title" title={pickName(c)}>
                          {pickName(c)}
                        </div>
                        <div className="ttq-cell-sub" title={pickAddress(c)}>
                          {pickAddress(c)}
                        </div>
                      </td>

                      <td className="ttq-td-phone col-phone" style={{ fontWeight: 800 }}>
                        <span title={pickPhone(c)}>{pickPhone(c)}</span>
                      </td>

                      <td className="col-rank" style={{ fontWeight: 900 }}>
                        {rankLabel(c.rank)}
                      </td>

                      <td className="col-points" style={{ textAlign: "right", fontWeight: 900 }}>
                        {(c.totalPoints || 0).toLocaleString("vi-VN")}
                      </td>

                      <td className="ttq-td-last col-last" style={{ color: "#6b7280" }}>
                        {c.lastPurchaseAt
                          ? new Date(c.lastPurchaseAt).toLocaleString("vi-VN")
                          : "—"}
                      </td>

                      <td className="col-actions" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                          <button className="ttq-btn-outline" onClick={() => startEdit(c)}>
                            Sửa
                          </button>
                          <button className="ttq-btn-outline" onClick={() => onDelete(c._id)}>
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <style>{`
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

            .col-name{ width: 30%; }
            .col-phone{ width: 14%; }
            .col-rank{ width: 12%; }
            .col-points{ width: 14%; text-align:right; }
            .col-last{ width: 18%; }
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

            /* responsive: nhỏ thì ẩn bớt cột để khỏi scroll ngang */
            @media (max-width: 1100px){
              .col-last{ display:none; }
              .ttq-td-last{ display:none; }
              .col-name{ width: 36%; }
              .col-actions{ width: 16%; }
            }

            @media (max-width: 900px){
              .col-phone{ display:none; }
              .ttq-td-phone{ display:none; }
              .col-name{ width: 44%; }
              .col-actions{ width: 18%; }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
