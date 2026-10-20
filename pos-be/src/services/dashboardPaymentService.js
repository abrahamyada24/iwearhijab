const paymentBreakdownFor = (transactions) => {
  const result = {
    cash: 0,
    qris: 0,
    point: 0,
    cashCount: 0,
    qrisCount: 0,
    pointCount: 0,
  };
  for (const transaction of transactions) {
    for (const [key, types] of Object.entries({
      cash: ["CASH"],
      qris: ["QRIS", "QRIS_MANUAL"],
      point: ["POINT"],
    })) {
      const payments = (transaction.payments || []).filter((payment) =>
        types.includes(payment.paymentType),
      );
      if (payments.length) {
        result[key] += payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0,
        );
        result[`${key}Count`] += 1;
      }
    }
  }
  return result;
};
module.exports = { paymentBreakdownFor };
