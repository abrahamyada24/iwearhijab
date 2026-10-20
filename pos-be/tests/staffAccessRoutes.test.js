const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
process.env.DATABASE_URL = "mysql://unused:unused@127.0.0.1:1/unused";
const expenseRoutes = require("../src/routes/expenseRoutes");
const reportRoutes = require("../src/routes/reportRoutes");
test("Staff ditolak oleh API pengeluaran dan laporan finansial sebelum mengakses database", async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 1, role: "CASHIER" };
    req.authSession = { id: "fixture" };
    req.storeId = 1;
    next();
  });
  app.use("/expenses", expenseRoutes);
  app.use("/reports", reportRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    for (const [method, path] of [
      ["GET", "/expenses"],
      ["POST", "/expenses"],
      ["DELETE", "/expenses/1"],
      ["GET", "/reports/profit-loss"],
      ["GET", "/reports/by-category"],
      ["GET", "/reports/export"],
    ]) {
      const res = await fetch(
        `http://127.0.0.1:${server.address().port}${path}`,
        { method },
      );
      assert.equal(res.status, 403, `${method} ${path}`);
    }
    assert.equal(
      (await fetch(`http://127.0.0.1:${server.address().port}/reports/returns`))
        .status,
      404,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
