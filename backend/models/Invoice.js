// backend/models/Invoice.js
const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    itemCode: { type: String, default: "" },
    itemName: { type: String, required: true },
    unit: { type: String, default: "" },

    qty: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    // ✅ tách dữ liệu theo user đăng nhập
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    invoiceNo: { type: String, required: true, trim: true },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerAddress: { type: String, default: "", trim: true },

    note: { type: String, default: "" },
    staffName: { type: String, default: "" },

    total: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalPay: { type: Number, default: 0 },

    items: { type: [invoiceItemSchema], default: [] },

    createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ tránh trùng số hóa đơn trong cùng 1 owner
invoiceSchema.index({ owner: 1, invoiceNo: 1 }, { unique: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
