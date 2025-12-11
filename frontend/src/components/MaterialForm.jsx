// src/components/MaterialForm.jsx
import React from 'react';

const MaterialForm = ({
  form,
  onChange,
  onSubmit,
  onCancelEdit,
  editingId,
  errorMsg,
}) => {
  return (
    <div className="card">
      <h2>{editingId ? 'Sửa vật liệu' : 'Thêm vật liệu mới'}</h2>

      {errorMsg && <div className="alert error">{errorMsg}</div>}

      <form onSubmit={onSubmit}>
        <div className="grid">
          <div>
            <label>Tên vật liệu *</label>
            <input
              name="tenVatLieu"
              value={form.tenVatLieu}
              onChange={onChange}
            />
          </div>

          <div>
            <label>Mã vật liệu *</label>
            <input
              name="maVatLieu"
              value={form.maVatLieu}
              onChange={onChange}
              disabled={!!editingId}
            />
          </div>

          <div>
            <label>Loại</label>
            <input name="loai" value={form.loai} onChange={onChange} />
          </div>

          <div>
            <label>Đơn vị tính</label>
            <input
              name="donViTinh"
              value={form.donViTinh}
              onChange={onChange}
              placeholder="kg, bao, m3..."
            />
          </div>

          <div>
            <label>Giá nhập *</label>
            <input
              type="number"
              name="giaNhap"
              value={form.giaNhap}
              onChange={onChange}
            />
          </div>

          <div>
            <label>Giá bán</label>
            <input
              type="number"
              name="giaBan"
              value={form.giaBan}
              onChange={onChange}
            />
          </div>

          <div>
            <label>Số lượng tồn</label>
            <input
              type="number"
              name="soLuongTon"
              value={form.soLuongTon}
              onChange={onChange}
            />
          </div>

          <div>
            <label>Nhà cung cấp</label>
            <input
              name="nhaCungCap"
              value={form.nhaCungCap}
              onChange={onChange}
            />
          </div>

          <div>
            <label>Thời gian giao hàng (ngày)</label>
            <input
              type="number"
              name="thoiGianGiaoHang"
              value={form.thoiGianGiaoHang}
              onChange={onChange}
            />
          </div>

          <div className="full">
            <label>Ghi chú</label>
            <textarea
              name="ghiChu"
              value={form.ghiChu}
              onChange={onChange}
              rows={2}
            />
          </div>
        </div>

        <div className="actions">
          <button type="submit">
            {editingId ? 'Lưu thay đổi' : 'Thêm mới'}
          </button>
          {editingId && (
            <button type="button" onClick={onCancelEdit}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MaterialForm;
