// backend/models/Customer.js
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },

    totalPoints: { type: Number, default: 0, min: 0 },

    // ✅ dùng mã rank để FE map đúng
    // SILVER: Đồng, GOLD: Bạc, PLATINUM: Vàng, DIAMOND: Kim cương
    rank: {
      type: String,
      enum: ["SILVER", "GOLD", "PLATINUM", "DIAMOND"],
      default: "SILVER",
      index: true,
    },

    lastPurchaseAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", CustomerSchema);
