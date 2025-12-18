const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    username: { type: String, trim: true }, // nếu muốn
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    note: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // nếu bạn có User model
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
