import React, { useEffect, useState } from "react";

const empty = {
  tenVatLieu: "",
  maVatLieu: "",
  loai: "",
  donViTinh: "",
  giaNhap: "",
  giaBan: "",
  soLuongTon: "",
  nhaCungCap: "",
  thoiGianGiaoHang: "",
  ghiChu: "",
};

export default function MaterialForm({ initialData, onSubmit, onReset }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (initialData) {
      setForm({
        tenVatLieu: initialData.tenVatLieu ?? "",
        maVatLieu: initialData.maVatLieu ?? "",
        loai: initialData.loai ?? "",
        donViTinh: initialData.donViTinh ?? "",
        giaNhap: initialData.giaNhap ?? "",
        giaBan: initialData.giaBan ?? "",
        soLuongTon: initialData.soLuongTon ?? "",
        nhaCungCap: initialData.nhaCungCap ?? "",
        thoiGianGiaoHang: initialData.thoiGianGiaoHang ?? "",
        ghiChu: initialData.ghiChu ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [initialData]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    // ép kiểu số cho backend
    const payload = {
      ...form,
      giaNhap: form.giaNhap === "" ? "" : Number(form.giaNhap),
      giaBan: form.giaBan === "" ? "" : Number(form.giaBan),
      soLuongTon: form.soLuongTon === "" ? "" : Number(form.soLuongTon),
      thoiGianGiaoHang:
        form.thoiGianGiaoHang === "" ? "" : Number(form.thoiGianGiaoHang),
    };

    onSubmit(payload);
  };

  const handleReset = () => {
    setForm(empty);
    onReset?.();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* grid form chuyên nghiệp */}
      <div className="ttq-formGrid">
        <div>
          <label className="ttq-label">
            Tên vật liệu <span style={{ color: "#b91c1c" }}>*</span>
          </label>
          <input
            className="ttq-input"
            value={form.tenVatLieu}
            onChange={set("tenVatLieu")}
            placeholder="Ví dụ: Xi măng Hà Tiên"
          />
        </div>

        <div>
          <label className="ttq-label">
            Mã vật liệu <span style={{ color: "#b91c1c" }}>*</span>
          </label>
          <input
            className="ttq-input"
            value={form.maVatLieu}
            onChange={set("maVatLieu")}
            placeholder="Ví dụ: VL001"
          />
        </div>

        <div>
          <label className="ttq-label">Loại</label>
          <input
            className="ttq-input"
            value={form.loai}
            onChange={set("loai")}
            placeholder="Xi măng / Cát / Đá / Sắt..."
          />
        </div>

        <div>
          <label className="ttq-label">Đơn vị tính</label>
          <input
            className="ttq-input"
            value={form.donViTinh}
            onChange={set("donViTinh")}
            placeholder="kg, bao, m3..."
          />
        </div>

        <div>
          <label className="ttq-label">Giá nhập</label>
          <input
            className="ttq-input"
            type="number"
            value={form.giaNhap}
            onChange={set("giaNhap")}
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="ttq-label">Giá bán</label>
          <input
            className="ttq-input"
            type="number"
            value={form.giaBan}
            onChange={set("giaBan")}
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="ttq-label">Số lượng tồn</label>
          <input
            className="ttq-input"
            type="number"
            value={form.soLuongTon}
            onChange={set("soLuongTon")}
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <label className="ttq-label">Nhà cung cấp</label>
          <input
            className="ttq-input"
            value={form.nhaCungCap}
            onChange={set("nhaCungCap")}
            placeholder="Tên NCC"
          />
        </div>

        <div className="ttq-span2">
          <label className="ttq-label">Thời gian giao hàng (ngày)</label>
          <input
            className="ttq-input"
            type="number"
            value={form.thoiGianGiaoHang}
            onChange={set("thoiGianGiaoHang")}
            placeholder="0"
            min="0"
          />
        </div>

        <div className="ttq-span2">
          <label className="ttq-label">Ghi chú</label>
          <textarea
            className="ttq-textarea"
            value={form.ghiChu}
            onChange={set("ghiChu")}
            placeholder="Ghi chú thêm nếu cần..."
          />
        </div>
      </div>

      {/* action buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="ttq-btn" type="submit">
          {initialData ? "Cập nhật" : "Thêm mới"}
        </button>

        <button className="ttq-btnOutline" type="button" onClick={handleReset}>
          Xóa form
        </button>
      </div>
    </form>
  );
}
