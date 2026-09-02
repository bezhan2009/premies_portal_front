export const CARD_FIELD_DEFINITIONS = [
  { key: "card_ids", label: "ID карты", exportLabel: "ID карты" },
  { key: "card_numbers", label: "Номер карты", exportLabel: "Номер карты" },
  { key: "card_types", label: "Тип карты", exportLabel: "Тип карты" },
  { key: "card_abs_statuses", label: "Статус карты в АБС", exportLabel: "Статус АБС" },
  { key: "card_pc_statuses", label: "Статус карты в ПЦ", exportLabel: "Статус ПЦ" },
  { key: "card_hot_statuses", label: "Код hot-статуса в ПЦ", exportLabel: "Hot-статус ПЦ" },
  { key: "card_expiry_dates", label: "Срок действия карты", exportLabel: "Срок действия" },
  { key: "card_request_dates", label: "Дата выпуска карты", exportLabel: "Дата выпуска" },
  { key: "card_embossed_names", label: "Имя на карте", exportLabel: "Имя на карте" },
  { key: "card_branches", label: "Филиал / код филиала карты", exportLabel: "Филиал" },
  { key: "card_accounts", label: "Счета карты", exportLabel: "Счет карты", repeated: true },
  { key: "card_account_currencies", label: "Валюты счетов карты", exportLabel: "Валюта счета", repeated: true },
  { key: "card_abs_balances", label: "Балансы счетов в АБС", exportLabel: "Баланс АБС", repeated: true },
  { key: "card_pc_balances", label: "Балансы счетов в ПЦ", exportLabel: "Баланс ПЦ", repeated: true },
  { key: "card_pin_counters", label: "Счетчик ошибок PIN", exportLabel: "Ошибки PIN" },
  { key: "card_notifications", label: "Уведомления карты", exportLabel: "Уведомление", repeated: true },
];

const CARD_FIELD_BY_KEY = new Map(CARD_FIELD_DEFINITIONS.map((field) => [field.key, field]));

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.result)) return value.result;
  return [];
};

const readFirst = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
};

const formatAmount = (value, currency = "") => {
  if (value === undefined || value === null || value === "") return "";
  const normalized = String(value).replace(/\s+/g, "").replace(",", ".");
  const number = Number(normalized);
  const amount = Number.isFinite(number)
    ? number.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(value);
  return `${amount}${currency ? ` ${currency}` : ""}`;
};

const currencyCode = (value) => {
  const code = String(value ?? "").trim();
  if (code === "972") return "TJS";
  if (code === "840") return "USD";
  if (code === "978") return "EUR";
  return code;
};

const accountNumberOf = (account) =>
  String(readFirst(account, ["Number", "number", "AccountNumber", "accountNumber"])).trim();

const accountCurrencyOf = (account) =>
  String(account?.Currency?.Code ?? account?.currency?.code ?? readFirst(account, ["currency", "CurrencyCode"])).trim();

const accountBalanceOf = (account) =>
  readFirst(account, ["Balance", "balance", "AvailableBalance", "availableBalance"], "");

const mergedCardAccounts = (card) => {
  const accounts = [];
  const seen = new Set();
  const add = (account, source) => {
    const number = accountNumberOf(account);
    if (!number || seen.has(number)) return;
    seen.add(number);
    accounts.push({
      number,
      currency: readFirst(account, ["currency", "Currency", "currencyCode", "CurrencyCode"]),
      balance: readFirst(account, ["balance", "Balance"], ""),
      source,
    });
  };

  normalizeArray(card?.details?.accounts).forEach((account) => add(account, "pc"));
  normalizeArray(card?.accounts).forEach((account) => add(account, "abs-card"));
  return accounts;
};

const cardNumberOf = (card) =>
  String(readFirst(card, ["CardNumber", "cardNumber"], readFirst(card?.details, ["cardNumberMask", "cardNumber"]))).trim();

const cardTypeOf = (card) => {
  const absType = String(readFirst(card, ["CardTypeName", "cardTypeName"], readFirst(card?.details, ["cardTypeName"]))).trim();
  const pcType = String(readFirst(card, ["type"], readFirst(card?.details, ["type"]))).trim();
  if (absType && pcType && absType !== pcType) return `${absType} (${pcType})`;
  return absType || pcType;
};

const formatExpiryDate = (value) => {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 6) return `${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
  return raw;
};

const notificationsOf = (card) => normalizeArray(card?.services).flatMap((service) => {
  const serviceId = String(service?.identification?.serviceId ?? service?.serviceId ?? "");
  const type = serviceId === "300" ? "SMS" : serviceId === "330" ? "3DS" : "";
  if (!type) return [];
  const destination = String(readFirst(service, ["extNumber", "number", "phone"])).trim();
  return [`${destination}${destination ? " " : ""}${type}`];
});

export const isCardFieldKey = (key) => CARD_FIELD_BY_KEY.has(key);

export const getCardFieldValues = (row, cardIndex, key) => {
  const card = normalizeArray(row?.cards)[cardIndex];
  if (!card) return [];
  const accounts = normalizeArray(row?.accounts);
  const cardAccounts = mergedCardAccounts(card);

  switch (key) {
    case "card_ids": return [readFirst(card, ["cardId", "CardId", "IDN", "idn"])];
    case "card_numbers": return [cardNumberOf(card)];
    case "card_types": return [cardTypeOf(card)];
    case "card_abs_statuses": return [readFirst(card, ["statusName", "StatusName"], readFirst(card?.Status, ["Name", "name"]))];
    case "card_pc_statuses": return [readFirst(card?.details, ["statusDescription", "StatusDescription"])];
    case "card_hot_statuses": return [readFirst(card?.details, ["hotCardStatus", "HotCardStatus"])];
    case "card_expiry_dates": return [formatExpiryDate(readFirst(card?.details, ["expiryDate", "expirationDate"], readFirst(card, ["expirationDate"])))];
    case "card_request_dates": return [readFirst(card?.details, ["requestDate"], readFirst(card, ["requestDate", "RequestDate"]))];
    case "card_embossed_names": return [readFirst(card?.details, ["embossedName", "embossedName1", "cardholderName"], readFirst(card, ["embossedName", "cardholderName"]))];
    case "card_branches": {
      const agreement = String(readFirst(card?.details, ["agreement"], readFirst(card, ["agreement", "Agreement"]))).trim();
      return [card?.Branch?.Name ?? card?.branch?.name ?? readFirst(card, ["branchName", "BranchName"], agreement.slice(0, 4))];
    }
    case "card_accounts": return cardAccounts.map((account) => account.number);
    case "card_account_currencies": return cardAccounts.map((account) => {
      const absAccount = accounts.find((item) => accountNumberOf(item) === account.number);
      return currencyCode(account.currency || accountCurrencyOf(absAccount));
    });
    case "card_abs_balances": return cardAccounts.map((account) => {
      const absAccount = accounts.find((item) => accountNumberOf(item) === account.number);
      return absAccount ? formatAmount(accountBalanceOf(absAccount), accountCurrencyOf(absAccount)) : "";
    });
    case "card_pc_balances": return cardAccounts.map((account) => {
      if (account.source !== "pc") return "";
      const rawBalance = Number(account.balance);
      const balance = Number.isFinite(rawBalance) ? rawBalance / 100 : account.balance;
      return formatAmount(balance, currencyCode(account.currency));
    });
    case "card_pin_counters": return [readFirst(card?.details, ["pinDenialCounter", "PinDenialCounter"], 0)];
    case "card_notifications": return notificationsOf(card);
    default: return [];
  }
};

export const formatCardFieldForTable = (row, key) => {
  const cards = normalizeArray(row?.cards);
  if (!cards.length) return "—";
  const values = cards.map((_, cardIndex) => {
    const cardValues = getCardFieldValues(row, cardIndex, key).filter((value) => value !== "" && value !== null && value !== undefined);
    return `Карта ${cardIndex + 1}: ${cardValues.length ? cardValues.join("; ") : "—"}`;
  });
  return values.join("\n");
};

export const buildCardExportColumns = (results, selectedCardFields) => {
  const fields = selectedCardFields.map((key) => CARD_FIELD_BY_KEY.get(key)).filter(Boolean);
  if (!fields.length) return [];

  const successfulRows = results.filter((row) => row?.status === "success");
  const maxCards = Math.max(1, ...successfulRows.map((row) => normalizeArray(row?.cards).length));
  const columns = [];

  for (let cardIndex = 0; cardIndex < maxCards; cardIndex += 1) {
    for (const field of fields) {
      const maxValues = field.repeated
        ? Math.max(1, ...successfulRows.map((row) => getCardFieldValues(row, cardIndex, field.key).length))
        : 1;

      for (let valueIndex = 0; valueIndex < maxValues; valueIndex += 1) {
        const repeatedSuffix = field.repeated && maxValues > 1 ? ` ${valueIndex + 1}` : "";
        columns.push({
          label: `Карта ${cardIndex + 1} — ${field.exportLabel}${repeatedSuffix}`,
          key: (row) => row?.status === "success"
            ? (getCardFieldValues(row, cardIndex, field.key)[valueIndex] ?? "")
            : "",
        });
      }
    }
  }

  return columns;
};
