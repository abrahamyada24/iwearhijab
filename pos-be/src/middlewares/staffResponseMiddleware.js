// Sensitive financial fields must not leave the API in a staff session.
const PRIVATE_FIELDS = new Set([
  "costPrice",
  "totalProfit",
  "grossProfit",
  "netProfit",
  "totalExpenses",
  "cashExpenses",
  "expenses",
  "expenseBreakdown",
  "profit",
  "cogs",
]);
const sanitizeStaffData = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeStaffData);
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Date ||
    typeof value.toJSON === "function"
  )
    return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_FIELDS.has(key))
      .map(([key, item]) => [key, sanitizeStaffData(item)]),
  );
};
const restrictStaffResponse = (req, res, next) => {
  if (req.user?.role === "CASHIER") {
    const json = res.json.bind(res);
    res.json = (body) => json(sanitizeStaffData(body));
  }
  next();
};
module.exports = { sanitizeStaffData, restrictStaffResponse };
