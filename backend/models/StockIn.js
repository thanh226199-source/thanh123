const mongoose = require("mongoose");

const StockInItemSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    maVatLieu: { type: String },
    tenVatLieu: { type: String },
    soLuong: { type: Number, required: true, min: 1 },
    giaNhap: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StockInSchema = new mongoose.Schema(
  {
    // ✅ BẮT BUỘC: tách dữ liệu theo tài khoản
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    code: { type: String, default: "" }, // mã phiếu (tuỳ bạn)
    partner: { type: String, default: "" }, // nhà cung cấp / đối tác
    note: { type: String, default: "" },

    // ❌ không dùng username (dễ trùng)
    // ✅ dùng userId cho đồng bộ toàn hệ thống
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: { type: [StockInItemSchema], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockIn", StockInSchema);
