// src/components/MaterialTable.jsx
import React from 'react';

const MaterialTable = ({ materials, loading, onEdit, onDelete }) => {
  if (loading) return <p>Đang tải dữ liệu...</p>;
  if (!materials.length) return <p>Chưa có vật liệu nào.</p>;

  return (
    <div className="card">
      <h2>Danh sách vật liệu</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên vật liệu</th>
              <th>Loại</th>
              <th>Đơn vị</th>
              <th>Giá nhập</th>
              <th>Giá bán</th>
              <th>SL tồn</th>
              <th>Nhà cung cấp</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m._id}>
                <td>{m.maVatLieu}</td>
                <td>{m.tenVatLieu}</td>
                <td>{m.loai}</td>
                <td>{m.donViTinh}</td>
                <td>{m.giaNhap?.toLocaleString('vi-VN')}</td>
                <td>{m.giaBan?.toLocaleString('vi-VN')}</td>
                <td>{m.soLuongTon}</td>
                <td>{m.nhaCungCap}</td>
                <td>
                  <button onClick={() => onEdit(m)}>Sửa</button>
                  <button onClick={() => onDelete(m._id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialTable;
