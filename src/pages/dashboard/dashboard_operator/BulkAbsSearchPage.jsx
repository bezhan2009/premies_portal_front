import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Play,
  Search,
  UploadCloud,
  XCircle,
} from "lucide-react";
import {
  getClientByCode,
  getUserAccounts,
  getUserCards,
  getUserCredits,
  getUserDeposits,
} from "../../../api/ABS_frotavik/getUserCredits";
import { resolveBulkClientCodes } from "../../../api/ABS_frotavik/bulkClientSearch";
import { fetchCardDetails, fetchCardServices } from "../../../api/processing/transactions";
import { fetchLoanDetails } from "../../../api/ABS_frotavik/getLoanDetails";
import {
  calculateUsdCreditDebtBalance,
  isUsdCredit,
} from "../../../utils/creditDebtBalance";
import { useExcelExport } from "../../../hooks/useExcelExport";
import { logAuditAction } from "../../../utils/auditLogger";
import {
  buildCardExportColumns,
  CARD_FIELD_DEFINITIONS,
  formatCardFieldForTable,
  isCardFieldKey,
} from "./bulkAbsSearchCards";

const IDENTIFIER_OPTIONS = [
  { value: "telefon", label: "Телефон", column: "telefon", example: "992900000000" },
  { value: "inn", label: "ИНН", column: "inn", example: "012345678" },
  { value: "client_code", label: "Код клиента", column: "client_code", example: "5100.045870" },
  { value: "account_number", label: "Номер счета", column: "account_number", example: "20202972000000000001" },
  { value: "card_id", label: "ID карты", column: "card_id", example: "100000000001" },
];

const FIELD_GROUPS = [
  {
    name: "Клиент",
    fields: [
      { key: "fio", label: "ФИО / наименование" },
      { key: "client_code", label: "Код клиента в АБС" },
      { key: "inn", label: "ИНН" },
      { key: "phones", label: "Все телефоны" },
      { key: "client_type", label: "Тип клиента" },
      { key: "resident", label: "Резидентность" },
      { key: "birth_date", label: "Дата рождения" },
      { key: "addresses", label: "Адреса" },
      { key: "department", label: "Подразделение" },
      { key: "documents", label: "Документы клиента" },
    ],
  },
  {
    name: "Карты",
    fields: CARD_FIELD_DEFINITIONS,
  },
  {
    name: "Счета",
    fields: [
      { key: "accounts_summary", label: "Все счета: номер и баланс" },
      { key: "account_numbers", label: "Номера счетов" },
      { key: "account_balances", label: "Балансы счетов" },
      { key: "account_statuses", label: "Статусы счетов" },
      { key: "account_open_dates", label: "Даты открытия счетов" },
      { key: "account_branches", label: "Филиалы счетов" },
    ],
  },
  {
    name: "Кредиты",
    fields: [
      { key: "credits_summary", label: "Все кредиты: номер и задолженность" },
      { key: "credit_numbers", label: "Номера кредитов" },
      { key: "credit_debts", label: "Остаток задолженности" },
      { key: "credit_amounts", label: "Суммы кредитов" },
      { key: "credit_statuses", label: "Статусы кредитов" },
      { key: "credit_products", label: "Кредитные продукты" },
      { key: "credit_dates", label: "Сроки кредитов" },
    ],
  },
  {
    name: "Депозиты",
    fields: [
      { key: "deposits_summary", label: "Все депозиты: номер и баланс" },
      { key: "deposit_numbers", label: "Номера депозитов" },
      { key: "deposit_balances", label: "Балансы депозитов" },
      { key: "deposit_statuses", label: "Статусы депозитов" },
      { key: "deposit_products", label: "Депозитные продукты" },
      { key: "deposit_dates", label: "Сроки депозитов" },
    ],
  },
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields);
const DEFAULT_FIELDS = [
  "fio",
  "client_code",
  "inn",
  "phones",
  "card_types",
  "card_abs_balances",
  "card_pc_balances",
  "accounts_summary",
  "credits_summary",
];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.result)) return value.result;
  if (value && typeof value === "object" && Object.keys(value).length > 0) return [value];
  return [];
};

const compact = (values) =>
  [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];

const joinLines = (values) => {
  const lines = compact(values);
  return lines.length ? lines.join("\n") : "—";
};

const readFirst = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
};

const formatAmount = (value, currency = "") => {
  if (value === undefined || value === null || value === "") return "—";
  const normalized = String(value).replace(/\s+/g, "").replace(",", ".");
  const number = Number(normalized);
  const amount = Number.isFinite(number)
    ? number.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(value);
  return `${amount}${currency ? ` ${currency}` : ""}`;
};

const clientCodeOf = (client, fallback = "") =>
  String(readFirst(client, ["Code", "code", "client_code", "clientCode"], fallback)).trim();

const clientNameOf = (client) =>
  String(
    readFirst(client, ["LongName", "long_name"], [
      readFirst(client, ["LastName", "surname"]),
      readFirst(client, ["FirstName", "name"]),
      readFirst(client, ["MiddleName", "patronymic"]),
    ].filter(Boolean).join(" ")),
  ).trim() || "—";

const clientInnOf = (client) =>
  String(
    client?.TaxIdentificationNumber?.Code ??
      client?.taxIdentificationNumber?.code ??
      readFirst(client, ["tax_code", "inn", "INN"]),
  ).trim();

const clientPhonesOf = (client) => {
  const contacts = normalizeArray(client?.ContactData ?? client?.contactData);
  return compact([
    readFirst(client, ["phone", "Phone", "phoneNumber"]),
    ...contacts.map((contact) => readFirst(contact, ["Value", "value"])),
  ]);
};

const clientAddressesOf = (client) => {
  const details = normalizeArray(client?.DetailedAddresses ?? client?.detailedAddresses);
  return compact([
    readFirst(client, ["AddressString", "addressString", "address"]),
    ...details.map((address) =>
      readFirst(address, ["AddressString", "addressString", "FullAddress", "fullAddress", "Value", "value"]),
    ),
  ]);
};

const clientDocumentsOf = (client) =>
  normalizeArray(client?.IdentDocs ?? client?.identDocs).map((document) => {
    const type = document?.Type?.Name ?? document?.type?.name ?? "Документ";
    const series = readFirst(document, ["Series", "series"]);
    const number = readFirst(document, ["Number", "number"]);
    const date = readFirst(document, ["IssueDate", "issueDate"]);
    return [type, series, number, date].filter(Boolean).join(" ");
  });

const accountNumberOf = (account) =>
  String(readFirst(account, ["Number", "number", "AccountNumber", "accountNumber"])).trim();

const accountCurrencyOf = (account) =>
  String(account?.Currency?.Code ?? account?.currency?.code ?? readFirst(account, ["currency", "CurrencyCode"])).trim();

const accountBalanceOf = (account) =>
  readFirst(account, ["Balance", "balance", "AvailableBalance", "availableBalance"], 0);

const cardIdOf = (card) => String(readFirst(card, ["cardId", "CardId", "IDN", "idn"])).trim();

const creditNumberOf = (credit) =>
  String(
    readFirst(
      credit?.loanDetails?.params,
      ["contractNumber", "referenceId"],
      readFirst(credit, ["contractNumber", "ContractNumber", "referenceId", "ReferenceId"]),
    ),
  ).trim();

const creditCurrencyOf = (credit) =>
  String(
    readFirst(credit?.loanDetails?.params, ["currency"], readFirst(credit, ["currency", "Currency"])),
  ).trim();

const creditDebtOf = (credit) => {
  const directDebt = readFirst(credit, ["debtBalance", "DebtBalance", "outstandingBalance", "OutstandingBalance"], null);
  const details = credit?.loanDetails;
  if (!details) return directDebt;

  const balances = normalizeArray(details.balances);
  const currency = creditCurrencyOf(credit);
  const referenceId = String(
    readFirst(details.params, ["referenceId"], readFirst(credit, ["referenceId", "ReferenceId"])),
  ).trim();
  if (isUsdCredit(currency)) return calculateUsdCreditDebtBalance(balances, referenceId);

  return balances
    .filter((balance) => {
      const activeFlag = String(readFirst(balance, ["activeFl", "ActiveFl"])).toLowerCase();
      const balanceCurrency = String(readFirst(balance, ["currCode", "CurrCode"])).toUpperCase();
      return activeFlag === "dt" && (!currency || !balanceCurrency || balanceCurrency === currency.toUpperCase());
    })
    .reduce((total, balance) => total + Number(readFirst(balance, ["balance", "Balance"], 0) || 0), 0);
};

const depositAgreementOf = (deposit) => deposit?.AgreementData ?? deposit?.agreementData ?? deposit;

const depositNumberOf = (deposit) =>
  String(readFirst(depositAgreementOf(deposit), ["Code", "code", "contractNumber"])).trim();

const depositCurrencyOf = (deposit) =>
  String(readFirst(depositAgreementOf(deposit), ["Currency", "currency"])).trim();

const depositBalanceOf = (deposit) => {
  const balanceAccount = normalizeArray(deposit?.BalanceAccounts ?? deposit?.balanceAccounts)[0];
  return readFirst(balanceAccount, ["Balance", "balance"], 0);
};

const valueForField = (row, key) => {
  const { client = {}, accounts = [], credits = [], deposits = [] } = row;

  switch (key) {
    case "fio": return clientNameOf(client);
    case "client_code": return clientCodeOf(client, row.clientCode) || "—";
    case "inn": return clientInnOf(client) || "—";
    case "phones": return joinLines(clientPhonesOf(client));
    case "client_type": return String(client?.TypeExt?.Name ?? client?.typeExt?.name ?? readFirst(client, ["ClientTypeName", "client_type_name", "Type"])) || "—";
    case "resident": {
      const resident = client?.IsResident ?? client?.isResident ?? client?.is_resident;
      if (resident === undefined || resident === null || resident === "") return "—";
      return resident === true || resident === 1 || String(resident).toLowerCase() === "true" || String(resident) === "1"
        ? "Резидент РТ"
        : "Нерезидент РТ";
    }
    case "birth_date": return String(readFirst(client, ["BirthDate", "birthDate", "DateOfBirth", "dateOfBirth"], "—"));
    case "addresses": return joinLines(clientAddressesOf(client));
    case "department": return String(client?.Department?.Name ?? client?.Department?.Code ?? client?.department?.name ?? readFirst(client, ["dep_code"], "—"));
    case "documents": return joinLines(clientDocumentsOf(client));
    case "accounts_summary": return joinLines(accounts.map((account) => `${accountNumberOf(account)} | ${formatAmount(accountBalanceOf(account), accountCurrencyOf(account))}`));
    case "account_numbers": return joinLines(accounts.map(accountNumberOf));
    case "account_balances": return joinLines(accounts.map((account) => `${accountNumberOf(account)}: ${formatAmount(accountBalanceOf(account), accountCurrencyOf(account))}`));
    case "account_statuses": return joinLines(accounts.map((account) => `${accountNumberOf(account)}: ${account?.Status?.Name ?? account?.status?.name ?? readFirst(account, ["statusName"], "—")}`));
    case "account_open_dates": return joinLines(accounts.map((account) => `${accountNumberOf(account)}: ${readFirst(account, ["DateOpened", "dateOpened"], "—")}`));
    case "account_branches": return joinLines(accounts.map((account) => `${accountNumberOf(account)}: ${account?.Branch?.Name ?? account?.branch?.name ?? "—"}`));
    case "credits_summary": return joinLines(credits.map((credit) => `${creditNumberOf(credit) || "—"} | задолженность ${formatAmount(creditDebtOf(credit), creditCurrencyOf(credit))}`));
    case "credit_numbers": return joinLines(credits.map(creditNumberOf));
    case "credit_debts": return joinLines(credits.map((credit) => `${creditNumberOf(credit) || "—"}: ${formatAmount(creditDebtOf(credit), creditCurrencyOf(credit))}`));
    case "credit_amounts": return joinLines(credits.map((credit) => `${creditNumberOf(credit) || "—"}: ${formatAmount(readFirst(credit?.loanDetails?.params, ["amount"], readFirst(credit, ["amount", "Amount"])), creditCurrencyOf(credit))}`));
    case "credit_statuses": return joinLines(credits.map((credit) => `${creditNumberOf(credit) || "—"}: ${readFirst(credit?.loanDetails?.params, ["statusName"], readFirst(credit, ["statusName", "StatusName"], "—"))}`));
    case "credit_products": return joinLines(credits.map((credit) => `${creditNumberOf(credit) || "—"}: ${readFirst(credit?.loanDetails?.params, ["productName"], readFirst(credit, ["productName", "ProductName"], "—"))}`));
    case "credit_dates": return joinLines(credits.map((credit) => `${creditNumberOf(credit) || "—"}: ${readFirst(credit?.loanDetails?.params, ["startDate"], readFirst(credit, ["startDate"], "—"))} — ${readFirst(credit?.loanDetails?.params, ["endDate"], readFirst(credit, ["endDate"], "—"))}`));
    case "deposits_summary": return joinLines(deposits.map((deposit) => `${depositNumberOf(deposit) || "—"} | ${formatAmount(depositBalanceOf(deposit), depositCurrencyOf(deposit))}`));
    case "deposit_numbers": return joinLines(deposits.map(depositNumberOf));
    case "deposit_balances": return joinLines(deposits.map((deposit) => `${depositNumberOf(deposit) || "—"}: ${formatAmount(depositBalanceOf(deposit), depositCurrencyOf(deposit))}`));
    case "deposit_statuses": return joinLines(deposits.map((deposit) => `${depositNumberOf(deposit) || "—"}: ${depositAgreementOf(deposit)?.Status?.Name ?? depositAgreementOf(deposit)?.status?.name ?? "—"}`));
    case "deposit_products": return joinLines(deposits.map((deposit) => `${depositNumberOf(deposit) || "—"}: ${depositAgreementOf(deposit)?.Product?.Name ?? depositAgreementOf(deposit)?.product?.name ?? "—"}`));
    case "deposit_dates": return joinLines(deposits.map((deposit) => `${depositNumberOf(deposit) || "—"}: ${readFirst(depositAgreementOf(deposit), ["DateFrom", "dateFrom"], "—")} — ${readFirst(depositAgreementOf(deposit), ["DateTo", "dateTo"], "—")}`));
    default: return isCardFieldKey(key) ? formatCardFieldForTable(row, key) : "—";
  }
};

const mapWithConcurrency = async (items, concurrency, mapper, onSettled) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapper(items[index], index);
      } finally {
        onSettled?.(items[index], index);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
};

const productNeeds = (selectedFields) => {
  const hasPrefix = (prefix) => selectedFields.some((key) => key.startsWith(prefix));
  const cardDetails = selectedFields.some((key) => [
    "card_numbers",
    "card_types",
    "card_pc_statuses",
    "card_hot_statuses",
    "card_expiry_dates",
    "card_request_dates",
    "card_embossed_names",
    "card_accounts",
    "card_account_currencies",
    "card_abs_balances",
    "card_pc_balances",
    "card_pin_counters",
  ].includes(key));
  const cardServices = selectedFields.includes("card_notifications");
  const creditDetails = selectedFields.some((key) => ["credits_summary", "credit_debts", "credit_amounts", "credit_statuses", "credit_products", "credit_dates"].includes(key));
  return {
    cards: hasPrefix("card"),
    cardDetails,
    cardServices,
    accounts: hasPrefix("account") || selectedFields.includes("accounts_summary") || selectedFields.includes("card_abs_balances"),
    credits: hasPrefix("credit") || selectedFields.includes("credits_summary"),
    creditDetails,
    deposits: hasPrefix("deposit") || selectedFields.includes("deposits_summary"),
  };
};

const loadClientResult = async (inputRow, code, selectedFields) => {
  const needs = productNeeds(selectedFields);
  const [client, cardsValue, accountsValue, creditsValue, depositsValue] = await Promise.all([
    getClientByCode(code),
    needs.cards ? getUserCards(code) : [],
    needs.accounts ? getUserAccounts(code) : [],
    needs.credits ? getUserCredits(code) : [],
    needs.deposits ? getUserDeposits(code) : [],
  ]);

  const accounts = normalizeArray(accountsValue);
  let cards = normalizeArray(cardsValue);
  let credits = normalizeArray(creditsValue);
  const deposits = normalizeArray(depositsValue);

  if ((needs.cardDetails || needs.cardServices) && cards.length) {
    cards = await mapWithConcurrency(cards, 3, async (card) => {
      const cardId = cardIdOf(card);
      if (!cardId) return card;
      const [details, services] = await Promise.all([
        needs.cardDetails ? fetchCardDetails(cardId).catch(() => null) : null,
        needs.cardServices ? fetchCardServices(cardId).catch(() => []) : [],
      ]);
      return {
        ...card,
        details: details || card.details || null,
        services: needs.cardServices ? normalizeArray(services) : card.services,
      };
    });
  }

  if (needs.creditDetails && credits.length) {
    credits = await mapWithConcurrency(credits, 2, async (credit) => {
      const referenceId = String(readFirst(credit, ["referenceId", "ReferenceId"])).trim();
      if (!referenceId) return credit;
      try {
        return { ...credit, loanDetails: await fetchLoanDetails(referenceId) };
      } catch {
        return credit;
      }
    });
  }

  return {
    id: `${inputRow.sourceRow}-${code}-${Math.random().toString(16).slice(2)}`,
    inputValue: inputRow.value,
    sourceRow: inputRow.sourceRow,
    clientCode: code,
    status: "success",
    error: "",
    client,
    cards,
    accounts,
    credits,
    deposits,
  };
};

const getErrorMessage = (error) => {
  if (error?.response?.status === 404 || error?.status === 404) return "Клиент не найден";
  return error?.response?.data?.detail || error?.message || "Ошибка получения данных";
};

export default function BulkAbsSearchPage() {
  const { exportToExcel } = useExcelExport();
  const [identifierType, setIdentifierType] = useState("telefon");
  const [selectedFields, setSelectedFields] = useState(DEFAULT_FIELDS);
  const [file, setFile] = useState(null);
  const [inputRows, setInputRows] = useState([]);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const identifier = IDENTIFIER_OPTIONS.find((option) => option.value === identifierType) || IDENTIFIER_OPTIONS[0];
  const successCount = results.filter((result) => result.status === "success").length;
  const errorCount = results.length - successCount;
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const visibleResults = results.slice((page - 1) * pageSize, page * pageSize);
  const progressPercent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const resultColumns = useMemo(
    () => ALL_FIELDS.filter((field) => selectedFields.includes(field.key)),
    [selectedFields],
  );

  const resetLoadedData = () => {
    setInputRows([]);
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setPage(1);
    setMessage("");
    setError("");
  };

  const handleIdentifierChange = (event) => {
    setIdentifierType(event.target.value);
    setFile(null);
    resetLoadedData();
  };

  const parseFile = async (nextFile) => {
    setFile(nextFile);
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setPage(1);
    setMessage("");
    setError("");
    if (!nextFile) {
      setInputRows([]);
      return;
    }

    try {
      const buffer = await nextFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("В Excel-файле нет листов");

      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      if (!matrix.length) throw new Error("Excel-файл пуст");
      const headers = matrix[0].map((cell) => String(cell).trim().toLowerCase());
      const columnIndex = headers.indexOf(identifier.column.toLowerCase());
      if (columnIndex < 0) {
        throw new Error(`Не найдена колонка “${identifier.column}”. Выберите правильный идентификатор или скачайте шаблон.`);
      }

      const rows = matrix.slice(1).flatMap((source, index) => {
        const value = String(source[columnIndex] ?? "").trim();
        return value ? [{ value, sourceRow: index + 2 }] : [];
      });
      if (!rows.length) throw new Error(`В колонке “${identifier.column}” нет значений`);
      if (rows.some((row) => /e\+\d+/i.test(row.value))) {
        throw new Error(`Excel преобразовал идентификатор в научный формат. Задайте колонке “${identifier.column}” формат “Текст” и загрузите файл снова.`);
      }

      setInputRows(rows);
      const duplicateCount = rows.length - new Set(rows.map((row) => row.value)).size;
      setMessage(`Загружено строк: ${rows.length}${duplicateCount ? `. Повторяющихся значений: ${duplicateCount}` : ""}.`);
    } catch (parseError) {
      console.error(parseError);
      setInputRows([]);
      setError(parseError.message || "Не удалось прочитать Excel-файл");
    }
  };

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([[identifier.column], [identifier.example]]);
    sheet["!cols"] = [{ wch: Math.max(identifier.column.length + 4, 24) }];
    if (sheet.A2) {
      sheet.A2.t = "s";
      sheet.A2.z = "@";
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Идентификаторы");
    XLSX.writeFile(workbook, `Шаблон_${identifier.column}.xlsx`);
  };

  const toggleField = (key) => {
    setSelectedFields((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
    setResults([]);
    setPage(1);
  };

  const selectGroup = (group) => {
    const keys = group.fields.map((field) => field.key);
    setSelectedFields((current) => [...new Set([...current, ...keys])]);
    setResults([]);
    setPage(1);
  };

  const handleSearch = async () => {
    if (!inputRows.length) {
      setError(`Загрузите Excel-файл с колонкой “${identifier.column}”`);
      return;
    }
    if (!selectedFields.length) {
      setError("Выберите хотя бы одно поле для результата");
      return;
    }

    setIsProcessing(true);
    setError("");
    setMessage("");
    setResults([]);
    setPage(1);
    setProgress({ done: 0, total: inputRows.length });

    logAuditAction({
      action: "Пакетный поиск клиентов в АБС",
      details: `Идентификатор: ${identifier.label}; строк: ${inputRows.length}; полей: ${selectedFields.length}`,
    });

    try {
      const nestedResults = await mapWithConcurrency(
        inputRows,
        3,
        async (inputRow) => {
          try {
            const clientCodes = await resolveBulkClientCodes(identifierType, inputRow.value);
            if (!clientCodes.length) {
              return [{
                id: `${inputRow.sourceRow}-not-found`,
                inputValue: inputRow.value,
                sourceRow: inputRow.sourceRow,
                clientCode: "",
                status: "error",
                error: "Клиент не найден",
              }];
            }

            const clients = [];
            for (const code of clientCodes) {
              try {
                clients.push(await loadClientResult(inputRow, code, selectedFields));
              } catch (clientError) {
                clients.push({
                  id: `${inputRow.sourceRow}-${code}-error`,
                  inputValue: inputRow.value,
                  sourceRow: inputRow.sourceRow,
                  clientCode: code,
                  status: "error",
                  error: getErrorMessage(clientError),
                });
              }
            }
            return clients;
          } catch (lookupError) {
            return [{
              id: `${inputRow.sourceRow}-lookup-error`,
              inputValue: inputRow.value,
              sourceRow: inputRow.sourceRow,
              clientCode: "",
              status: "error",
              error: getErrorMessage(lookupError),
            }];
          }
        },
        () => setProgress((current) => ({ ...current, done: current.done + 1 })),
      );

      const nextResults = nestedResults.flat().filter(Boolean);
      setResults(nextResults);
      const found = nextResults.filter((result) => result.status === "success").length;
      const failed = nextResults.length - found;
      setMessage(`Обработка завершена. Найдено: ${found}${failed ? `, с ошибкой или не найдено: ${failed}` : ""}.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const selectedCardFields = resultColumns.filter((column) => isCardFieldKey(column.key)).map((column) => column.key);
    const cardColumns = buildCardExportColumns(results, selectedCardFields);
    let cardColumnsAdded = false;
    const requestedColumns = resultColumns.flatMap((column) => {
      if (isCardFieldKey(column.key)) {
        if (cardColumnsAdded) return [];
        cardColumnsAdded = true;
        return cardColumns;
      }
      return [{
        key: (row) => row.status === "success" ? valueForField(row, column.key) : "",
        label: column.label,
      }];
    });
    const columns = [
      { key: "sourceRow", label: "Строка Excel" },
      { key: "inputValue", label: identifier.label },
      { key: (row) => row.status === "success" ? "Найден" : "Ошибка", label: "Статус" },
      { key: (row) => row.error || "", label: "Комментарий" },
      ...requestedColumns,
    ];
    exportToExcel(results, columns, `Пакетный_поиск_АБС_${identifier.column}`);
  };

  return (
    <div className="bulk-abs-page">
      <Helmet>
        <title>Пакетный поиск АБС</title>
      </Helmet>

      <section className="bulk-abs-hero">
        <div>
          <span className="bulk-abs-eyebrow">Оператор • АБС</span>
          <h1>Пакетный поиск клиентов</h1>
          <p>Загрузите список идентификаторов, выберите нужные данные и получите единую таблицу с экспортом в Excel.</p>
        </div>
        <div className="bulk-abs-hero__icon"><Search size={30} /></div>
      </section>

      <section className="bulk-abs-panel">
        <div className="bulk-abs-steps">
          <span className="is-active">1. Идентификатор и файл</span>
          <span className={selectedFields.length ? "is-active" : ""}>2. Поля результата</span>
          <span className={results.length ? "is-active" : ""}>3. Таблица</span>
        </div>

        <div className="bulk-abs-upload-grid">
          <label className="bulk-abs-field">
            <span>Идентификатор</span>
            <select value={identifierType} onChange={handleIdentifierChange} disabled={isProcessing}>
              {IDENTIFIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.column})
                </option>
              ))}
            </select>
            <small>Точное имя колонки: <strong>{identifier.column}</strong></small>
          </label>

          <label className={`bulk-abs-file ${file ? "has-file" : ""}`}>
            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={isProcessing}
              onChange={(event) => parseFile(event.target.files?.[0] || null)}
            />
            {file ? <CheckCircle2 size={22} /> : <UploadCloud size={22} />}
            <span>{file ? file.name : "Выберите Excel-файл"}</span>
            <small>{inputRows.length ? `${inputRows.length} строк готово к обработке` : ".xlsx или .xls"}</small>
          </label>

          <button type="button" className="bulk-abs-button is-secondary" onClick={downloadTemplate} disabled={isProcessing}>
            <FileDown size={18} />
            Скачать шаблон
          </button>
        </div>

        {(message || error) && (
          <div className={`bulk-abs-message ${error ? "is-error" : "is-success"}`}>
            {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{error || message}</span>
          </div>
        )}
      </section>

      <section className="bulk-abs-panel">
        <div className="bulk-abs-panel__header">
          <div>
            <h2>Какие данные получить</h2>
            <p>Для карт каждый выбранный параметр, каждая карта и каждое её значение выгружаются в отдельные столбцы Excel.</p>
          </div>
          <div className="bulk-abs-inline-actions">
            <button type="button" onClick={() => { setSelectedFields(ALL_FIELDS.map((field) => field.key)); setResults([]); }}>Выбрать всё</button>
            <button type="button" onClick={() => { setSelectedFields(DEFAULT_FIELDS); setResults([]); }}>Основные</button>
            <button type="button" onClick={() => { setSelectedFields([]); setResults([]); }}>Снять выбор</button>
          </div>
        </div>

        <div className="bulk-abs-field-groups">
          {FIELD_GROUPS.map((group) => (
            <div className="bulk-abs-field-group" key={group.name}>
              <div className="bulk-abs-field-group__title">
                <strong>{group.name}</strong>
                <button type="button" onClick={() => selectGroup(group)}>Выбрать раздел</button>
              </div>
              <div className="bulk-abs-checks">
                {group.fields.map((field) => {
                  const checked = selectedFields.includes(field.key);
                  return (
                    <label key={field.key} className={checked ? "is-checked" : ""}>
                      <input type="checkbox" checked={checked} onChange={() => toggleField(field.key)} disabled={isProcessing} />
                      <span className="bulk-abs-checkbox">{checked && <Check size={13} />}</span>
                      <span>{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="bulk-abs-run-row">
          <span>Выбрано полей: <strong>{selectedFields.length}</strong> • Строк Excel: <strong>{inputRows.length}</strong></span>
          <button
            type="button"
            className="bulk-abs-button is-primary"
            onClick={handleSearch}
            disabled={isProcessing || !inputRows.length || !selectedFields.length}
          >
            {isProcessing ? <Loader2 className="bulk-abs-spin" size={18} /> : <Play size={18} />}
            {isProcessing ? "Получение данных..." : "Получить данные"}
          </button>
        </div>

        {isProcessing && (
          <div className="bulk-abs-progress" aria-label={`Обработано ${progress.done} из ${progress.total}`}>
            <div className="bulk-abs-progress__meta">
              <span>Обработано {progress.done} из {progress.total}</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="bulk-abs-progress__track"><span style={{ width: `${progressPercent}%` }} /></div>
          </div>
        )}
      </section>

      <section className="bulk-abs-panel bulk-abs-results">
        <div className="bulk-abs-panel__header">
          <div>
            <h2>Результаты</h2>
            <p>Всего строк: {results.length} • найдено: {successCount} • ошибки: {errorCount}</p>
          </div>
          <button type="button" className="bulk-abs-button is-export" onClick={handleExport} disabled={!results.length || isProcessing}>
            <Download size={18} />
            Экспортировать всё в Excel
          </button>
        </div>

        <div className="bulk-abs-table-wrap">
          <table className="bulk-abs-table">
            <thead>
              <tr>
                <th>Строка</th>
                <th>{identifier.label}</th>
                <th>Статус</th>
                {resultColumns.map((column) => <th key={column.key}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {!visibleResults.length ? (
                <tr>
                  <td colSpan={3 + resultColumns.length} className="bulk-abs-empty">
                    <FileSpreadsheet size={30} />
                    <strong>Результатов пока нет</strong>
                    <span>Загрузите Excel, выберите данные и запустите поиск.</span>
                  </td>
                </tr>
              ) : visibleResults.map((result) => (
                <tr key={result.id} className={result.status === "success" ? "" : "is-error"}>
                  <td>{result.sourceRow}</td>
                  <td className="bulk-abs-mono">{result.inputValue}</td>
                  <td>
                    <span className={`bulk-abs-status is-${result.status}`}>
                      {result.status === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {result.status === "success" ? "Найден" : result.error}
                    </span>
                  </td>
                  {resultColumns.map((column) => (
                    <td key={column.key} className="bulk-abs-multiline">
                      {result.status === "success" ? valueForField(result, column.key) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {results.length > 0 && (
          <div className="bulk-abs-pagination">
            <label>
              Строк на странице
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <span>Страница {page} из {totalPages}</span>
            <div>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}><ChevronLeft size={17} /></button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}><ChevronRight size={17} /></button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
