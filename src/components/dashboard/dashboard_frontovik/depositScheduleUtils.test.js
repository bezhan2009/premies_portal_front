import test from "node:test";
import assert from "node:assert/strict";
import { buildDepositScheduleRows } from "./depositScheduleUtils.js";

const point = (date, longName = "Вознаграждение по депозиту") => ({
  calculatingDate: date,
  longName,
  planAmount: "1,00",
});

test("deposit schedule is chronological for ISO dates", () => {
  const rows = buildDepositScheduleRows([
    point("2026-08-21"),
    point("2024-11-21"),
    point("2025-01-21"),
  ], new Date("2025-01-01T00:00:00Z"));

  assert.deepEqual(rows.map((row) => row.date), [
    "2024-11-21",
    "2025-01-21",
    "2026-08-21",
  ]);
});

test("deposit schedule is chronological for DD.MM.YYYY dates and groups by day", () => {
  const rows = buildDepositScheduleRows([
    point("21.08.2026 10:00:00"),
    point("21.11.2024 09:00:00"),
    point("21.11.2024 17:00:00", "Подоходного налога"),
    point("21.01.2025 10:00:00"),
  ], new Date("2025-01-01T00:00:00Z"));

  assert.deepEqual(rows.map((row) => row.date), [
    "21.11.2024",
    "21.01.2025",
    "21.08.2026",
  ]);
  assert.equal(rows[0].tax, 1);
});

test("deposit schedule accepts the existing ABS graphs response fields", () => {
  const rows = buildDepositScheduleRows([
    { PaymentDate: "2026-09-01", Code: "DEP_INTER", Amount: "120.50" },
    { PaymentDate: "2026-09-01", Code: "DEP_TAX", Amount: "14.46" },
    { PaymentDate: "2026-09-01", Code: "DEP_PAY", Amount: "106.04" },
  ], new Date("2026-08-17T00:00:00Z"));

  assert.deepEqual(rows, [{
    date: "2026-09-01",
    calculatedIncome: 120.5,
    tax: 14.46,
    income: 106.04,
    status: "Ожидается",
  }]);
});
