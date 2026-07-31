const EMPTY_OPERATORS = new Set(["is_empty", "is_not_empty"]);

export const DOCX_FILTER_OPERATORS = {
  number: [
    { value: "eq", label: "равно" },
    { value: "neq", label: "не равно" },
    { value: "gt", label: "больше" },
    { value: "gte", label: "больше или равно" },
    { value: "lt", label: "меньше" },
    { value: "lte", label: "меньше или равно" },
    { value: "is_empty", label: "не заполнено" },
    { value: "is_not_empty", label: "заполнено" },
  ],
  date: [
    { value: "eq", label: "равно дате" },
    { value: "neq", label: "не равно дате" },
    { value: "gt", label: "позже" },
    { value: "gte", label: "не раньше" },
    { value: "lt", label: "раньше" },
    { value: "lte", label: "не позже" },
    { value: "is_empty", label: "не заполнено" },
    { value: "is_not_empty", label: "заполнено" },
  ],
  text: [
    { value: "eq", label: "равно" },
    { value: "neq", label: "не равно" },
    { value: "contains", label: "содержит" },
    { value: "not_contains", label: "не содержит" },
    { value: "starts_with", label: "начинается с" },
    { value: "ends_with", label: "заканчивается на" },
    { value: "is_empty", label: "не заполнено" },
    { value: "is_not_empty", label: "заполнено" },
  ],
};

const createFilterId = () =>
  globalThis.crypto?.randomUUID?.() || `filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createDocxTableFilter = (field = "", type = "text") => ({
  id: createFilterId(),
  field,
  type,
  operator: type === "number" ? "gt" : "eq",
  value: "",
});

export const normalizeDocxTableFilters = (filters) => {
  if (!Array.isArray(filters)) {
    return [];
  }

  return filters
    .map((filter) => ({
      id: filter?.id || createFilterId(),
      field: String(filter?.field || "").trim(),
      type: ["number", "date", "text"].includes(filter?.type) ? filter.type : "text",
      operator: String(filter?.operator || "eq").trim(),
      value: filter?.value ?? "",
    }))
    .filter((filter) => filter.field && filter.operator);
};

export const docxFilterNeedsValue = (operator) => !EMPTY_OPERATORS.has(operator);

const getNestedValue = (row, path) => {
  if (!row || typeof row !== "object") {
    return undefined;
  }

  return String(path || "")
    .split(".")
    .reduce((current, segment) => {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      if (Object.prototype.hasOwnProperty.call(current, segment)) {
        return current[segment];
      }
      const actualKey = Object.keys(current).find(
        (key) => key.toLowerCase() === segment.toLowerCase(),
      );
      return actualKey ? current[actualKey] : undefined;
    }, row);
};

const isEmptyValue = (value) =>
  value === undefined || value === null || String(value).trim() === "";

const toComparableNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value ?? "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .match(/[+-]?\d+(?:\.\d+)?/u)?.[0];
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toComparableDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  }

  const normalized = String(value ?? "").trim();
  const localized = normalized.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})/u);
  if (localized) {
    const year = localized[3].length === 2 ? `20${localized[3]}` : localized[3];
    const parsed = Date.parse(`${year}-${localized[2].padStart(2, "0")}-${localized[1].padStart(2, "0")}T00:00:00`);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const date = new Date(parsed);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const matchesDocxTableFilter = (row, filter) => {
  const actual = getNestedValue(row, filter.field);
  if (filter.operator === "is_empty") {
    return isEmptyValue(actual);
  }
  if (filter.operator === "is_not_empty") {
    return !isEmptyValue(actual);
  }

  if (filter.type === "number") {
    const left = toComparableNumber(actual);
    const right = toComparableNumber(filter.value);
    if (left === null || right === null) {
      return false;
    }
    if (filter.operator === "eq") return left === right;
    if (filter.operator === "neq") return left !== right;
    if (filter.operator === "gt") return left > right;
    if (filter.operator === "gte") return left >= right;
    if (filter.operator === "lt") return left < right;
    if (filter.operator === "lte") return left <= right;
    return false;
  }

  if (filter.type === "date") {
    const left = toComparableDate(actual);
    const right = toComparableDate(filter.value);
    if (left === null || right === null) {
      return false;
    }
    if (filter.operator === "eq") return left === right;
    if (filter.operator === "neq") return left !== right;
    if (filter.operator === "gt") return left > right;
    if (filter.operator === "gte") return left >= right;
    if (filter.operator === "lt") return left < right;
    if (filter.operator === "lte") return left <= right;
    return false;
  }

  const left = String(actual ?? "").trim().toLocaleLowerCase("ru");
  const right = String(filter.value ?? "").trim().toLocaleLowerCase("ru");
  if (filter.operator === "eq") return left === right;
  if (filter.operator === "neq") return left !== right;
  if (filter.operator === "contains") return left.includes(right);
  if (filter.operator === "not_contains") return !left.includes(right);
  if (filter.operator === "starts_with") return left.startsWith(right);
  if (filter.operator === "ends_with") return left.endsWith(right);
  return false;
};

export const applyDocxTableFilters = (rows, filters, filterMode = "all") => {
  const normalizedFilters = normalizeDocxTableFilters(filters).filter(
    (filter) => !docxFilterNeedsValue(filter.operator) || String(filter.value).trim() !== "",
  );
  if (!Array.isArray(rows) || normalizedFilters.length === 0) {
    return Array.isArray(rows) ? rows : [];
  }

  return rows.filter((row) => {
    const matches = normalizedFilters.map((filter) => matchesDocxTableFilter(row, filter));
    return filterMode === "any" ? matches.some(Boolean) : matches.every(Boolean);
  });
};

const TABLE_EXPRESSION_SOURCE = /^eval:\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\|\|\s*\[\]\s*\)/u;

export const applyDocxMappingFilters = (source, mapping) => {
  const filters = normalizeDocxTableFilters(mapping?.filters);
  if (filters.length === 0) {
    return source;
  }

  const sourceName = String(mapping?.systemKey || "").match(TABLE_EXPRESSION_SOURCE)?.[1];
  if (!sourceName || !Array.isArray(source?.[sourceName])) {
    return source;
  }

  return {
    ...source,
    [sourceName]: applyDocxTableFilters(source[sourceName], filters, mapping?.filterMode),
  };
};
