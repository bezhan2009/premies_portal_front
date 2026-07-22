export type NavigationIcon =
  | "sparkles"
  | "chart"
  | "database"
  | "book"
  | "users"
  | "message"
  | "card"
  | "wallet"
  | "scan"
  | "settings"
  | "shield"
  | "search"
  | "file"
  | "activity"
  | "mail"
  | "terminal";

export interface PortalRoute {
  path: string;
  title: string;
  description: string;
  group: string;
  icon: NavigationIcon;
  roles: number[];
  primary?: boolean;
}

const route = (
  path: string,
  title: string,
  group: string,
  icon: NavigationIcon,
  roles: number[] = [],
  description = "Защищённая рабочая область Activ Daily",
  primary = false,
): PortalRoute => ({ path, title, description, group, icon, roles, primary });

export const PORTAL_ROUTES: PortalRoute[] = [
  route("/operator/premies", "Расчёт премий", "Премии", "sparkles", [3], "Премиальный фонд, KPI и итоговые начисления", true),
  route("/operator/reports", "Отчёты по премиям", "Премии", "chart", [3], "Сводные отчёты по продуктам и качеству", true),
  route("/operator/data", "Данные сотрудников", "Премии", "database", [3], "Сотрудники, офисы и исходные показатели", true),
  route("/operator/tests", "Оценки и тесты", "Премии", "activity", [3]),
  route("/worker/premies", "Моя премия", "Премии", "sparkles", [6, 8], "Персональный расчёт и прогресс за период", true),
  route("/worker/reports", "Мои показатели", "Премии", "chart", [6, 8], "Детализация личных KPI", true),
  route("/worker/cards", "Карточные показатели", "Премии", "card", [6, 8]),
  route("/worker/credits", "Кредитные показатели", "Премии", "wallet", [6, 8]),
  route("/worker/tests", "Мои тесты", "Премии", "activity", [6, 8]),

  route("/operator/users", "Пользователи", "Администрирование", "users", [3]),
  route("/operator/access-requests", "Заявки на доступ", "Администрирование", "shield", [3]),
  route("/operator/docx-generator", "Генератор документов", "Администрирование", "file", [3]),
  route("/auth/register", "Регистрация пользователя", "Администрирование", "users", [3]),
  route("/admin/logs", "Системные логи", "Администрирование", "terminal", [31]),
  route("/admin/audit-logs", "Журнал аудита", "Администрирование", "shield", [35]),
  route("/admin/daily-tasks", "Ежедневные задачи", "Администрирование", "activity", [32]),
  route("/customers", "Клиенты", "Администрирование", "users", [3, 39]),

  route("/agent/card", "Новая заявка на карту", "Заявки", "card", [10]),
  route("/agent/card/:id", "Заявка на карту", "Заявки", "card", [10]),
  route("/agent/my-applications", "Мои заявки", "Заявки", "file", [10]),
  route("/agent/applications-list", "Заявки на карты", "Заявки", "file", [10, 39]),
  route("/agent/dipozit/card", "Новый депозит", "Заявки", "wallet", [12]),
  route("/agent/dipozit/card/:id", "Заявка на депозит", "Заявки", "wallet", [12]),
  route("/agent/dipozit/my-applications", "Мои депозиты", "Заявки", "file", [12]),
  route("/agent/dipozit/applications-list", "Заявки на депозиты", "Заявки", "file", [12]),
  route("/credit/card", "Новая кредитная заявка", "Заявки", "wallet", [11]),
  route("/credit/card/:id", "Кредитная заявка", "Заявки", "wallet", [11]),
  route("/credit/applications-list", "Кредитные заявки", "Заявки", "file", [11]),

  route("/product/cards", "Карточные продукты", "Продукты", "card", [22]),
  route("/product/credits", "Кредитные продукты", "Продукты", "wallet", [22]),
  route("/product/accounts", "Текущие счета", "Продукты", "database", [22]),
  route("/product/deposits", "Депозитные продукты", "Продукты", "sparkles", [22]),
  route("/product/transfers", "Денежные переводы", "Продукты", "activity", [22]),

  route("/agent-qr/transactions/list", "QR-транзакции", "Операции", "scan", [13]),
  route("/accounts-qr/operations", "Операции по счетам", "Операции", "activity", [13, 26]),
  route("/accounts-qr/settings", "Настройки счетов", "Операции", "settings", [13, 26]),
  route("/agent-sms/sms-sender", "SMS-рассылки", "Операции", "message", [14]),
  route("/agent-transaction/update-transaction", "Типы транзакций", "Операции", "activity", [15]),
  route("/agent-transaction/terminal-names", "Названия терминалов", "Операции", "terminal", [15]),
  route("/agent-custom/eqms", "EQMS", "Операции", "activity", [16]),
  route("/agent-payments/list", "Платежи", "Операции", "wallet", [24]),
  route("/pvn/transactions/list", "PVN-транзакции", "Операции", "activity", [25]),
  route("/pvn/settings/list", "Настройки PVN", "Операции", "settings", [25]),
  route("/accounts/account-operations", "Операции по счету", "Операции", "activity", [20, 17]),
  route("/atm/table", "Мониторинг банкоматов", "Операции", "database", [19]),
  route("/atm/:id/report", "Отчёт банкомата", "Операции", "file", [19]),

  route("/cashback/settings", "Настройки кешбэка", "Специализированные", "settings", [23]),
  route("/cashback/card-list", "Карточный кешбэк", "Специализированные", "card", [23]),
  route("/cashback/monthly-limits", "Лимиты кешбэка", "Специализированные", "activity", [23]),
  route("/cashback/qr-list", "QR-кешбэк", "Специализированные", "scan", [23]),
  route("/processing/limits", "Процессинговые лимиты", "Специализированные", "settings", [18, 17]),
  route("/processing/transactions", "Процессинговые транзакции", "Специализированные", "activity", [18, 17]),
  route("/processing/transactions/:id", "Транзакция", "Специализированные", "activity", [18, 17]),
  route("/processing-search/transactions", "Поиск транзакций", "Специализированные", "search", [21]),
  route("/frontovik/abs-search", "Поиск клиента в АБС", "Специализированные", "search", [17, 35, 39]),
  route("/client-documents", "Документы клиентов", "Специализированные", "file", [27]),
  route("/card-balance", "Баланс карты", "Специализированные", "card", [28]),
  route("/agent/client-pins", "PIN-коды клиентов", "Специализированные", "shield", [36]),
  route("/compliance/settings", "Настройки комплаенса", "Специализированные", "settings", [33]),
  route("/compliance/requests", "Комплаенс-заявки", "Специализированные", "shield", [33]),
  route("/compliance/score-options", "Скоринг комплаенса", "Специализированные", "activity", [33]),
  route("/mail-agent", "Почтовый агент", "Специализированные", "mail", [34]),

  route("/chairman/reports", "Отчёты председателя", "Руководство", "chart", [9], "Банковская сводка для председателя", true),
  route("/director/reports", "Отчёты директора", "Руководство", "chart", [5], "Сводка по офисам и сотрудникам", true),
  route("/chairman/knowledge-base", "База знаний", "Руководство", "book", [9]),
  route("/director/knowledge-base", "База знаний", "Руководство", "book", [5]),

  route("/feedback", "Актив чат", "Коммуникации", "message"),
  route("/groups", "Группы", "Коммуникации", "users"),
  route("/submit-feedback", "Обратная связь", "Коммуникации", "message"),
  route("/operator/feedback", "Управление обращениями", "Коммуникации", "message", [3]),
  route("/operator/groups", "Управление группами", "Коммуникации", "users", [3]),
  route("/user/knowledge-base", "База знаний", "Знания", "book"),
  route("/operator/knowledge-base", "База знаний оператора", "Знания", "book", [3]),
  route("/worker/knowledge-base", "База знаний сотрудника", "Знания", "book", [6, 8]),
  route("/agent/knowledge-base", "База знаний агента", "Знания", "book", [10]),
  route("/agent/dipozit/knowledge-base", "База знаний по депозитам", "Знания", "book", [12]),
  route("/credit/knowledge-base", "База знаний по кредитам", "Знания", "book", [11]),
  route("/agent-qr/knowledge-base", "База знаний QR", "Знания", "book", [13]),
  route("/agent-sms/knowledge-base", "База знаний SMS", "Знания", "book", [14]),
  route("/request-access", "Запросить доступ", "Доступ", "shield", [1]),
  route("/under/development", "Новый раздел", "Знания", "sparkles", [], "Рабочая область готовится к запуску"),
];

export const NAVIGATION_GROUP_ORDER = [
  "Премии",
  "Руководство",
  "Заявки",
  "Продукты",
  "Операции",
  "Специализированные",
  "Администрирование",
  "Коммуникации",
  "Знания",
  "Доступ",
];

export function routesForRoles(roles: number[]): PortalRoute[] {
  return PORTAL_ROUTES.filter((item) => item.roles.length === 0 || item.roles.some((roleId) => roles.includes(roleId)));
}

export function defaultRouteForRoles(roles: number[]): string {
  const priorities: Array<[number[], string]> = [
    [[3], "/operator/premies"],
    [[6, 8], "/worker/premies"],
    [[9], "/chairman/reports"],
    [[5], "/director/reports"],
    [[10, 39], "/agent/applications-list"],
    [[11], "/credit/applications-list"],
    [[12], "/agent/dipozit/applications-list"],
    [[13], "/agent-qr/transactions/list"],
    [[14], "/agent-sms/sms-sender"],
    [[15], "/agent-transaction/update-transaction"],
    [[16], "/agent-custom/eqms"],
    [[17, 35], "/frontovik/abs-search"],
    [[18], "/processing/limits"],
    [[19], "/atm/table"],
    [[20], "/accounts/account-operations"],
    [[21], "/processing-search/transactions"],
    [[22], "/product/cards"],
    [[23], "/cashback/card-list"],
    [[24], "/agent-payments/list"],
    [[25], "/pvn/transactions/list"],
    [[26], "/accounts-qr/operations"],
    [[27], "/client-documents"],
    [[28], "/card-balance"],
    [[31], "/admin/logs"],
    [[32], "/admin/daily-tasks"],
    [[33], "/compliance/requests"],
    [[34], "/mail-agent"],
    [[36], "/agent/client-pins"],
    [[1], "/request-access"],
  ];
  return priorities.find(([roleSet]) => roleSet.some((roleId) => roles.includes(roleId)))?.[1] || "/user/knowledge-base";
}

export function matchPortalRoute(pathname: string): PortalRoute | undefined {
  return PORTAL_ROUTES.find((item) => {
    const pattern = item.path
      .split("/")
      .map((segment) => segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("/");
    return new RegExp(`^${pattern}/?$`).test(pathname);
  });
}

export function concretePath(path: string): string {
  return path.replace(/\/:\w+/g, "");
}

export const ROLE_LABELS: Record<number, string> = {
  1: "Новый пользователь",
  3: "Оператор",
  5: "Директор",
  6: "Сотрудник",
  8: "Сотрудник",
  9: "Председатель",
  10: "Карточный агент",
  11: "Кредитный агент",
  12: "Депозитный агент",
  13: "QR-агент",
  17: "Фронт-офис",
  18: "Процессинг",
  22: "Продуктовый менеджер",
  31: "Администратор логов",
  33: "Комплаенс",
  35: "Аудитор",
  39: "Клиентский сервис",
};
