import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";

import { getMaterials } from "../api/materialApi";
import { createStockOut, getStockOutHistory } from "../api/stockApi";

export default function StockOutPage() {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState([]);
  const [history, setHistory] = useState([]);

  // ✅ NEW: mở/đóng chi tiết phiếu trong lịch sử
  const [openId, setOpenId] = useState(null);

  // form header
  const [partner, setPartner] = useState("");
  const [note, setNote] = useState("");

  // dòng đang chọn để add
  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState("");

  // items trong phiếu
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const selected = useMemo(
    () => materials.find((m) => m._id === materialId),
    [materials, materialId]
  );

  const fetchAll = async () => {
    const ms = await getMaterials();
    setMaterials(Array.isArray(ms) ? ms : []);
    const his = await getStockOutHistory();
    setHistory(Array.isArray(his) ? hsToArray(his) : []);
  };

  // ✅ helper: phòng khi API trả về {data: []} hoặc []
  const hsToArray = (hs) => {
    if (Array.isArray(hs)) return hs;
    if (hs && Array.isArray(hs.data)) return hs.data;
    return [];
  };

  useEffect(() => {
    (async () => {
      try {
        const ms = await getMaterials();
        setMaterials(Array.isArray(ms) ? ms : []);
        const his = await getStockOutHistory();
        setHistory(hsToArray(his));
      } catch (e) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      }
    })();
    // eslint-disable-next-line
  }, []);

  const addItem = () => {
    if (!materialId) return alert("Chọn vật liệu trước");
    const q = Number(qty);
    if (!q || q <= 0) return alert("Số lượng phải > 0");

    const p = unitPrice === "" ? 0 : Number(unitPrice);
    if (p < 0 || Number.isNaN(p)) return alert("Giá xuất không hợp lệ");

    const m = selected;
    if (!m) return alert("Vật liệu không tồn tại");

    // ✅ nếu đã có dòng cùng material -> cộng dồn
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.material === materialId);
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = {
          ...clone[idx],
          soLuong: Number(clone[idx].soLuong) + q,
          giaXuat: p, // cập nhật giá mới nhất (tuỳ bạn)
          tonHienTai: Number(m.soLuongTon || clone[idx].tonHienTai || 0),
        };
        return clone;
      }
      return [
        ...prev,
        {
          material: materialId,
          maVatLieu: m.maVatLieu,
          tenVatLieu: m.tenVatLieu,
          soLuong: q,
          giaXuat: p,
          tonHienTai: Number(m.soLuongTon || 0),
        },
      ];
    });

    // reset dòng
    setMaterialId("");
    setQty(1);
    setUnitPrice("");
  };

  const removeItem = (material) => {
    setItems((prev) => prev.filter((x) => x.material !== material));
  };

  const updateItemQty = (material, newQty) => {
    const q = Number(newQty);
    if (!q || q <= 0) return;
    setItems((prev) =>
      prev.map((x) => (x.material === material ? { ...x, soLuong: q } : x))
    );
  };

  // ✅ NEW: xoá danh sách có confirm
  const clearItems = () => {
    if (!items.length) return;
    if (!window.confirm("Bạn muốn xoá toàn bộ danh sách trong phiếu xuất?")) return;
    setItems([]);
  };

  const submitVoucher = async (e) => {
    e.preventDefault();
    if (!items.length) return alert("Phiếu xuất phải có ít nhất 1 dòng vật liệu");

    setLoading(true);
    try {
      await createStockOut({
        partner,
        note,
        createdBy: user?.username || "",
        items: items.map((i) => ({
          material: i.material,
          soLuong: Number(i.soLuong),
          // ✅ backend của bạn đang dùng giaBan hoặc giaXuat tuỳ phiên bản.
          // Nếu backend route đang đọc "giaBan", hãy đổi key ở đây thành "giaBan".
          giaXuat: Number(i.giaXuat || 0),
        })),
      });

      alert("Tạo phiếu xuất thành công!");
      setPartner("");
      setNote("");
      setItems([]);
      setOpenId(null);

      // reload
      const his = await getStockOutHistory();
      setHistory(hsToArray(his));

      // reload tồn kho để dropdown cập nhật tồn
      const ms = await getMaterials();
      setMaterials(Array.isArray(ms) ? ms : []);
    } catch (err) {
      alert(err?.response?.data?.message || "Xuất kho thất bại");
    } finally {
      setLoading(false);
    }
  };

  const totalQty = items.reduce((s, i) => s + Number(i.soLuong || 0), 0);
  const totalMoney = items.reduce(
    (s, i) => s + Number(i.soLuong || 0) * Number(i.giaXuat || 0),
    0
  );

  return (
    <div className="ttq-app">
      <div className="ttq-topbar">
        <div className="ttq-topbar-left">
          <img className="ttq-topbar-logo" src={TTQLogo} alt="TTQ" />
          <div>
            <div className="ttq-topbar-name">TTQ Warehouse</div>
            <div className="ttq-topbar-sub">Xuất kho (1 phiếu nhiều món)</div>
          </div>
        </div>
        <div className="ttq-topbar-right">
          <button className="ttq-btn-outline" onClick={() => navigate("/dashboard")}>
            Về trang chính
          </button>
        </div>
      </div>

      <div className="ttq-page">
        <div className="ttq-materials-grid">
          {/* LEFT */}
          <div className="ttq-card">
            <div className="ttq-card-head">
              <div>
                <div className="ttq-card-title">Tạo phiếu xuất kho</div>
                <div className="ttq-card-sub">
                  Thêm nhiều dòng vật liệu vào 1 phiếu, hệ thống sẽ trừ tồn.
                </div>
              </div>

              <span className="ttq-badge">
                Items: {items.length} • SL: {totalQty} • Tổng: {totalMoney}
              </span>
            </div>

            <form className="ttq-form2" onSubmit={submitVoucher}>
              {/* dòng add item */}
              <div className="ttq-grid2">
                <div className="ttq-span2">
                  <label className="ttq-label2">Vật liệu</label>
                  <select
                    className="ttq-input2"
                    value={materialId}
                    onChange={(e) => setMaterialId(e.target.value)}
                  >
                    <option value="">-- Chọn vật liệu --</option>
                    {materials.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.maVatLieu} - {m.tenVatLieu} (Tồn: {m.soLuongTon || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ttq-label2">Số lượng</label>
                  <input
                    className="ttq-input2"
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                </div>

                <div>
                  <label className="ttq-label2">Giá xuất</label>
                  <input
                    className="ttq-input2"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="VD: 35000"
                  />
                </div>
              </div>

              <div className="ttq-actions" style={{ marginTop: 10 }}>
                <button type="button" className="ttq-btn-outline" onClick={addItem}>
                  + Thêm vào phiếu
                </button>
                <button
                  type="button"
                  className="ttq-btn-outline"
                  onClick={clearItems}
                  disabled={!items.length}
                >
                  Xoá danh sách
                </button>
              </div>

              {/* preview items */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Chi tiết phiếu</div>

                {!items.length ? (
                  <div className="ttq-empty">Chưa có dòng hàng nào.</div>
                ) : (
                  <div className="ttq-table-wrap" style={{ padding: 0 }}>
                    <table className="ttq-table">
                      <thead>
                        <tr>
                          <th>Mã</th>
                          <th>Tên vật liệu</th>
                          <th className="ttq-right">Tồn</th>
                          <th className="ttq-right">SL xuất</th>
                          <th className="ttq-right">Giá</th>
                          <th className="ttq-right">Thành tiền</th>
                          <th className="ttq-center">Xoá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const warn = Number(it.soLuong || 0) > Number(it.tonHienTai || 0);
                          return (
                            <tr key={it.material} style={warn ? { background: "#fff5f5" } : undefined}>
                              <td className="ttq-mono">{it.maVatLieu}</td>
                              <td title={it.tenVatLieu}>{it.tenVatLieu}</td>
                              <td className="ttq-right">{it.tonHienTai}</td>

                              <td className="ttq-right">
                                <input
                                  style={{ width: 80 }}
                                  className="ttq-input2"
                                  type="number"
                                  min="1"
                                  value={it.soLuong}
                                  onChange={(e) => updateItemQty(it.material, e.target.value)}
                                />
                              </td>

                              <td className="ttq-right">{it.giaXuat || 0}</td>
                              <td className="ttq-right ttq-strong">
                                {Number(it.soLuong || 0) * Number(it.giaXuat || 0)}
                              </td>

                              <td className="ttq-center">
                                <button
                                  type="button"
                                  className="ttq-btn-sm ttq-btn-sm-danger"
                                  onClick={() => removeItem(it.material)}
                                >
                                  Xoá
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* ✅ cảnh báo nếu có dòng vượt tồn */}
                    {items.some((it) => Number(it.soLuong || 0) > Number(it.tonHienTai || 0)) ? (
                      <div style={{ padding: 10, fontSize: 12, color: "#b00020" }}>
                        ⚠ Có dòng vượt tồn kho. Hệ thống sẽ báo lỗi khi tạo phiếu.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* footer info */}
              <div className="ttq-grid2" style={{ marginTop: 12 }}>
                <div className="ttq-span2">
                  <label className="ttq-label2">Khách hàng / đối tác</label>
                  <input
                    className="ttq-input2"
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    placeholder="VD: Công trình XYZ"
                  />
                </div>

                <div className="ttq-span2">
                  <label className="ttq-label2">Ghi chú</label>
                  <textarea
                    className="ttq-textarea"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Xuất theo đơn hàng #DH001"
                  />
                </div>
              </div>

              <div className="ttq-actions">
                <button className="ttq-btn-primary" disabled={loading || !items.length}>
                  {loading ? "Đang lưu..." : "Tạo phiếu xuất"}
                </button>
                <button
                  type="button"
                  className="ttq-btn-outline"
                  onClick={() => navigate("/materials")}
                >
                  Sang quản lý vật liệu
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT */}
          <div className="ttq-card">
            <div className="ttq-card-head">
              <div>
                <div className="ttq-card-title">Lịch sử xuất gần đây</div>
                <div className="ttq-card-sub">20 phiếu gần nhất (bấm “Xem” để bung chi tiết)</div>
              </div>
              <span className="ttq-badge">OUT</span>
            </div>

            <div className="ttq-table-wrap">
              {history?.length ? (
                <table className="ttq-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Đối tác</th>
                      <th className="ttq-right">Số dòng</th>
                      <th>Người tạo</th>
                      <th className="ttq-center">Chi tiết</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((h) => {
                      const isOpen = openId === h._id;
                      const totalAmount = (h.items || []).reduce(
                        (sum, it) =>
                          sum +
                          Number(it.soLuong || 0) *
                            Number(it.giaXuat ?? it.giaBan ?? 0),
                        0
                      );

                      return (
                        <React.Fragment key={h._id}>
                          <tr>
                            <td>{h.createdAt ? new Date(h.createdAt).toLocaleString() : "-"}</td>
                            <td title={h.partner || ""}>{h.partner || "-"}</td>
                            <td className="ttq-right ttq-strong">{h.items?.length || 0}</td>
                            <td>{h.createdBy || "-"}</td>
                            <td className="ttq-center">
                              <button
                                type="button"
                                className="ttq-btn-sm"
                                onClick={() => setOpenId(isOpen ? null : h._id)}
                              >
                                {isOpen ? "Ẩn" : "Xem"}
                              </button>
                            </td>
                          </tr>

                          {isOpen ? (
                            <tr>
                              <td colSpan={5} style={{ padding: 0 }}>
                                <div style={{ padding: 10 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <div style={{ fontWeight: 900 }}>
                                      Chi tiết vật liệu ({h.items?.length || 0} dòng)
                                    </div>
                                    <div style={{ fontWeight: 900 }}>
                                      Tổng tiền: {totalAmount}
                                    </div>
                                  </div>

                                  <table className="ttq-table">
                                    <thead>
                                      <tr>
                                        <th>Mã</th>
                                        <th>Tên vật liệu</th>
                                        <th className="ttq-right">SL</th>
                                        <th className="ttq-right">Giá</th>
                                        <th className="ttq-right">Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(h.items || []).map((it, idx) => {
                                        const price = Number(it.giaXuat ?? it.giaBan ?? 0);
                                        return (
                                          <tr key={idx}>
                                            <td className="ttq-mono">{it.maVatLieu || "-"}</td>
                                            <td title={it.tenVatLieu || ""}>
                                              {it.tenVatLieu || "-"}
                                            </td>
                                            <td className="ttq-right ttq-strong">{it.soLuong}</td>
                                            <td className="ttq-right">{price}</td>
                                            <td className="ttq-right ttq-strong">
                                              {Number(it.soLuong || 0) * price}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  {h.note ? (
                                    <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                                      Ghi chú: <b>{h.note}</b>
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="ttq-empty">Chưa có dữ liệu</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
