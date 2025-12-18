const mongoose = require("mongoose");
require("dotenv").config();

const Customer = require("../models/Customer");
const { getRankByPoints } = require("../services/loyalty");

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Mongo connected");

    const customers = await Customer.find();

    for (const c of customers) {
      const oldRank = c.rank;
      const newRank = getRankByPoints(c.totalPoints || 0);

      c.rank = newRank;
      await c.save();

      console.log(
        `👤 ${c.name} | ${c.totalPoints} điểm | ${oldRank} → ${newRank}`
      );
    }

    console.log("✅ Migrated ranks:", customers.length);
    process.exit(0);
  } catch (e) {
    console.error("❌ Migrate failed:", e);
    process.exit(1);
  }
})();
