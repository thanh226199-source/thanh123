// cấu hình để FE render + backend có thể tái sử dụng
module.exports = {
  minBillToApply: 100000, // chỉ áp dụng tích điểm/ưu đãi khi đơn >= 100k
  base: { vndPerPoint: 1000 },

  tiers: [
    {
      key: "SILVER",
      name: "Đồng (Silver)",
      minPoints: 0,
      maxPoints: 999,
      discountRate: 0,
      bonusRate: 0, // +0%
      benefits: ["Không giảm giá trực tiếp", "Tích điểm cơ bản"],
      example: { bill: 250000 },
    },
    {
      key: "GOLD",
      name: "Bạc (Gold)",
      minPoints: 1000,
      maxPoints: 4999,
      discountRate: 0.05,
      bonusRate: 0.10, // +10%
      benefits: ["Giảm 5% tổng hoá đơn (đơn ≥ 100.000)", "Tích điểm +10%"],
      example: { bill: 200000 },
    },
    {
      key: "PLATINUM",
      name: "Vàng (Platinum)",
      minPoints: 5000,
      maxPoints: 9999,
      discountRate: 0.07,
      bonusRate: 0.20, // +20%
      benefits: ["Giảm 7% tổng hoá đơn (đơn ≥ 100.000)", "Tích điểm +20%"],
      example: { bill: 300000 },
    },
    {
      key: "DIAMOND",
      name: "Kim cương (Diamond)",
      minPoints: 10000,
      maxPoints: 999999999,
      discountRate: 0.10,
      bonusRate: 0.30, // +30%
      benefits: ["Giảm 10% tổng hoá đơn (đơn ≥ 100.000)", "Tích điểm +30%", "Ưu tiên khuyến mãi/quà sinh nhật"],
      example: { bill: 500000 },
    },
  ],
};

// Gợi ý công thức (để FE hiển thị):
// discount = bill * discountRate (nếu bill >= minBillToApply)
// billAfter = bill - discount
// pointsBase = floor(billAfter / vndPerPoint)
// pointsEarned = floor(pointsBase * (1 + bonusRate))
// Rank lên theo totalPoints (cộng dồn, không reset)
