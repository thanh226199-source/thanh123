const mongoose = require("mongoose");

const StockOutItemSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },
    maVatLieu: { type: String, default: "" },
    tenVatLieu: { type: String, default: "" },
    soLuong: { type: Number, required: true },
    giaXuat: { type: Number, default: 0 },
  },
  { _id: false }
);

const StockOutSchema = new mongoose.Schema(
  {
    partner: { type: String, default: "" },   // khách hàng/công trình
    note: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    items: { type: [StockOutItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockOut", StockOutSchema);
