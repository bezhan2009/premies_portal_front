const USD_CURRENCIES = new Set(["USD", "840"]);
const USD_DEBT_NPS = new Set(["10914", "17533"]);

const readField = (account, camelCase, pascalCase) =>
  account?.[camelCase] ?? account?.[pascalCase] ?? "";

const parseBalance = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isUsdCredit = (currency) =>
  USD_CURRENCIES.has(String(currency ?? "").trim().toUpperCase());

export const calculateUsdCreditDebtBalance = (balances, referenceId = "") => {
  if (!Array.isArray(balances)) return 0;

  const normalizedReferenceId = String(referenceId ?? "").trim();

  return balances.reduce((total, account) => {
    const nps = String(readField(account, "nps", "Nps")).trim();
    const activeFlag = String(readField(account, "activeFl", "ActiveFl"))
      .trim()
      .toLowerCase();
    const accountReferenceId = String(
      readField(account, "colvirReferenceId", "ColvirReferenceId"),
    ).trim();

    if (!USD_DEBT_NPS.has(nps) || activeFlag !== "dt") return total;
    if (
      normalizedReferenceId &&
      accountReferenceId &&
      accountReferenceId !== normalizedReferenceId
    ) {
      return total;
    }

    return total + parseBalance(readField(account, "balance", "Balance"));
  }, 0);
};

