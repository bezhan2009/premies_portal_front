export const normalizeScheduleDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace("T", " ").replace(/(\d{2}:\d{2}:\d{2})\.\d+.*$/, "$1");
};

export const getDateOnly = (value) => normalizeScheduleDate(value).split(" ")[0] || "";

export const parseScheduleDateTimestamp = (value) => {
  const date = getDateOnly(value);
  let match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  match = date.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (match) {
    return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  const fallback = Date.parse(date);
  return Number.isNaN(fallback) ? Number.POSITIVE_INFINITY : fallback;
};

const parseScheduleAmount = (value) => {
  const normalized = String(value || "0").replace(/\s/g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

export const buildDepositScheduleRows = (schedulePoints, now = new Date()) => {
  const grouped = new Map();

  (Array.isArray(schedulePoints) ? schedulePoints : []).forEach((point) => {
    const calculatingDate = getDateOnly(
      point.calculatingDate ||
      point.CalculatingDate ||
      point.paymentDate ||
      point.PaymentDate ||
      point.expectationDate ||
      point.ExpectationDate,
    );
    if (!calculatingDate) return;

    if (!grouped.has(calculatingDate)) {
      grouped.set(calculatingDate, {
        date: calculatingDate,
        calculatedIncome: 0,
        tax: 0,
        income: 0,
      });
    }

    const row = grouped.get(calculatingDate);
    const name = String(point.longName || point.LongName || point.name || point.Name || "").toLowerCase();
    const code = String(point.code || point.Code || "").toUpperCase();
    const amount = parseScheduleAmount(
      point.planAmount ||
      point.PlanAmount ||
      point.calculatingAmount ||
      point.CalculatingAmount ||
      point.amount ||
      point.Amount,
    );

    if (
      (name.includes("вознаграждение по депозиту") && !name.includes("выплата")) ||
      code === "DEP_BONUS" ||
      code === "DEP_INTER"
    ) {
      row.calculatedIncome += amount;
    } else if (name.includes("подоходного налога") || name.includes("налог") || code === "DEP_TAX") {
      row.tax += amount;
    } else if (name.includes("выплата вознаграждения") || code === "DEP_PAY") {
      row.income += amount;
    } else {
      row.income += amount;
    }
  });

  const todayTimestamp = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Array.from(grouped.values())
    .map((row) => {
      const paymentTimestamp = parseScheduleDateTimestamp(row.date);
      return {
        ...row,
        status: Number.isFinite(paymentTimestamp) && paymentTimestamp <= todayTimestamp
          ? "Выплачен"
          : "Ожидается",
      };
    })
    .sort((a, b) => parseScheduleDateTimestamp(a.date) - parseScheduleDateTimestamp(b.date));
};
