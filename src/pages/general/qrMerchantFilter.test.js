import assert from "node:assert/strict";
import { test } from "node:test";

import { filterQrTransactions, merchantTitle } from "./qrMerchantFilter.js";

const merchants = new Map([
  ["A1", "Тарабхона - Моиди Пурнеъмат"],
  ["B2", "Магазин Сомон"],
]);
const rows = [
  { id: 1, merchant_code: "A1", terminal_code: "38754" },
  { id: 2, merchant_code: "B2", terminal_code: "99999" },
];

test("merchant name finds the displayed merchant and composes with other filters", () => {
  assert.deepEqual(
    filterQrTransactions(rows, { merchant_name: "  моиди ПУРНЕЪМАТ ", terminal_code: "387" }, merchants).map((row) => row.id),
    [1],
  );
  assert.deepEqual(filterQrTransactions(rows, { merchant_name: "магазин" }, merchants).map((row) => row.id), [2]);
  assert.deepEqual(filterQrTransactions(rows, { merchant_name: "нет такого" }, merchants), []);
});

test("displayed merchant label and filter use the same fallback", () => {
  assert.equal(merchantTitle(rows[0], merchants), "Тарабхона - Моиди Пурнеъмат");
  assert.equal(merchantTitle({ merchant_code: "X" }, merchants), "X");
  assert.equal(merchantTitle({}, merchants), "—");
  assert.deepEqual(filterQrTransactions(rows, {}, merchants), rows);
});
