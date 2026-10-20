// Reward prices always come from the server-priced checkout lines.
const calculateRewardRedemption = ({ lines, points, customer, config }) => {
  const count = lines.reduce((sum, line) => {
    const qty = Number(line.loyaltyRewardQty ?? 0);
    if (!Number.isSafeInteger(qty) || qty < 0 || qty > line.qty)
      throw new Error("Jumlah produk gratis tidak valid.");
    return sum + qty;
  }, 0);
  const pointsPerReward = Number(config?.minRedemptionPoints);
  const redeemed = Number(points ?? 0);
  if (!Number.isSafeInteger(redeemed) || redeemed < 0)
    throw new Error("Jumlah poin tidak valid.");
  if (count === 0 && redeemed === 0)
    return { points: 0, discount: 0, count: 0 };
  if (
    !customer ||
    !config?.isActive ||
    !Number.isSafeInteger(pointsPerReward) ||
    pointsPerReward < 1
  )
    throw new Error(
      "Penukaran poin membutuhkan member dan program poin aktif.",
    );
  if (
    redeemed !== count * pointsPerReward ||
    redeemed > Number(customer.points)
  )
    throw new Error(
      "Saldo poin tidak cukup atau kalkulasi penukaran tidak sesuai.",
    );
  return {
    points: redeemed,
    count,
    discount: lines.reduce(
      (sum, line) =>
        sum + Number(line.price) * Number(line.loyaltyRewardQty || 0),
      0,
    ),
  };
};
module.exports = { calculateRewardRedemption };
