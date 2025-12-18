// src/pages/StockInPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TTQLogo from "../assets/ttq-logo.png";

import { getMaterials, createMaterial } from "../api/materialApi";
import { getStockInHistory, createStockIn } from "../api/stockApi";

/** ===== Helpers ===== */
const apiMsg = (e) =>
  e?.response?.data?.message ||
  e?.response?.data?.error ||
  e?.message ||
  "Lỗi không xác định";

// Nhập 11100000 hoặc 11.100.000 đều ra 11100000
const parseMoneyVN = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/[^\d]/g, "");
  return s ? Number(s) : 0;
};

const money = (n) => (Number(n || 0)).toLocaleString("vi-VN");

const normalizeArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
};

// lấy tên/mã theo nhiều kiểu backend trả về
const pickMatName = (m) => m?.tenVatLieu ?? m?.name ?? m?.materialName ?? "Không tên";
const pickMatCode = (m) => m?.maVatLieu ?? m?.code ?? m?.materialCode ?? "";

function calcReceiptSummary(h) {
  const items = Array.isArray(h?.items) ? h.items : [];
  const lines = items.length;
  const totalQty = items.reduce((s, it) => s + Number(it?.soLuong ?? it?.qty ?? it?.quantity ?? 0), 0);
  const totalMoney = items.reduce((s, it) => {
    const qty = Number(it?.soLuong ?? it?.qty ?? it?.quantity ?? 0);
    const price = Number(it?.giaNhap ?? it?.price ?? 0);
    return s + qty * price;
  }, 0);
  return { lines, totalQty, totalMoney };
}

/** ===== Modal ===== */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside to close
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "min(760px, 96vw)",
          maxHeight: "86vh",
          overflow: "auto",
          background: "white",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          boxShadow: "0 24px 80px rgba(15,23,42,0.25)",
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #eef2f7",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 12,
              padding: "8px 12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>

        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function StockInPage() {
  const nav = useNavigate();

  const UNIT_OPTIONS = ["M3", "Kg", "M2", "Bao", "Viên"];

  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [history, setHistory] = useState([]);

  // modal detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Tạo nhanh mặt hàng
  const [mform, setMform] = useState({
    code: "",
    name: "",
    category: "",
    unit: "",
    importPrice: "",
    sellPrice: "",
    supplier: "",
  });

  // Phiếu nhập
  const [partner, setPartner] = useState("");
  const [note, setNote] = useState("");

  // 1 dòng nhập
  const newRow = () => ({
    materialId: "",
    qty: 1,
    price: "", // user tự nhập (không auto format)
  });

  const [rows, setRows] = useState([newRow()]);

  const selectedMaterialMap = useMemo(() => {
    const map = new Map();
    materials.forEach((m) => map.set(String(m._id || m.id), m));
    return map;
  }, [materials]);

  const loadMaterials = async () => {
    const res = await getMaterials();
    setMaterials(normalizeArray(res));
  };

  const loadHistory = async () => {
    const res = await getStockInHistory();
    setHistory(normalizeArray(res));
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadMaterials(), loadHistory()]);
    } catch (e) {
      alert(apiMsg(e));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAddRow = () => setRows((prev) => [...prev, newRow()]);
  const onRemoveRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const onChangeRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const createQuickMaterial = async () => {
    try {
      const code = mform.code.trim();
      const name = mform.name.trim();

      if (!code || !name) {
        alert("Vui lòng nhập Mã hàng và Tên hàng.");
        return;
      }

      // gửi cả 2 format field để backend nào cũng nhận
      const payload = {
        // kiểu A
        maVatLieu: code,
        tenVatLieu: name,
        loai: mform.category?.trim() || "",
        donViTinh: mform.unit?.trim() || "",
        giaNhap: parseMoneyVN(mform.importPrice),
        giaBan: parseMoneyVN(mform.sellPrice),
        nhaCungCap: mform.supplier?.trim() || "",
        soLuongTon: 0,

        // kiểu B
        code,
        name,
        category: mform.category?.trim() || "",
        unit: mform.unit?.trim() || "",
        importPrice: parseMoneyVN(mform.importPrice),
        sellPrice: parseMoneyVN(mform.sellPrice),
        supplier: mform.supplier?.trim() || "",
        stock: 0,
      };

      await createMaterial(payload);

      alert("✅ Tạo mặt hàng mới thành công!");
      setMform({
        code: "",
        name: "",
        category: "",
        unit: "",
        importPrice: "",
        sellPrice: "",
        supplier: "",
      });

      await loadMaterials();
    } catch (e) {
      alert(apiMsg(e));
      console.error(e);
    }
  };

  const submitStockIn = async () => {
    try {
      const items = rows
        .map((r) => ({
          material: r.materialId,
          soLuong: Number(r.qty || 0),
          giaNhap: parseMoneyVN(r.price),
        }))
        .filter((x) => x.material && x.soLuong > 0);

      if (items.length === 0) {
        alert("Vui lòng chọn mặt hàng và nhập số lượng hợp lệ.");
        return;
      }

      await createStockIn({
        partner: partner?.trim() || "",
        note: note?.trim() || "",
        items,
      });

      alert("✅ Tạo phiếu nhập kho thành công!");
      setPartner("");
      setNote("");
      setRows([newRow()]);
      await loadAll();
    } catch (e) {
      alert(apiMsg(e));
      console.error(e);
    }
  };

  const openDetail = (h) => {
    setSelectedReceipt(h);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedReceipt(null);
  };

  const selectedSummary = useMemo(() => calcReceiptSummary(selectedReceipt), [selectedReceipt]);

  return (
    <div
      style={{
        background: "#f5f7fb",
        minHeight: "100vh",
        padding: 24,
        fontFamily:
          'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
        color: "#0f172a",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          background: "white",
          borderRadius: 16,
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          border: "1px solid rgba(229,231,235,0.9)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={TTQLogo} alt="TTQ" style={{ width: 34, height: 34, borderRadius: 10 }} />
          <div>
            <div style={{ fontWeight: 950, fontSize: 15 }}>TTQ Warehouse</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Nhập kho · Xin chào, bạn</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={loadAll}
            style={{
              border: "1px solid #e6e8ee",
              background: "white",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <button
            onClick={() => nav("/materials")}
            style={{
              border: "1px solid #e6e8ee",
              background: "white",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Sang kho hàng
          </button>
          <button
            onClick={() => nav("/")}
            style={{
              border: "1px solid #e6e8ee",
              background: "white",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Về trang chính
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "18px auto 0" }}>
        <h2 style={{ margin: "14px 0 6px", fontSize: 22, fontWeight: 950 }}>Nhập hàng</h2>
        <div style={{ color: "#64748b", marginBottom: 12 }}>
          Tạo mặt hàng nhanh (nếu kho chưa có) và lập phiếu nhập để tự tăng tồn trong “Kho hàng”.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          {/* LEFT */}
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              border: "1px solid rgba(229,231,235,0.9)",
            }}
          >
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Tạo phiếu nhập kho</div>

            {/* Quick material */}
            <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 14, padding: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Tạo mặt hàng mới nhanh (nếu kho chưa có)</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Mã hàng *</div>
                  <input
                    value={mform.code}
                    onChange={(e) => setMform({ ...mform, code: e.target.value })}
                    placeholder="VD: C01"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Tên hàng *</div>
                  <input
                    value={mform.name}
                    onChange={(e) => setMform({ ...mform, name: e.target.value })}
                    placeholder="VD: Cát"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Loại</div>
                  <input
                    value={mform.category}
                    onChange={(e) => setMform({ ...mform, category: e.target.value })}
                    placeholder="VD: Vật liệu xây dựng"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>

                {/* Dropdown ĐVT */}
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>ĐVT</div>
                  <select
                    value={mform.unit}
                    onChange={(e) => setMform({ ...mform, unit: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TIỀN: nhập tự do */}
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Giá nhập</div>
                  <input
                    value={mform.importPrice}
                    onChange={(e) => setMform({ ...mform, importPrice: e.target.value })}
                    placeholder="VD: 11100000 hoặc 11.100.000"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    = {money(parseMoneyVN(mform.importPrice))}
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Giá bán</div>
                  <input
                    value={mform.sellPrice}
                    onChange={(e) => setMform({ ...mform, sellPrice: e.target.value })}
                    placeholder="VD: 120000 hoặc 120.000"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    = {money(parseMoneyVN(mform.sellPrice))}
                  </div>
                </div>

                <div style={{ gridColumn: "1 / span 2" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Nhà cung cấp</div>
                  <input
                    value={mform.supplier}
                    onChange={(e) => setMform({ ...mform, supplier: e.target.value })}
                    placeholder="VD: Cát Đồng Tháp"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
              </div>

              <button
                onClick={createQuickMaterial}
                style={{
                  marginTop: 12,
                  border: 0,
                  background: "#1d4ed8",
                  color: "white",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                + Tạo mặt hàng mới
              </button>
            </div>

            {/* Add rows */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 950, marginBottom: 10 }}>Thêm dòng nhập</div>

              {rows.map((r, idx) => {
                const m = selectedMaterialMap.get(String(r.materialId));
                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #eef2f7",
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 10,
                      background: "white",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.5fr 0.7fr auto", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Chọn mặt hàng trong kho</div>
                        <select
                          value={r.materialId}
                          onChange={(e) => onChangeRow(idx, { materialId: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                        >
                          <option value="">-- Chọn mặt hàng --</option>
                          {materials.map((x) => {
                            const id = x._id || x.id;
                            const name = pickMatName(x);
                            const code = pickMatCode(x);
                            return (
                              <option key={String(id)} value={String(id)}>
                                {(code ? `${code} - ` : "") + name}
                              </option>
                            );
                          })}
                        </select>

                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                          {m
                            ? `ĐVT: ${m.donViTinh || m.unit || "-"} | NCC: ${m.nhaCungCap || m.supplier || "-"}`
                            : " "}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Số lượng</div>
                        <input
                          type="number"
                          min="1"
                          value={r.qty}
                          onChange={(e) => onChangeRow(idx, { qty: e.target.value })}
                          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                        />
                      </div>

                      <div>
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Giá nhập (có thể sửa)</div>
                        <input
                          value={r.price}
                          onChange={(e) => onChangeRow(idx, { price: e.target.value })}
                          placeholder={
                            m?.giaNhap
                              ? money(m.giaNhap)
                              : m?.importPrice
                              ? money(m.importPrice)
                              : "VD: 100000 hoặc 100.000"
                          }
                          style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                        />
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                          = {money(parseMoneyVN(r.price))}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                        <button
                          onClick={() => onRemoveRow(idx)}
                          disabled={rows.length === 1}
                          style={{
                            border: "1px solid #e5e7eb",
                            background: "white",
                            borderRadius: 12,
                            padding: "10px 12px",
                            fontWeight: 900,
                            cursor: rows.length === 1 ? "not-allowed" : "pointer",
                            opacity: rows.length === 1 ? 0.6 : 1,
                          }}
                        >
                          Xoá
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={onAddRow}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "white",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                + Thêm dòng
              </button>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Nhà cung cấp / Đối tác (tuỳ chọn)</div>
                  <input
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    placeholder="VD: Cát Đồng Tháp"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Ghi chú (tuỳ chọn)</div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Nhập thêm để kịp đơn hàng"
                    style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
                  />
                </div>
              </div>

              <button
                onClick={submitStockIn}
                style={{
                  marginTop: 12,
                  border: 0,
                  background: "#111827",
                  color: "white",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                }}
              >
                Tạo phiếu nhập kho
              </button>
            </div>
          </div>

          {/* RIGHT */}
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              height: "fit-content",
              border: "1px solid rgba(229,231,235,0.9)",
            }}
          >
            <div style={{ fontWeight: 950, marginBottom: 6 }}>Lịch sử nhập gần đây</div>
            <div style={{ color: "#64748b", marginBottom: 12 }}>
              Sau khi tạo phiếu nhập, hệ thống sẽ tự tăng tồn kho trong “Kho hàng”.
            </div>

            {history.length === 0 ? (
              <div style={{ color: "#64748b" }}>Chưa có phiếu nhập nào.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.map((h) => {
                  const { lines, totalQty, totalMoney } = calcReceiptSummary(h);
                  return (
                    <div
                      key={h._id || h.id}
                      style={{
                        border: "1px solid #eef2f7",
                        borderRadius: 14,
                        padding: 12,
                        background: "#fff",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 950 }}>
                          Phiếu #{String(h._id || h.id || "").slice(-6).toUpperCase()}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {h.createdAt ? new Date(h.createdAt).toLocaleString("vi-VN") : ""}
                        </div>
                      </div>

                      <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
                        Đối tác: <b>{h.partner || h.supplier || "-"}</b>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 13, color: "#334155" }}>
                        <b>Tổng:</b> {lines} dòng • SL: {totalQty} • Thành tiền:{" "}
                        <b>{money(totalMoney)}</b>
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <button
                          onClick={() => openDetail(h)}
                          style={{
                            border: "1px solid #e5e7eb",
                            background: "#eff6ff",
                            borderRadius: 12,
                            padding: "9px 12px",
                            fontWeight: 950,
                            cursor: "pointer",
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DETAIL */}
      <Modal
        open={detailOpen}
        title={
          selectedReceipt
            ? `Chi tiết phiếu #${String(selectedReceipt._id || selectedReceipt.id || "")
                .slice(-6)
                .toUpperCase()}`
            : "Chi tiết phiếu"
        }
        onClose={closeDetail}
      >
        {!selectedReceipt ? null : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Đối tác</div>
                <div style={{ fontWeight: 950, marginTop: 4 }}>{selectedReceipt.partner || selectedReceipt.supplier || "-"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Thời gian</div>
                <div style={{ fontWeight: 950, marginTop: 4 }}>
                  {selectedReceipt.createdAt ? new Date(selectedReceipt.createdAt).toLocaleString("vi-VN") : "-"}
                </div>
              </div>
            </div>

            {selectedReceipt.note ? (
              <div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Ghi chú</div>
                <div style={{ marginTop: 4 }}>{selectedReceipt.note}</div>
              </div>
            ) : null}

            <div style={{ borderTop: "1px solid #eef2f7", paddingTop: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10 }}>Danh sách mặt hàng</div>

              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th style={{ borderBottom: "1px solid #eef2f7", padding: "8px 8px", fontSize: 12, color: "#64748b" }}>
                        Mặt hàng
                      </th>
                      <th style={{ borderBottom: "1px solid #eef2f7", padding: "8px 8px", fontSize: 12, color: "#64748b" }}>
                        SL
                      </th>
                      <th style={{ borderBottom: "1px solid #eef2f7", padding: "8px 8px", fontSize: 12, color: "#64748b" }}>
                        Giá nhập
                      </th>
                      <th style={{ borderBottom: "1px solid #eef2f7", padding: "8px 8px", fontSize: 12, color: "#64748b" }}>
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReceipt.items || []).map((it, idx) => {
                      const name =
                        it?.material?.name ||
                        it?.material?.tenVatLieu ||
                        it?.materialName ||
                        it?.tenVatLieu ||
                        "Mặt hàng";
                      const qty = Number(it?.soLuong ?? it?.qty ?? it?.quantity ?? 0);
                      const price = Number(it?.giaNhap ?? it?.price ?? 0);
                      const lineTotal = qty * price;

                      return (
                        <tr key={idx}>
                          <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontWeight: 900 }}>
                            {name}
                          </td>
                          <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px" }}>{qty}</td>
                          <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px" }}>{money(price)}</td>
                          <td style={{ borderBottom: "1px solid #f1f5f9", padding: "10px 8px", fontWeight: 950 }}>
                            {money(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #eef2f7",
                    borderRadius: 14,
                    padding: "10px 12px",
                    fontWeight: 950,
                  }}
                >
                  Tổng dòng: {selectedSummary.lines} • Tổng SL: {selectedSummary.totalQty} • Tổng tiền:{" "}
                  {money(selectedSummary.totalMoney)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
