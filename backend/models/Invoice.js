// backend/models/Invoice.js
const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema(
  {
    // ✅ SỬA: ref đúng model vật liệu (thường là "Material")
    // Nếu project bạn model vật liệu tên khác, đổi lại cho khớp mongoose.model("<TÊN>")
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material", required: true },

    itemCode: { type: String, default: "" },
    itemName: { type: String, required: true },
    unit: { type: String, default: "" },

    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, trim: true },

    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerAddress: { type: String, default: "", trim: true },

    // ✅ giữ string để không phụ thuộc bảng nhân viên
    staffName: { type: String, default: "", trim: true },
    note: { type: String, default: "", trim: true },

    // tổng tiền
    total: { type: Number, required: true, min: 0 }, // tổng trước giảm
    discountRate: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAfterDiscount: { type: Number, default: 0, min: 0 },

    // loyalty
    pointsEarned: { type: Number, default: 0, min: 0 },
    // ✅ nên lưu mã hạng (SILVER/GOLD/...) thay vì tiếng Việt để xử lý ổn định
    rankApplied: { type: String, default: "SILVER" },

    items: { type: [InvoiceItemSchema], default: [] },

    /**
     * ✅ Không phá hệ thống cũ:
     * - createdBy (cũ) vẫn giữ (nếu bạn đã lưu rồi)
     * - thêm createdByUser / createdByEmployee để bạn dùng về sau tuỳ kiến trúc
     */

    // (cũ) nếu bạn đã dùng Employee thì vẫn OK
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },

    // (mới) nếu bạn muốn gắn theo tài khoản đăng nhập
    createdByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // (mới) nếu bạn muốn gắn theo nhân viên đã chọn từ /api/employees
    createdByEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
