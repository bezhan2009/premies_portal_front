import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFrontovikTabs,
  findPosAccountBalance,
  historyAtmIds,
  isLatestClientProductRequest,
  selectionState,
} from "./posTerminalUtils.js";

test("POS tab is conditional and follows deposits", () => {
  assert.deepEqual(buildFrontovikTabs([]).map(({ key }) => key), [
    "cards",
    "credits",
    "accounts",
    "deposits",
    "info",
  ]);
  assert.deepEqual(buildFrontovikTabs([{ atm_id: "1" }]).map(({ key }) => key), [
    "cards",
    "credits",
    "accounts",
    "deposits",
    "pos",
    "info",
  ]);
});

test("POS tab does not collapse terminals with identical non-ATM fields", () => {
  const terminals = [
    { atm_id: "1", account_number: "same", address: "same" },
    { atm_id: "2", account_number: "same", address: "same" },
    { atm_id: "3", account_number: "same", address: "same" },
  ];
  assert.equal(buildFrontovikTabs(terminals).find(({ key }) => key === "pos")?.count, 3);
});

test("account balance lookup matches complete account strings", () => {
  const accounts = [
    { Number: "20216972781304443620", Balance: "0.64", Currency: { Code: "TJS" } },
    { Number: "2021697278130444362", Balance: "99", Currency: { Code: "USD" } },
  ];
  assert.deepEqual(findPosAccountBalance(accounts, " 20216972781304443620 "), {
    balance: "0.64",
    currency: "TJS",
  });
  assert.equal(findPosAccountBalance(accounts, "202169727813044436"), null);
});

test("selection state distinguishes none, partial and all", () => {
  assert.deepEqual(selectionState(0, 3), { checked: false, indeterminate: false });
  assert.deepEqual(selectionState(1, 3), { checked: false, indeterminate: true });
  assert.deepEqual(selectionState(3, 3), { checked: true, indeterminate: false });
});

test("history ATM payload preserves first selection order and only removes duplicate IDs", () => {
  assert.deepEqual(historyAtmIds([" 30000374 ", "30000373", "30000374", ""]), [
    "30000374",
    "30000373",
  ]);
});

test("stale product response cannot update a different selected client", () => {
  assert.equal(isLatestClientProductRequest(4, 4, "10025", "10025"), true);
  assert.equal(isLatestClientProductRequest(5, 4, "10025", "10025"), false);
  assert.equal(isLatestClientProductRequest(4, 4, "10026", "10025"), false);
});
