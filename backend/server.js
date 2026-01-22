// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// routes
const authRoutes = require("./routes/authRoutes");
const materialRoutes = require("./routes/materialRoutes");
const stockRoutes = require("./routes/stockRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const customerRoutes = require("./routes/customerRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();
mongoose.set("strictQuery", true);

// Nếu dùng CRA proxy thì CORS “thoáng” cũng ok khi dev
app.use(
  cors({
    origin: true, // tự phản hồi đúng origin
    credentials: true,
  })
);
app.options("*", cors({ origin: true, credentials: true }));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("✅ API running"));

app.use("/api/auth", authRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/reports", reportRoutes);

app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  if (res.headersSent) return next(err);
  res.status(err.statusCode || 500).json({ message: err?.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

(async function start() {
  try {
    if (!MONGODB_URI) {
      console.error("❌ Thiếu MONGODB_URI trong backend/.env");
      process.exit(1);
    }

    console.log("⏳ Connecting MongoDB...");

    // TIP: thêm timeout + ưu tiên IPv4 để đỡ lỗi mạng/DNS
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      family: 4,
    });

    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
})();
