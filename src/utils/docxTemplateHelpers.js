export const parseDocxJsonField = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Failed to parse DOCX JSON field:", error);
    return fallback;
  }
};

const firstFilledString = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

export const normalizeDocxKeyMapping = (mapping = {}) => {
  const legacyKey = firstFilledString(mapping.key);
  const docxKey = firstFilledString(
    mapping.docxKey,
    mapping.placeholderKey,
    mapping.placeholder,
    legacyKey,
    mapping.systemKey,
  );
  const systemKey = firstFilledString(
    mapping.systemKey,
    mapping.sourceKey,
    mapping.source,
    legacyKey,
    mapping.docxKey,
  );

  return {
    ...mapping,
    key: legacyKey || systemKey || docxKey,
    docxKey,
    systemKey,
    defaultValue: mapping.defaultValue ?? "",
    required: Boolean(mapping.required),
  };
};

export const normalizeDocxVariant = (variant = {}, index = 0) => ({
  name: variant.name || `Вариант ${index + 1}`,
  description: variant.description || "",
  outputFileName: variant.outputFileName || "",
  templatePath: variant.templatePath || "",
  keys: Array.isArray(variant.keys)
    ? variant.keys.map(normalizeDocxKeyMapping).filter((item) => item.docxKey || item.systemKey)
    : [],
});

export const normalizeDocxVariants = (variants) => {
  const parsed = parseDocxJsonField(variants, []);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map(normalizeDocxVariant);
};

export const normalizeDocxRoles = (roles) => {
  const parsed = parseDocxJsonField(roles, []);

  if (Array.isArray(parsed)) {
    return parsed.map((role) => Number(role)).filter((role) => !Number.isNaN(role));
  }

  if (typeof parsed === "number") {
    return [parsed];
  }

  if (typeof parsed === "string" && parsed.trim() !== "") {
    const role = Number(parsed);
    return Number.isNaN(role) ? [] : [role];
  }

  return [];
};

export const isEmptyDocxValue = (value) => value === undefined || value === null || value === "";

export const getValueByDocxPath = (source = {}, path = "") => {
  if (!path) {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(source, path)) {
    return source[path];
  }

  return path.split(".").reduce((current, segment) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    return current[segment];
  }, source);
};

export const getSystemDocxData = () => {
  const now = new Date();
  const storage = typeof window !== "undefined" ? window.localStorage : null;

  return {
    "system.currentDate": now.toLocaleDateString("ru-RU"),
    "system.currentTime": now.toLocaleTimeString("ru-RU"),
    "system.currentDateTime": now.toLocaleString("ru-RU"),
    "system.currentYear": String(now.getFullYear()),
    "system.operatorName": storage?.getItem("operator_name") || storage?.getItem("username") || "Оператор",
    "system.operatorOffice": storage?.getItem("operator_office") || "",
    "system.operatorBranch": storage?.getItem("operator_branch") || "",
    "system.uniqueId": `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${now.getTime()}`,
  };
};

export const buildDocxPayload = (variant = {}, data = {}, overrides = {}) => {
  const source = {
    ...getSystemDocxData(),
    ...data,
  };
  const payload = {};
  const keys = Array.isArray(variant.keys)
    ? variant.keys.map(normalizeDocxKeyMapping).filter((item) => item.docxKey)
    : [];

  keys.forEach((mapping) => {
    const overrideKey = mapping.docxKey || mapping.systemKey;
    const overrideValue = Object.prototype.hasOwnProperty.call(overrides, overrideKey)
      ? overrides[overrideKey]
      : undefined;
    const sourceValue = overrideValue !== undefined
      ? overrideValue
      : getValueByDocxPath(source, mapping.systemKey);

    payload[mapping.docxKey] = isEmptyDocxValue(sourceValue)
      ? mapping.defaultValue || ""
      : sourceValue;
  });

  Object.entries(getSystemDocxData()).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      payload[key] = value;
    }
  });

  return payload;
};

export const sanitizeDocxFileName = (value, fallback = "document") => {
  const safe = String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();

  return safe || fallback;
};
