const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? undefined : numeric;
};

const normalizeBoolean = (value) => {
  if (value === true || value === 1) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "y";
};

export const getProcessingAmountSign = (context = {}) => {
  const tx = context && typeof context === "object"
    ? context
    : { transactionTypeNumber: context };

  const transactionType = normalizeNumber(
    tx.transactionType ?? tx.transaction_type ?? tx.tranType ?? tx.tran_type ?? tx.tran_code ?? tx.code
  );
  const transactionTypeNumber = normalizeNumber(
    tx.transactionTypeNumber ?? tx.transaction_type_number ?? tx.typeNumber ?? tx.type_number ?? tx.type
  );

  let sign = "";

  // Mobile-bank processing operations: top-up is incoming, account debit is outgoing.
  if (transactionType === 760) {
    sign = "+";
  } else if (transactionType === 659) {
    sign = "-";
  } else if (transactionTypeNumber === 1) {
    sign = "+";
  } else if (transactionTypeNumber === 2) {
    sign = "-";
  }

  const isReversal = normalizeBoolean(
    tx.reversal ?? tx.isReversal ?? tx.is_reversal ?? tx.Reversal
  );
  if (isReversal && sign) {
    sign = sign === "+" ? "-" : "+";
  }

  return sign;
};

export const formatProcessingAmount = (amount, context = {}) => {
  if (amount === null || amount === undefined || amount === "") return "N/A";

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) {
    return String(amount);
  }

  const absoluteValue = Math.abs(numericAmount);
  const amountStr = String(Math.round(absoluteValue));
  const formatted =
    amountStr.length <= 2
      ? `0,${amountStr.padStart(2, "0")}`
      : `${amountStr.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${amountStr.slice(-2)}`;

  const sign = getProcessingAmountSign(context);
  if (sign) return `${sign}${formatted}`;

  return numericAmount < 0 ? `-${formatted}` : formatted;
};

export const applyProcessingSignsToTransaction = (transaction = {}) => {
  if (!transaction || typeof transaction !== "object") return transaction;

  const signed = { ...transaction };
  const amountKeys = [
    "amount",
    "amountRaw",
    "amountCurrency",
    "amount_formatted",
    "amountFormatted",
    "amountCardCurrency",
    "conamt",
    "conamtRaw",
    "con_amt",
    "conAmt",
    "sum",
    "MOVD",
    "MOVC",
  ];
  const sign = getProcessingAmountSign(signed);
  if (!sign) return signed;

  amountKeys.forEach((key) => {
    if (signed[key] === undefined || signed[key] === null || signed[key] === "") return;
    const rawStr = String(signed[key]).trim().replace(/^[+-]\s*/, "");
    if (!rawStr || rawStr === "N/A") return;
    signed[key] = `${sign}${rawStr}`;
    signed[`${key}_signed`] = `${sign}${rawStr}`;
  });

  signed.sign = sign;
  return signed;
};
