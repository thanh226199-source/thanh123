// backend/models/Customer.js
const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema(
  {
    // ✅ OWNER – tách dữ liệu theo tài khoản
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },

    // ❗ KHÔNG unique global – sẽ unique theo owner + phone
    phone: { type: String, trim: true, default: "" },

    address: { type: String, trim: true, default: "" },

    totalPoints: { type: Number, default: 0, min: 0 },

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

// ✅ cùng SĐT nhưng KHÁC user vẫn được
CustomerSchema.index({ owner: 1, phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Customer", CustomerSchema);
