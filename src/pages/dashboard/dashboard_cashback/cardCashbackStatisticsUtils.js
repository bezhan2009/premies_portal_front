const UNKNOWN_CASHBACK_NAME = "Без названия";

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

export function getCashbackItemDate(item) {
  const rawValue = item?.created_at || item?.updated_at;
  if (!rawValue) return "";

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function filterCashbackItemsByDate(items, fromDate, toDate) {
  if (!Array.isArray(items)) return [];
  if (!fromDate && !toDate) return items;

  return items.filter((item) => {
    const itemDate = getCashbackItemDate(item);
    if (!itemDate) return false;
    if (fromDate && itemDate < fromDate) return false;
    if (toDate && itemDate > toDate) return false;
    return true;
  });
}

export function getCashbackAmount(item) {
  const value = item?.amount ?? item?.cashback_amount ?? 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function getCashbackName(item) {
  const name = String(item?.cashback_name || "").trim();
  return name || UNKNOWN_CASHBACK_NAME;
}

export function summarizeCashbackByName(items) {
  if (!Array.isArray(items)) return [];

  const grouped = new Map();
  items.forEach((item) => {
    const name = getCashbackName(item);
    const current = grouped.get(name) || {
      name,
      count: 0,
      totalAmount: 0,
      paidCount: 0,
      processingCount: 0,
      errorCount: 0,
      returnedCount: 0,
    };

    current.count += 1;
    current.totalAmount += getCashbackAmount(item);

    const status = String(item?.status || "").trim();
    if (status === "Оплачено") current.paidCount += 1;
    else if (status === "Ошибка АБС") current.errorCount += 1;
    else if (status === "Возвращено" || status === "Возврат") current.returnedCount += 1;
    else current.processingCount += 1;

    grouped.set(name, current);
  });

  return [...grouped.values()]
    .map((item) => ({ ...item, totalAmount: Number(item.totalAmount.toFixed(2)) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function buildCashbackChartSeries(items, metric) {
  const names = [...new Set((Array.isArray(items) ? items : []).map(getCashbackName))]
    .sort((a, b) => a.localeCompare(b, "ru"));
  const series = names.map((name, index) => ({ name, key: `cashback_${index}` }));
  const seriesByName = new Map(series.map((item) => [item.name, item.key]));
  const groupedByDate = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const date = getCashbackItemDate(item);
    if (!date) return;
    const row = groupedByDate.get(date) || { date };
    const key = seriesByName.get(getCashbackName(item));
    row[key] = Number(row[key] || 0) + (metric === "sum" ? getCashbackAmount(item) : 1);
    groupedByDate.set(date, row);
  });

  const data = [...groupedByDate.values()]
    .map((row) => {
      series.forEach(({ key }) => {
        row[key] = Number(Number(row[key] || 0).toFixed(2));
      });
      return row;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { data, series };
}
