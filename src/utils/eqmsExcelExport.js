import * as XLSX from "xlsx";

const EQMS_EXPORT_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "amount", label: "Сумма", format: normalizeAmount },
  { key: "docId", label: "№ Документа" },
  { key: "transactionId", label: "№ Транзакции" },
  { key: "date", label: "Дата" },
  { key: "emailToBeNotified", label: "Email для уведомлений" },
  { key: "meanOfPayment", label: "Способ оплаты" },
  { key: "bankCode", label: "Код банка" },
  { key: "payerINN", label: "ИНН плательщика" },
  { key: "payerName", label: "Плательщик" },
  { key: "payerBankName", label: "Банк плательщика" },
  { key: "payerBankCode", label: "МФО банка плательщика" },
  { key: "payerAcc", label: "Счет плательщика" },
  { key: "recINN", label: "ИНН получателя" },
  { key: "recName", label: "Получатель" },
  { key: "recBankName", label: "Банк получателя" },
  { key: "recBankCode", label: "МФО банка получателя" },
  { key: "recAcc", label: "Счет получателя" },
  { key: "status", label: "Статус платежа" },
  { key: "docDate", label: "Дата документа" },
  { key: "dateVal", label: "Валютная дата" },
  { key: "dataOpr", label: "Дата операции" },
  {
    key: "resiFlg",
    label: "Резидент",
    format: (value) => (value === true ? "Да" : value === false ? "Нет" : value),
  },
  { key: "officeCode", label: "Код офиса" },
  { key: "payDetails", label: "Назначение платежа" },
];

function normalizeAmount(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value;

  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : value;
}

export function createEqmsWorkbook(transactions) {
  const rows = transactions.map((transaction) =>
    Object.fromEntries(
      EQMS_EXPORT_COLUMNS.map(({ key, label, format }) => {
        const value = transaction[key];
        return [label, format ? format(value) : (value ?? "")];
      }),
    ),
  );

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: EQMS_EXPORT_COLUMNS.map(({ label }) => label),
  });

  worksheet["!cols"] = EQMS_EXPORT_COLUMNS.map(({ label }) => {
    const maxLength = Math.max(
      label.length,
      ...rows.map((row) => String(row[label] ?? "").length),
    );
    return { wch: Math.min(Math.max(maxLength + 2, 10), 60) };
  });

  for (let row = 2; row <= transactions.length + 1; row += 1) {
    const amountCell = worksheet[`B${row}`];
    if (amountCell?.t === "n") amountCell.z = "#,##0.00";
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "EQMS");
  return workbook;
}

export function exportEqmsTransactions(transactions, filename) {
  if (!transactions.length) throw new Error("Нет данных для выгрузки");
  XLSX.writeFile(createEqmsWorkbook(transactions), filename);
}
