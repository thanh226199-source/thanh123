// backend/scripts/setAdmin.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.log("Usage: node scripts/setAdmin.js <username>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const result = await User.updateOne(
    { username: username.trim() },
    { $set: { role: "admin" } }
  );

  console.log("✅ Update result:", result);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
