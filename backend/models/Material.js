const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema(
  {
    tenVatLieu: { type: String, required: true },
    maVatLieu: { type: String, required: true, unique: true },
    loai: { type: String }, // xi măng, cát, thép, gạch,...
    donViTinh: { type: String, default: 'kg' }, // kg, tấn, m3, viên,...
    giaNhap: { type: Number, required: true },
    giaBan: { type: Number },
    soLuongTon: { type: Number, default: 0 },
    nhaCungCap: { type: String }, // sau có thể tách ra thành collection NhaCungCap
    thoiGianGiaoHang: { type: Number }, // số ngày lead time
    ghiChu: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Material', materialSchema);
