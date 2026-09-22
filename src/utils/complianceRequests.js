const dushanbeDateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Dushanbe",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const complianceMatches = (value) => {
  if (typeof value === "string") { try { return complianceMatches(JSON.parse(value)); } catch { return []; } }
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.filter(item => item && typeof item === "object").sort((a, b) => Number(b.similarity || 0) - Number(a.similarity || 0));
};

export const complianceMatchFields = (match) => {
  const labels = { id: "ID записи", org_name: "Организация / банк", bank_account: "Счета / карты", full_name: "ФИО", name: "ФИО", document_info: "Документ", birth_date: "Дата рождения", bday: "Дата рождения", phone: "Телефон", residency_status: "Резидентство", relation_type: "Тип связи", account_status: "Статус счёта", other_info: "Дополнительная информация" };
  return Object.entries(match.data || match.target || {}).map(([key, value]) => [labels[key] || key, value == null || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)]);
};

export const formatComplianceCreatedAt = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const parts = Object.fromEntries(
    dushanbeDateTimeFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, partValue]),
  );
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
};
