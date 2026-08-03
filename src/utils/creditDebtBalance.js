const USD_CURRENCIES = new Set(["USD", "840"]);
const USD_DEBT_NPS = new Set(["10914", "17533"]);
const OVERDUE_CREDIT_ACCOUNT_PREFIXES = ["10923", "10935"];

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

export const hasOverdueCreditDebt = (accounts) => {
  if (!Array.isArray(accounts)) return false;

  return accounts.some((account) => {
    const accountNumber = String(
      account?.Number ??
      account?.number ??
      account?.AccountNumber ??
      account?.accountNumber ??
      account?.AccCode ??
      account?.accCode ??
      "",
    ).trim();
    const balance = parseBalance(account?.Balance ?? account?.balance);

    return (
      OVERDUE_CREDIT_ACCOUNT_PREFIXES.some((prefix) =>
        accountNumber.startsWith(prefix),
      ) && balance > 0
    );
  });
};
