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
