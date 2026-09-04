export const US_ON_US_STATEMENT_PATH = "/api/atm/services/stmnt_ac.php";
export const US_ON_US_ACCOUNT = "17507972690808713012";
export const US_ON_US_ACCOUNT_PREFIXES = ["20216972", "20202972"];

export function toStatementDate(value) {
  return String(value || "").split("T")[0];
}

export function buildUsOnUsStatementUrl(startDate, endDate, accountPrefix) {
  const params = new URLSearchParams({
    acc: US_ON_US_ACCOUNT,
    dt1: toStatementDate(startDate),
    dt2: toStatementDate(endDate),
    trn_acc_code: accountPrefix,
    descr: "Оплата",
  });

  return `${US_ON_US_STATEMENT_PATH}?${params.toString()}`;
}

export function usOnUsDateTimestamp(value) {
  const [day, month, year] = String(value || "").split(".");
  if (!day || !month || !year) return 0;

  const fullYear = year.length === 2 ? `20${year}` : year;
  const timestamp = Date.parse(`${fullYear}-${month}-${day}T00:00:00`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function normalizeUsOnUsTransactions(responses) {
  const rows = responses
    .flatMap((response) => (Array.isArray(response) ? response : []))
    .map((row, index) => ({
      ...row,
      id:
        row?.id ||
        [row?.dep_id, row?.ord_id, row?.proc_id].filter(Boolean).join("-") ||
        `us-on-us-${index}`,
      amount: Number(row?.sdok || 0),
      currency: row?.val_code || "TJS",
      status: "success",
    }));

  rows.sort((left, right) => {
    const dateDifference =
      usOnUsDateTimestamp(right.doper) - usOnUsDateTimestamp(left.doper);
    if (dateDifference !== 0) return dateDifference;
    return String(right.id).localeCompare(String(left.id), "ru", {
      numeric: true,
    });
  });

  return rows;
}

export function usOnUsExcelRows(rows) {
  return rows.map((row) => ({
    "Дата операции": row.doper || "",
    Сумма: Number(row.sdok || row.amount || 0),
    Валюта: row.val_code || row.currency || "TJS",
    Отправитель: row.txt_pay || "",
    Получатель: row.txt_ben || "",
    "Номер счета получателя": row.trn_acc_code || "",
    "Назначение платежа": row.dscr || "",
    Статус: "Успешно",
  }));
}
