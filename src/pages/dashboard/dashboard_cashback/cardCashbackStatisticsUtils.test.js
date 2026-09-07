import test from "node:test";
import assert from "node:assert/strict";

import {
  filterCashbackItemsByDate,
  summarizeCashbackByName,
} from "./cardCashbackStatisticsUtils.js";

test("filterCashbackItemsByDate applies an inclusive creation-date range", () => {
  const items = [
    { id: 1, created_at: "2026-09-01T12:00:00Z" },
    { id: 2, created_at: "2026-09-02T12:00:00Z" },
    { id: 3, created_at: "2026-09-03T12:00:00Z" },
  ];

  assert.deepEqual(
    filterCashbackItemsByDate(items, "2026-09-01", "2026-09-02").map((item) => item.id),
    [1, 2],
  );
});

test("summarizeCashbackByName returns totals and statuses for every cashback name", () => {
  const summary = summarizeCashbackByName([
    { cashback_name: "Покупки", amount: 10.25, status: "Оплачено" },
    { cashback_name: "Покупки", cashback_amount: 2.5, status: "Ошибка АБС" },
    { cashback_name: "Транспорт", amount: 4, status: "" },
    { cashback_name: "Транспорт", amount: 1, status: "Возвращено" },
  ]);

  assert.deepEqual(summary, [
    {
      name: "Покупки",
      count: 2,
      totalAmount: 12.75,
      paidCount: 1,
      processingCount: 0,
      errorCount: 1,
      returnedCount: 0,
    },
    {
      name: "Транспорт",
      count: 2,
      totalAmount: 5,
      paidCount: 0,
      processingCount: 1,
      errorCount: 0,
      returnedCount: 1,
    },
  ]);
});
