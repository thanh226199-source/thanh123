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

const money = (n) => Number(n || 0).toLocaleString("vi-VN");

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

// ✅ NCC + Giá nhập mặc định từ kho hàng (Material)
const pickSupplier = (m) => m?.nhaCungCap ?? m?.supplier ?? "";
const pickImportPrice = (m) => Number(m?.giaNhap ?? m?.importPrice ?? 0);

// ✅ ĐVT từ kho hàng
const pickUnit = (m) => (m?.donViTinh ?? m?.unit ?? m?.dvt ?? "").toString();

/** ✅ Mã phiếu nhập: ưu tiên code/receiptNo nếu backend có, nếu không dùng _id cắt 6 ký tự */
const pickReceiptCode = (h) =>
  (h?.code ||
    h?.receiptNo ||
    h?.stockInNo ||
    h?.phieuNo ||
    h?.maPhieu ||
    h?.maPhieuNhap ||
    "")
    .toString()
    .trim() ||
  String(h?._id || h?.id || "").slice(-6).toUpperCase();

function calcReceiptSummary(h) {
  const items = Array.isArray(h?.items) ? h.items : [];
  const lines = items.length;
  const totalQty = items.reduce(
    (s, it) => s + Number(it?.soLuong ?? it?.qty ?? it?.quantity ?? 0),
    0
  );
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

  // ✅ search phiếu nhập theo mã phiếu
  const [searchReceipt, setSearchReceipt] = useState("");

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
  const [partner, setPartner] = useState(""); // ✅ hiển thị, không cho sửa
  const [note, setNote] = useState("");

  // 1 dòng nhập
  const newRow = () => ({
    materialId: "",
    qty: 1,
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

  // ✅ Tự động “gán” NCC theo vật liệu đã chọn
  const derivedPartner = useMemo(() => {
    const suppliers = new Set();
    rows.forEach((r) => {
      const m = selectedMaterialMap.get(String(r.materialId));
      const s = (m ? pickSupplier(m) : "").trim();
      if (s) suppliers.add(s);
    });

    if (suppliers.size === 0) return "";
    if (suppliers.size === 1) return Array.from(suppliers)[0];
    return "Nhiều nhà cung cấp";
  }, [rows, selectedMaterialMap]);

  useEffect(() => {
    setPartner(derivedPartner);
  }, [derivedPartner]);

  // ✅ Tổng tiền phiếu đang nhập (TÍNH THEO GIÁ TRONG KHO)
  const draftTotalMoney = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const qty = Number(r?.qty || 0);
        if (!r?.materialId || qty <= 0) return sum;
        const m = selectedMaterialMap.get(String(r.materialId));
        const price = m ? pickImportPrice(m) : 0;
        return sum + qty * price;
      }, 0),
    [rows, selectedMaterialMap]
  );

  const createQuickMaterial = async () => {
    try {
      const code = mform.code.trim();
      const name = mform.name.trim();

      if (!code || !name) {
        alert("Vui lòng nhập Mã hàng và Tên hàng.");
        return;
      }

      const payload = {
        maVatLieu: code,
        tenVatLieu: name,
        loai: mform.category?.trim() || "",
        donViTinh: mform.unit?.trim() || "",
        giaNhap: parseMoneyVN(mform.importPrice),
        giaBan: parseMoneyVN(mform.sellPrice),
        nhaCungCap: mform.supplier?.trim() || "",
        soLuongTon: 0,

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

  // ✅ SUBMIT
  const submitStockIn = async () => {
    try {
      const items = rows
        .map((r) => {
          const m = selectedMaterialMap.get(String(r.materialId));
          return {
            material: r.materialId,
            soLuong: Number(r.qty || 0),
            giaNhap: m ? pickImportPrice(m) : 0,
          };
        })
        .filter((x) => x.material && x.soLuong > 0);

      if (items.length === 0) {
        alert("Vui lòng chọn mặt hàng và nhập số lượng hợp lệ.");
        return;
      }

      await createStockIn({
        partner: (derivedPartner || "").trim(),
        note: note?.trim() || "",
        items,
      });

      alert("✅ Tạo phiếu nhập kho thành công!");
      setNote("");
      setRows([newRow()]);
      setSearchReceipt("");
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

  const filteredHistory = useMemo(() => {
    const q = (searchReceipt || "").trim().toUpperCase();
    if (!q) return history;
    return history.filter((h) => pickReceiptCode(h).toUpperCase().includes(q));
  }, [history, searchReceipt]);

  const foundCount = useMemo(() => filteredHistory.length, [filteredHistory]);

  /** ===== UI ===== */
  const inputBase = {
    width: "100%",
    padding: 10,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 13,
  };

  const readOnlyInput = {
    ...inputBase,
    background: "#f1f5f9",
    cursor: "not-allowed",
  };

  return (
    <div
      style={{
        background: "#f6f8fc",
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
          borderRadius: 16,
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
          border: "1px solid rgba(229,231,235,0.9)",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.98))",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img
            src={TTQLogo}
            alt="TTQ"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#fff",
              border: "1px solid #e5e7eb",
              objectFit: "contain",
            }}
          />
          <div>
            <div style={{ fontWeight: 950, fontSize: 15 }}>TTQ Warehouse</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Nhập kho · Phiếu nhập vật liệu
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              fontSize: 11,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#0f172a",
            }}
          >
            Chế độ: <b>Nhập kho</b>
          </div>

          <button
            onClick={loadAll}
            style={{
              border: "1px solid #e6e8ee",
              background: "white",
              borderRadius: 12,
              padding: "9px 14px",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <button
            onClick={() => nav("/materials")}
            style={{
              border: "1px solid #e6e8ee",
              background: "#0f172a",
              color: "#fff",
              borderRadius: 12,
              padding: "9px 14px",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Sang kho hàng
          </button>
          <button
            onClick={() => nav("/dashboard")}
            style={{
              border: "1px solid #e6e8ee",
              background: "white",
              borderRadius: 12,
              padding: "9px 14px",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Về trang chính
          </button>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 1200, margin: "18px auto 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <h2 style={{ margin: "6px 0 4px", fontSize: 22, fontWeight: 950 }}>Nhập hàng</h2>
            <div style={{ color: "#64748b" }}>
              Tạo nhanh mặt hàng (nếu kho chưa có) và lập phiếu nhập để tự tăng tồn trong
              “Kho hàng”.
            </div>
          </div>

          <div
            style={{
              borderRadius: 12,
              padding: "8px 12px",
              background: "#eff6ff",
              border: "1px solid #dbeafe",
              fontSize: 12,
              fontWeight: 900,
              color: "#1d4ed8",
              minWidth: 200,
              textAlign: "right",
            }}
          >
            Tạm tính phiếu mới: {money(draftTotalMoney)} đ
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.45fr 1fr",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT – FORM PHIẾU */}
          <div
            style={{
              background: "white",
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
              border: "1px solid rgba(229,231,235,0.9)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 950, fontSize: 15 }}>Phiếu nhập mới</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  1. Tạo mặt hàng (nếu cần) · 2. Thêm dòng nhập · 3. Xác nhận phiếu.
                </div>
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                Tổng dòng: {rows.length}
              </div>
            </div>

            {/* Quick material */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #eef2f7",
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>Tạo mặt hàng mới nhanh (nếu kho chưa có)</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontWeight: 800,
                  }}
                >
                  Tuỳ chọn
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Mã hàng *</div>
                  <input
                    value={mform.code}
                    onChange={(e) => setMform({ ...mform, code: e.target.value })}
                    placeholder="VD: C01"
                    style={inputBase}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Tên hàng *</div>
                  <input
                    value={mform.name}
                    onChange={(e) => setMform({ ...mform, name: e.target.value })}
                    placeholder="VD: Cát"
                    style={inputBase}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Loại</div>
                  <input
                    value={mform.category}
                    onChange={(e) => setMform({ ...mform, category: e.target.value })}
                    placeholder="VD: Vật liệu xây dựng"
                    style={inputBase}
                  />
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>ĐVT</div>
                  <select
                    value={mform.unit}
                    onChange={(e) => setMform({ ...mform, unit: e.target.value })}
                    style={inputBase}
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Giá nhập</div>
                  <input
                    value={mform.importPrice}
                    onChange={(e) => setMform({ ...mform, importPrice: e.target.value })}
                    placeholder="VD: 11100000 hoặc 11.100.000"
                    style={inputBase}
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
                    style={inputBase}
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
                    style={inputBase}
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
                  fontSize: 13,
                }}
              >
                + Tạo mặt hàng mới
              </button>
            </div>

            {/* Add rows */}
            <div>
              <div style={{ fontWeight: 950, marginBottom: 10 }}>Thêm dòng nhập</div>

              {rows.map((r, idx) => {
                const m = selectedMaterialMap.get(String(r.materialId));

                const matCode = m ? pickMatCode(m) : "";
                const matName = m ? pickMatName(m) : "";
                const matUnit = m ? pickUnit(m) : "";
                const importPriceFromKho = m ? pickImportPrice(m) : 0;

                const lineTotal =
                  (Number(r?.qty || 0) > 0 ? Number(r?.qty || 0) : 0) * importPriceFromKho;

                return (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #eef2f7",
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 10,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.3fr 0.5fr 0.7fr auto",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}
                        >
                          Chọn mặt hàng trong kho
                        </div>
                        <select
                          value={r.materialId}
                          onChange={(e) =>
                            onChangeRow(idx, { materialId: e.target.value })
                          }
                          style={inputBase}
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
                            ? `ĐVT: ${m.donViTinh || m.unit || "-"} • NCC: ${
                                m.nhaCungCap || m.supplier || "-"
                              }`
                            : " "}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "0.8fr 1.4fr 0.6fr",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 12,
                                marginBottom: 6,
                                color: "#334155",
                              }}
                            >
                              Mã hàng
                            </div>
                            <input
                              value={matCode}
                              readOnly
                              disabled
                              style={readOnlyInput}
                              placeholder="(tự động)"
                            />
                          </div>

                          <div>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 12,
                                marginBottom: 6,
                                color: "#334155",
                              }}
                            >
                              Tên hàng
                            </div>
                            <input
                              value={matName}
                              readOnly
                              disabled
                              style={readOnlyInput}
                              placeholder="(tự động)"
                            />
                          </div>

                          <div>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 12,
                                marginBottom: 6,
                                color: "#334155",
                              }}
                            >
                              ĐVT
                            </div>
                            <input
                              value={matUnit}
                              readOnly
                              disabled
                              style={readOnlyInput}
                              placeholder="(tự động)"
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: 12,
                              marginBottom: 6,
                              color: "#334155",
                            }}
                          >
                            Thành tiền
                          </div>
                          <input
                            value={money(lineTotal)}
                            readOnly
                            disabled
                            style={{
                              ...readOnlyInput,
                              background: "#f8fafc",
                              fontWeight: 950,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div
                          style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}
                        >
                          Số lượng
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={r.qty}
                          onChange={(e) =>
                            onChangeRow(idx, { qty: e.target.value })
                          }
                          style={inputBase}
                        />
                      </div>

                      <div>
                        <div
                          style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}
                        >
                          Giá nhập
                        </div>
                        <input
                          value={m ? money(importPriceFromKho) : ""}
                          disabled
                          readOnly
                          placeholder="tự động"
                          style={{
                            ...readOnlyInput,
                            fontWeight: 900,
                          }}
                        />
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                          = {money(importPriceFromKho)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          onClick={() => onRemoveRow(idx)}
                          disabled={rows.length === 1}
                          style={{
                            border: "1px solid #e5e7eb",
                            background: "white",
                            borderRadius: 12,
                            padding: "10px 12px",
                            fontWeight: 900,
                            cursor:
                              rows.length === 1 ? "not-allowed" : "pointer",
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
                  background: "#f9fafb",
                  borderRadius: 12,
                  padding: "10px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                + Thêm dòng
              </button>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}
                  >
                    Nhà cung cấp / Đối tác
                  </div>
                  <input
                    value={partner}
                    disabled
                    readOnly
                    placeholder="tự động"
                    style={readOnlyInput}
                  />
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    {partner === "Nhiều nhà cung cấp"
                      ? "Bạn đang chọn nhiều mặt hàng thuộc nhiều NCC khác nhau."
                      : " "}
                  </div>
                </div>

                <div>
                  <div
                    style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}
                  >
                    Ghi chú (tuỳ chọn)
                  </div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={inputBase}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  Sau khi lưu, tồn kho sẽ tự động tăng trong “Kho hàng”.
                </div>

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #eef2f7",
                    borderRadius: 14,
                    padding: "10px 12px",
                    fontWeight: 950,
                  }}
                >
                  Tổng tiền phiếu: {money(draftTotalMoney)} đ
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
                  padding: "12px 16px",
                  fontWeight: 950,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Tạo phiếu nhập kho
              </button>
            </div>
          </div>

          {/* RIGHT – LỊCH SỬ PHIẾU */}
          <div
            style={{
              background: "white",
              borderRadius: 18,
              padding: 16,
              boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
              border: "1px solid rgba(229,231,235,0.9)",
              maxHeight: 640,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontWeight: 950, marginBottom: 4 }}>Lịch sử nhập gần đây</div>
            <div style={{ color: "#64748b", marginBottom: 12, fontSize: 13 }}>
              Sau khi tạo phiếu nhập, hệ thống sẽ tự tăng tồn kho trong “Kho hàng”.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                marginBottom: 10,
                alignItems: "center",
              }}
            >
              <input
                value={searchReceipt}
                onChange={(e) => setSearchReceipt(e.target.value)}
                placeholder="Tìm theo mã phiếu (VD: 6D90B1)"
                style={inputBase}
              />
              <button
                onClick={() => setSearchReceipt("")}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "white",
                  borderRadius: 12,
                  padding: "9px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Xoá
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
              {searchReceipt?.trim()
                ? `Kết quả: ${foundCount} phiếu`
                : `Tổng: ${history.length} phiếu`}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingRight: 4,
              }}
            >
              {filteredHistory.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  {searchReceipt?.trim()
                    ? "Không tìm thấy phiếu nào theo mã này."
                    : "Chưa có phiếu nhập nào."}
                </div>
              ) : (
                filteredHistory.map((h) => {
                  const { lines, totalQty, totalMoney } = calcReceiptSummary(h);
                  const code = pickReceiptCode(h);
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
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "baseline",
                        }}
                      >
                        <div style={{ fontWeight: 950 }}>Phiếu #{code}</div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>
                          {h.createdAt
                            ? new Date(h.createdAt).toLocaleString("vi-VN")
                            : ""}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 13,
                          color: "#334155",
                        }}
                      >
                        Đối tác: <b>{h.partner || h.supplier || "-"}</b>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: "#334155",
                        }}
                      >
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
                            fontSize: 13,
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL */}
      <Modal
        open={detailOpen}
        title={
          selectedReceipt
            ? `Chi tiết phiếu #${pickReceiptCode(selectedReceipt)}`
            : "Chi tiết phiếu"
        }
        onClose={closeDetail}
      >
        {!selectedReceipt ? null : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 900,
                  }}
                >
                  Đối tác
                </div>
                <div style={{ fontWeight: 950, marginTop: 4 }}>
                  {selectedReceipt.partner || selectedReceipt.supplier || "-"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 900,
                  }}
                >
                  Thời gian
                </div>
                <div style={{ fontWeight: 950, marginTop: 4 }}>
                  {selectedReceipt.createdAt
                    ? new Date(selectedReceipt.createdAt).toLocaleString("vi-VN")
                    : "-"}
                </div>
              </div>
            </div>

            {selectedReceipt.note ? (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 900,
                  }}
                >
                  Ghi chú
                </div>
                <div style={{ marginTop: 4 }}>{selectedReceipt.note}</div>
              </div>
            ) : null}

            <div style={{ borderTop: "1px solid #eef2f7", paddingTop: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10 }}>
                Danh sách mặt hàng
              </div>

              <div style={{ overflow: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th
                        style={{
                          borderBottom: "1px solid #eef2f7",
                          padding: "8px 8px",
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        Mặt hàng
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #eef2f7",
                          padding: "8px 8px",
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        SL
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #eef2f7",
                          padding: "8px 8px",
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        Giá nhập
                      </th>
                      <th
                        style={{
                          borderBottom: "1px solid #eef2f7",
                          padding: "8px 8px",
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
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
                      const qty = Number(
                        it?.soLuong ?? it?.qty ?? it?.quantity ?? 0
                      );
                      const price = Number(it?.giaNhap ?? it?.price ?? 0);
                      const lineTotal = qty * price;

                      return (
                        <tr key={idx}>
                          <td
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              padding: "10px 8px",
                              fontWeight: 900,
                            }}
                          >
                            {name}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              padding: "10px 8px",
                            }}
                          >
                            {qty}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              padding: "10px 8px",
                            }}
                          >
                            {money(price)}
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              padding: "10px 8px",
                              fontWeight: 950,
                            }}
                          >
                            {money(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #eef2f7",
                    borderRadius: 14,
                    padding: "10px 12px",
                    fontWeight: 950,
                  }}
                >
                  Tổng dòng: {selectedSummary.lines} • Tổng SL:{" "}
                  {selectedSummary.totalQty} • Tổng tiền:{" "}
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
