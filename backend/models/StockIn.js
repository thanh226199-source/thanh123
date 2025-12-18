const mongoose = require("mongoose");

const StockInItemSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    maVatLieu: { type: String },
    tenVatLieu: { type: String },
    soLuong: { type: Number, required: true, min: 1 },
    giaNhap: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StockInSchema = new mongoose.Schema(
  {
    code: { type: String, default: "" }, // mã phiếu (tuỳ bạn)
    partner: { type: String, default: "" }, // nhà cung cấp / đối tác
    note: { type: String, default: "" },
    createdBy: { type: String, default: "" }, // username
    items: { type: [StockInItemSchema], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockIn", StockInSchema);
    