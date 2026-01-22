const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tenVatLieu: { type: String, required: true, trim: true },

    // ✅ chuẩn hóa mã: trim + uppercase để tránh C01 vs c01
    maVatLieu: {
      type: String,
      required: true,
      trim: true,
      set: (v) => String(v || "").trim().toUpperCase(),
    },

    // ✅ thêm default để tránh undefined
    loai: { type: String, trim: true, default: "" },
    donViTinh: { type: String, default: "kg", trim: true },

    giaNhap: { type: Number, required: true, min: 0 },
    giaBan: { type: Number, default: 0, min: 0 },
    soLuongTon: { type: Number, default: 0, min: 0 },

    nhaCungCap: { type: String, trim: true, default: "" },
    thoiGianGiaoHang: { type: Number, default: 0, min: 0 },
    ghiChu: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    strict: true,       // ✅ giữ như bạn
    strictQuery: true,  // ✅ khuyến nghị thêm (an toàn khi query)
  }
);

// ✅ unique theo từng tài khoản
materialSchema.index({ owner: 1, maVatLieu: 1 }, { unique: true });

module.exports = mongoose.model("Material", materialSchema);
