const SUPPORTED_PAYMENT_TYPES = new Set(["CASH", "QRIS_MANUAL", "POINT"]);
const normalizePaymentType = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();
const resolvePaymentMethod = (value) => {
  const paymentType = normalizePaymentType(value);
  if (!SUPPORTED_PAYMENT_TYPES.has(paymentType))
    throw Object.assign(new Error("Metode pembayaran tidak didukung."), {
      code: "UNSUPPORTED_PAYMENT_METHOD",
    });
  return { paymentType, isGatewayPayment: false, isInstantPayment: true };
};
module.exports = { normalizePaymentType, resolvePaymentMethod };
