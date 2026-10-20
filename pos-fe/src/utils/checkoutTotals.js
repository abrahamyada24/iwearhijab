export const calculateCheckoutTotals = ({ subTotal, taxRate = 0, discountAmount = 0, discountType = 'amount', loyaltyDiscount = 0 }) => {
  const remaining = Math.max(0, subTotal - Math.max(0, Number(loyaltyDiscount) || 0));
  const value = Math.max(0, Number(discountAmount) || 0);
  const manual = Math.min(remaining, Math.round(discountType === 'percent' ? remaining * Math.min(100, value) / 100 : value));
  const discount = subTotal - remaining + manual;
  const taxAmount = Math.round(Math.max(0, subTotal - discount) * taxRate);
  return { discount, taxAmount, grandTotal: Math.max(0, subTotal - discount) + taxAmount };
};
