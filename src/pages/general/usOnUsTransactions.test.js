import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUsOnUsStatementUrl,
  normalizeUsOnUsTransactions,
  US_ON_US_ACCOUNT,
} from "./usOnUsTransactions.js";

test("statement URL changes only dates and requested account prefix", () => {
  const url = new URL(
    buildUsOnUsStatementUrl(
      "2026-09-04T00:00",
      "2026-09-04T23:59",
      "20216972",
    ),
    "http://localhost",
  );

  assert.equal(url.pathname, "/api/atm/services/stmnt_ac.php");
  assert.equal(url.searchParams.get("acc"), US_ON_US_ACCOUNT);
  assert.equal(url.searchParams.get("dt1"), "2026-09-04");
  assert.equal(url.searchParams.get("dt2"), "2026-09-04");
  assert.equal(url.searchParams.get("trn_acc_code"), "20216972");
  assert.equal(url.searchParams.get("descr"), "Оплата");
});

test("two statements are merged, normalized and sorted newest first", () => {
  const rows = normalizeUsOnUsTransactions([
    [
      {
        id: "1",
        doper: "20.08.26",
        sdok: "10.50",
        val_code: "TJS",
        txt_pay: "Отправитель 1",
      },
    ],
    [
      {
        id: "2",
        doper: "21.08.26",
        sdok: "44.55",
        val_code: "TJS",
        txt_ben: "Получатель 2",
      },
    ],
  ]);

  assert.deepEqual(
    rows.map((row) => row.id),
    ["2", "1"],
  );
  assert.equal(rows[0].amount, 44.55);
  assert.equal(rows[0].currency, "TJS");
  assert.equal(rows[0].status, "success");
});
