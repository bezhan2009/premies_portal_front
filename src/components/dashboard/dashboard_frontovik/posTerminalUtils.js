const BASE_TABS = [
  { key: "cards", label: "Карты" },
  { key: "credits", label: "Кредиты" },
  { key: "accounts", label: "Счета" },
  { key: "deposits", label: "Депозиты" },
];

export const buildFrontovikTabs = (terminals) => {
  const items = [...BASE_TABS];
  if (Array.isArray(terminals) && terminals.length > 0) {
    items.push({ key: "pos", label: "POS-терминалы", count: terminals.length });
  }
  items.push({ key: "info", label: "Информация" });
  return items;
};

export const findPosAccountBalance = (accounts, accountNumber) => {
  const target = String(accountNumber ?? "").trim();
  if (!target || !Array.isArray(accounts)) return null;
  const account = accounts.find(
    (item) => String(item?.Number ?? item?.number ?? "").trim() === target,
  );
  if (!account) return null;
  return {
    balance: account.Balance ?? account.balance ?? "—",
    currency: account.Currency?.Code ?? account.currency?.code ?? account.currency ?? "",
  };
};

export const selectionState = (selectedCount, totalCount) => {
  const selected = Math.max(0, Number(selectedCount) || 0);
  const total = Math.max(0, Number(totalCount) || 0);
  return {
    checked: total > 0 && selected >= total,
    indeterminate: selected > 0 && selected < total,
  };
};

export const historyAtmIds = (values) => {
  const seen = new Set();
  const result = [];
  for (const rawValue of Array.isArray(values) ? values : []) {
    const value = String(rawValue ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

export const isLatestClientProductRequest = (
  activeGeneration,
  requestGeneration,
  activeClientCode,
  requestClientCode,
) =>
  activeGeneration === requestGeneration &&
  String(activeClientCode ?? "").trim() === String(requestClientCode ?? "").trim();

export const isLatestRequestGeneration = (activeGeneration, requestGeneration) =>
  activeGeneration === requestGeneration;

export const resolveTransactionsSearchType = (currentSearchType, isPosHistory) => {
  if (isPosHistory) return "posHistory";
  return currentSearchType === "posHistory" ? "cardId" : currentSearchType;
};

export const parsePosHistoryQuery = (rawClientCode, rawAtmIds) => {
  const clientCode = String(rawClientCode ?? "").trim();
  const atmIds = historyAtmIds(String(rawAtmIds ?? "").split(","));
  return {
    clientCode,
    atmIds,
    isPosHistory: clientCode.length > 0 && atmIds.length > 0,
  };
};

const firstDefined = (record, keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return undefined;
};

export const formatPosHistoryRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((transaction) => ({
    id: firstDefined(transaction, ["id", "ID", "Id"]),
    cardNumber: firstDefined(transaction, ["cardNumber", "CardNumber", "CARDNUMBER"]),
    cardId: firstDefined(transaction, ["cardId", "CardId", "CARDID"]),
    responseCode: firstDefined(transaction, ["responseCode", "ResponseCode", "RESPCODE"]),
    responseDescription: firstDefined(transaction, ["responseDescription", "ResponseDescription"]),
    reqamt: firstDefined(transaction, ["reqamt", "Reqamt", "REQAMT"]),
    amount: firstDefined(transaction, ["amount", "Amount", "AMOUNT"]),
    conamt: firstDefined(transaction, ["conamt", "Conamt", "CONAMT"]),
    acctbal: firstDefined(transaction, ["acctbal", "Acctbal", "ACCTBAL"]),
    netbal: firstDefined(transaction, ["netbal", "Netbal", "NETBAL"]),
    utrnno: firstDefined(transaction, ["utrnno", "UTRNNO", "Utrnno"]),
    currency: firstDefined(transaction, ["currency", "Currency", "CURRENCY"]),
    conCurrency: firstDefined(transaction, ["conCurrency", "ConCurrency", "CONCURRENCY"]),
    terminalId: firstDefined(transaction, ["terminalId", "TerminalId", "TERMINALID"]),
    reversal: firstDefined(transaction, ["reversal", "Reversal", "REVERSAL"]),
    transactionType: firstDefined(transaction, ["transactionType", "TransactionType"]),
    transactionTypeName: firstDefined(transaction, ["transactionTypeName", "TransactionTypeName"]),
    transactionTypeNumber: firstDefined(transaction, ["transactionTypeNumber", "TransactionTypeNumber"]),
    atmId: firstDefined(transaction, ["atmId", "AtmId", "ATMID", "atm_id"]),
    terminalAddress: firstDefined(transaction, ["terminalAddress", "TerminalAddress"]),
    localTransactionDate: firstDefined(transaction, ["localTransactionDate", "LocalTransactionDate"]),
    localTransactionTime: firstDefined(transaction, ["localTransactionTime", "LocalTransactionTime"]),
    mcc: firstDefined(transaction, ["mcc", "MCC", "Mcc"]),
    account: firstDefined(transaction, ["account", "Account", "ACCOUNT"]),
  }));
