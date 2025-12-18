const mongoose = require("mongoose");

const StockTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["IN", "OUT"], required: true }, // IN: nhập, OUT: xuất
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },

    qty: { type: Number, required: true, min: 1 },

    // giá nhập / giá xuất (tuỳ bạn)
    unitPrice: { type: Number, default: 0 },

    // ghi chú, đối tác
    note: { type: String, default: "" },
    partner: { type: String, default: "" }, // nhà cung cấp / khách hàng

    // người thực hiện (lấy từ token)
    createdBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockTransaction", StockTransactionSchema);
