// backend/services/loyalty.js
const MIN_BILL = 100000;

const RANKS = ["SILVER", "GOLD", "PLATINUM", "DIAMOND"];

function getRankByPoints(totalPoints = 0) {
  const p = Number(totalPoints || 0);
  if (p >= 10000) return "DIAMOND";
  if (p >= 5000) return "PLATINUM";
  if (p >= 1000) return "GOLD";
  return "SILVER";
}

function normalizeRank(input, totalPoints = 0) {
  if (!input) return getRankByPoints(totalPoints);
  if (RANKS.includes(input)) return input;

  const s = String(input).toLowerCase();
  if (s.includes("kim")) return "DIAMOND";
  if (s.includes("vàng") || s.includes("vang")) return "PLATINUM";
  if (s.includes("bạc") || s.includes("bac")) return "GOLD";
  if (s.includes("đồng") || s.includes("dong")) return "SILVER";

  return getRankByPoints(totalPoints);
}

function getBenefits(rank) {
  switch (rank) {
    case "GOLD": // Bạc
      return { discountRate: 0.05, pointMul: 1.1 };
    case "PLATINUM": // Vàng
      return { discountRate: 0.07, pointMul: 1.2 };
    case "DIAMOND": // Kim cương
      return { discountRate: 0.1, pointMul: 1.3 };
    default: // SILVER (Đồng)
      return { discountRate: 0, pointMul: 1.0 };
  }
}

function calcDiscountRate(rank, totalBefore) {
  if (Number(totalBefore || 0) < MIN_BILL) return 0;
  return getBenefits(rank).discountRate;
}

function calcEarnedPoints(rank, totalAfterDiscount) {
  const t = Number(totalAfterDiscount || 0);
  if (t < MIN_BILL) return 0;
  const { pointMul } = getBenefits(rank);
  return Math.floor((t / 1000) * pointMul);
}

module.exports = {
  MIN_BILL,
  RANKS,
  getRankByPoints,
  normalizeRank,
  getBenefits,
  calcDiscountRate,
  calcEarnedPoints,
};
