// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// ===== ROUTES =====
const authRoutes = require("./routes/authRoutes");
const materialRoutes = require("./routes/materialRoutes");
const stockRoutes = require("./routes/stockRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

// ✅ NEW – loyalty
const customerRoutes = require("./routes/customerRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");

// ✅ NEW – reports (báo cáo + export excel)
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// ===== MONGO CONFIG =====
mongoose.set("strictQuery", true);

// ===== CORS CONFIG =====
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Postman / curl không có origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // ✅ thêm vài header hay gặp khi download file
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  // ✅ để browser thấy filename khi download (Content-Disposition)
  exposedHeaders: ["Content-Disposition"],
};

// ===== MIDDLEWARE =====
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.send("✅ API running");
});

// ===== API ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/invoices", invoiceRoutes);

// ✅ loyalty
app.use("/api/customers", customerRoutes);
app.use("/api/loyalty", loyaltyRoutes);

// ✅ reports
app.use("/api/reports", reportRoutes);

// ===== ERROR HANDLER (QUAN TRỌNG) =====
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);

  if (String(err.message).includes("Not allowed by CORS")) {
    return res.status(403).json({ message: err.message });
  }

  // ✅ nếu response đã gửi rồi thì để express handle tiếp
  if (res.headersSent) return next(err);

  return res.status(500).json({
    message: err?.message || "Internal Server Error",
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

async function start() {
  try {
    if (!MONGODB_URI) {
      console.error("❌ Thiếu MONGODB_URI trong backend/.env");
      process.exit(1);
    }

    console.log("⏳ Connecting MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

start();
