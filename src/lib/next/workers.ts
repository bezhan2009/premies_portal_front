import type { BackendWorker, Worker } from "@/lib/next/types";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? value as Record<string, unknown> : {};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const numberValue = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const stringValue = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

export function calculatePremium(worker: BackendWorker): number {
  const cardSales = asArray(worker.CardSales ?? worker.cardSales)[0] ?? {};
  const turnovers = asArray(worker.CardTurnovers ?? worker.cardTurnovers)[0] ?? {};
  const service = asArray(worker.ServiceQuality ?? worker.serviceQuality)[0] ?? {};
  const mobile = asArray(worker.MobileBank ?? worker.mobileBank)[0] ?? {};

  const base =
    numberValue(mobile.mobile_bank_connects) * 10 +
    numberValue(turnovers.card_turnovers_prem) +
    numberValue(turnovers.active_cards_perms) +
    numberValue(cardSales.cards_prem) +
    numberValue(worker.salary_project);

  const callCenter = numberValue(service.call_center);
  const tests = numberValue(service.tests);
  const callPercent = callCenter <= 1 ? -30 : callCenter <= 3 ? -20 : callCenter <= 5 ? -10 : callCenter <= 7 ? 0 : callCenter <= 9 ? 10 : 20;
  const testPercent = tests <= 2 ? -10 : tests <= 4 ? -5 : tests <= 6 ? 0 : tests <= 8 ? 5 : tests <= 9 ? 10 : 15;
  const calculated = Math.max(0, base * (1 + (callPercent + testPercent) / 100));
  const salary = numberValue(worker.Salary, worker.salary);
  return Math.round(Math.min(calculated, salary > 0 ? salary * 1.5 : calculated));
}

export function normalizeWorker(raw: BackendWorker, index = 0): Worker {
  const user = asRecord(raw.user ?? raw.User);
  const office = asRecord(raw.office ?? raw.Office);
  const cardSales = asArray(raw.CardSales ?? raw.cardSales)[0] ?? {};
  const turnovers = asArray(raw.CardTurnovers ?? raw.cardTurnovers)[0] ?? {};
  const service = asArray(raw.ServiceQuality ?? raw.serviceQuality)[0] ?? {};
  const mobile = asArray(raw.MobileBank ?? raw.mobileBank)[0] ?? {};

  return {
    id: String(raw.ID ?? raw.id ?? `worker-${index}`),
    salary: numberValue(raw.Salary, raw.salary),
    officeName: stringValue(office.Name, office.name, raw.office_name, "Головной офис"),
    user: {
      id: user.ID as number | string | null ?? user.id as number | string | null ?? null,
      username: stringValue(user.Username, user.username, `employee-${index + 1}`),
      fullName: stringValue(user.full_name, user.FullName, user.name, user.Username, "Сотрудник"),
      email: stringValue(user.email),
    },
    metric: {
      mobileBankConnects: numberValue(mobile.mobile_bank_connects),
      cardTurnoverPremium: numberValue(turnovers.card_turnovers_prem),
      activeCardsPremium: numberValue(turnovers.active_cards_perms),
      cardSalesPremium: numberValue(cardSales.cards_prem),
      salaryProject: numberValue(raw.salary_project),
      serviceScore: numberValue(service.call_center),
      testScore: numberValue(service.tests),
    },
    premium: calculatePremium(raw),
  };
}

export function extractWorkers(payload: unknown): Worker[] {
  const record = asRecord(payload);
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(record.workers)
      ? record.workers
      : record.ID || record.id
        ? [record]
        : [];
  return source.map((item, index) => normalizeWorker(asRecord(item), index));
}
