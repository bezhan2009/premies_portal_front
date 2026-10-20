export function merchantTitle(row, merchantsByCode) {
  const code = row.merchant_code || row.merchant_id;
  if (!code) return "—";
  return merchantsByCode.get(String(code)) ?? code;
}

export function filterQrTransactions(rows, filters, merchantsByCode) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) =>
    Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      if (key === "merchant_name")
        return String(merchantTitle(row, merchantsByCode))
          .toLocaleLowerCase()
          .includes(String(value).trim().toLocaleLowerCase());
      const rowValue = row[key];
      if (rowValue == null) return false;
      if (typeof rowValue === "number") return String(rowValue).includes(value);
      if (typeof rowValue === "string")
        return rowValue.toLowerCase().includes(String(value).toLowerCase());
      return false;
    }),
  );
}
