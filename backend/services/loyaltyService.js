// backend/services/loyaltyService.js
const Customer = require("../models/Customer");
const {
  MIN_BILL,
  normalizeRank,
  getRankByPoints,
  getBenefits,
  calcEarnedPoints,
} = require("./loyalty");

/**
 * Áp dụng tích điểm + cập nhật rank cho khách hàng sau khi tạo hoá đơn.
 * - Chỉ chạy khi có customerId
 * - Chỉ tích điểm khi totalAfterDiscount >= 100k
 */
async function applyLoyaltyAfterInvoice({ customerId, totalAfterDiscount }) {
  if (!customerId) return null;

  const customer = await Customer.findById(customerId);
  if (!customer) return null;

  const total = Number(totalAfterDiscount || 0);

  // cập nhật lần mua cuối (dù có tích điểm hay không)
  customer.lastPurchaseAt = new Date();

  if (total < MIN_BILL) {
    // vẫn normalize rank theo điểm hiện có
    customer.rank = normalizeRank(customer.rank, customer.totalPoints);
    await customer.save();
    return { customer, pointsEarned: 0 };
  }

  // rank hiện tại (chuẩn hoá)
  const currentRank = normalizeRank(customer.rank, customer.totalPoints);

  // điểm kiếm được theo rank hiện tại
  const pointsEarned = calcEarnedPoints(currentRank, total);

  customer.totalPoints = Number(customer.totalPoints || 0) + Number(pointsEarned || 0);

  // ✅ rank mới theo tổng điểm sau khi cộng
  customer.rank = getRankByPoints(customer.totalPoints);

  await customer.save();

  return { customer, pointsEarned, rankBefore: currentRank, rankAfter: customer.rank };
}

module.exports = { applyLoyaltyAfterInvoice };
