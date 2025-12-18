import React from "react";

/* format số -> VND */
const fmtMoney = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  return Number(v).toLocaleString("vi-VN");
};

export default function MaterialTable({ rows, onEdit, onDelete }) {
  if (!rows?.length) {
    return <div className="ttq-empty">Chưa có vật liệu.</div>;
  }

  return (
    <table className="ttq-table">
      <thead>
        <tr>
          <th className="ttq-col-ma">Mã</th>
          <th className="ttq-col-ten">Tên vật liệu</th>
          <th className="ttq-col-loai ttq-hide-md">Loại</th>
          <th className="ttq-col-dvt ttq-hide-md">ĐVT</th>
          <th className="ttq-col-gianhap ttq-right">Giá nhập</th>
          <th className="ttq-col-giaban ttq-right">Giá bán</th>
          <th className="ttq-col-slt ttq-right">Tồn</th>
          <th className="ttq-col-ncc">Nhà cung cấp</th>
          <th className="ttq-col-actions ttq-center">Thao tác</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((m) => (
          <tr key={m._id}>
            {/* Mã */}
            <td className="ttq-col-ma ttq-mono">{m.maVatLieu}</td>

            {/* Tên */}
            <td className="ttq-col-ten">
              <div className="ttq-wrap" title={m.tenVatLieu}>
                {m.tenVatLieu}
              </div>
            </td>

            {/* Loại */}
            <td className="ttq-col-loai ttq-hide-md">
              <div className="ttq-wrap" title={m.loai}>
                {m.loai || "-"}
              </div>
            </td>

            {/* ĐVT */}
            <td className="ttq-col-dvt ttq-hide-md">
              {m.donViTinh || "-"}
            </td>

            {/* Giá nhập */}
            <td className="ttq-col-gianhap ttq-right ttq-mono">
              {fmtMoney(m.giaNhap)}
            </td>

            {/* Giá bán */}
            <td className="ttq-col-giaban ttq-right ttq-mono">
              {fmtMoney(m.giaBan)}
            </td>

            {/* Số lượng */}
            <td className="ttq-col-slt ttq-right ttq-mono">
              {fmtMoney(m.soLuongTon)}
            </td>

            {/* NCC */}
            <td className="ttq-col-ncc">
              <div className="ttq-wrap" title={m.nhaCungCap}>
                {m.nhaCungCap || "-"}
              </div>
            </td>

            {/* Actions */}
            <td className="ttq-col-actions ttq-center">
              <div className="ttq-row-actions">
                <button
                  type="button"
                  className="ttq-btn-sm"
                  onClick={() => onEdit(m)}
                >
                  Sửa
                </button>

                <button
                  type="button"
                  className="ttq-btn-sm ttq-btn-sm-danger"
                  onClick={() => onDelete(m._id)}
                >
                  Xóa
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
