const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const materialRoutes = require('./routes/materialRoutes');

const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.use('/api/materials', materialRoutes);

// connect DB + start server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 MONGODB_URI nạp vào =', MONGODB_URI);

async function start() {
  try {
    console.log('⏳ Đang kết nối MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // tối đa 5s, lỗi thì nhảy xuống catch
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }

  // Dù DB lỗi hay không vẫn start server để bạn test được port 5000
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

start();
