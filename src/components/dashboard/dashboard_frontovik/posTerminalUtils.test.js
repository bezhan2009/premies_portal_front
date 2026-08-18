import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFrontovikTabs,
  findPosAccountBalance,
  historyAtmIds,
  isLatestClientProductRequest,
  isLatestRequestGeneration,
  parsePosHistoryQuery,
  formatPosHistoryRows,
  resolveTransactionsSearchType,
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

test("only the latest generic request generation may update state", () => {
  assert.equal(isLatestRequestGeneration(7, 7), true);
  assert.equal(isLatestRequestGeneration(8, 7), false);
});

test("POS history query requires client code and concrete ATM IDs", () => {
  assert.deepEqual(parsePosHistoryQuery(" 10025 ", "30000374,30000373,30000374"), {
    clientCode: "10025",
    atmIds: ["30000374", "30000373"],
    isPosHistory: true,
  });
  assert.deepEqual(parsePosHistoryQuery("10025", ""), {
    clientCode: "10025",
    atmIds: [],
    isPosHistory: false,
  });
});

test("transaction search returns to a valid ordinary mode after POS query removal", () => {
  assert.equal(resolveTransactionsSearchType("cardId", true), "posHistory");
  assert.equal(resolveTransactionsSearchType("posHistory", false), "cardId");
  assert.equal(resolveTransactionsSearchType("atmId", false), "atmId");
});

test("POS history rows accept processing field aliases without deduplication", () => {
  const rows = formatPosHistoryRows([
    { ID: 7, UTRNNO: "same", ATMID: "30000373", TerminalAddress: "Дилкушо 26/1" },
    { ID: 7, UTRNNO: "same", ATMID: "30000373", TerminalAddress: "Дилкушо 26/1" },
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    id: 7,
    cardNumber: undefined,
    cardId: undefined,
    responseCode: undefined,
    responseDescription: undefined,
    reqamt: undefined,
    amount: undefined,
    conamt: undefined,
    acctbal: undefined,
    netbal: undefined,
    utrnno: "same",
    currency: undefined,
    conCurrency: undefined,
    terminalId: undefined,
    reversal: undefined,
    transactionType: undefined,
    transactionTypeName: undefined,
    transactionTypeNumber: undefined,
    atmId: "30000373",
    terminalAddress: "Дилкушо 26/1",
    localTransactionDate: undefined,
    localTransactionTime: undefined,
    mcc: undefined,
    account: undefined,
  });
});
