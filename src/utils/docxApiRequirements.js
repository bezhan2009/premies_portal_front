const SOURCE_DEFINITIONS = {
  processing_transactions: {
    title: "Выписка из ПЦ",
    source: "processing_transactions",
    description:
      "Для точного поиска транзакций процессинга нужен ID карты и период. Без cardId сервис может вернуть неполные или чужие данные.",
    fields: [
      {
        key: "cardId",
        label: "ID карты",
        required: true,
        placeholder: "100002602016",
        dataAliases: ["cardId", "card.cardId"],
      },
      {
        key: "fromDate",
        label: "Период от",
        required: true,
        type: "date",
        root: true,
        placeholder: "2026-07-01",
      },
      {
        key: "toDate",
        label: "Период до",
        required: true,
        type: "date",
        root: true,
        placeholder: "2026-07-22",
      },
    ],
  },
  transactions: {
    title: "Выписка по счету / операции",
    source: "transactions",
    description:
      "Для операций нужен номер счета или ID карты, плюс период. Если переданы оба значения, cardId используется для поиска процессинговых операций, accountNumber — для ABS/Frontovik.",
    oneOf: ["accountNumber", "cardId"],
    fields: [
      {
        key: "accountNumber",
        label: "Номер счета",
        required: false,
        placeholder: "20202972881304387302",
        dataAliases: ["accountNumber", "account.number"],
      },
      {
        key: "cardId",
        label: "ID карты",
        required: false,
        placeholder: "100002602016",
        dataAliases: ["cardId", "card.cardId"],
      },
      {
        key: "fromDate",
        label: "Период от",
        required: true,
        type: "date",
        root: true,
        placeholder: "2026-07-01",
      },
      {
        key: "toDate",
        label: "Период до",
        required: true,
        type: "date",
        root: true,
        placeholder: "2026-07-22",
      },
    ],
  },
  schedule: {
    title: "График кредита",
    source: "schedule",
    description:
      "Для графика кредита нужно явно передать referenceId кредита, например значение colvirReferenceId.",
    fields: [
      {
        key: "creditId",
        label: "ID кредита / colvirReferenceId",
        required: true,
        placeholder: "63_40631080",
        dataAliases: ["creditId", "credit.referenceId"],
      },
    ],
  },
};

const ROOT_DEFAULTS = {
  clientCode: "00012345",
  fromDate: "2026-07-01",
  toDate: "2026-07-22",
};

const FIELD_DEFAULTS = {
  cardId: "100002602016",
  accountNumber: "20202972881304387302",
  creditId: "63_40631080",
};

const normalizeSystemKey = (mapping = {}) =>
  String(mapping.systemKey || mapping.key || mapping.value || "");

const systemKeyUsesSource = (systemKey, source) => {
  const value = String(systemKey || "");
  return (
    value.includes(`${source}.`) ||
    value.includes(`${source} ||`) ||
    value.includes(`${source}||`) ||
    value.includes(`(${source} ||`) ||
    value.includes(`(${source}||`) ||
    value.includes(`[${source}]`) ||
    value === source
  );
};

export const getVariantDynamicRequirements = (variant = {}) => {
  const keys = Array.isArray(variant.keys) ? variant.keys : [];
  const usedSources = new Set();

  keys.forEach((mapping) => {
    const systemKey = normalizeSystemKey(mapping);
    Object.keys(SOURCE_DEFINITIONS).forEach((source) => {
      if (systemKeyUsesSource(systemKey, source)) {
        usedSources.add(source);
      }
    });
  });

  if (usedSources.has("processing_transactions")) {
    usedSources.delete("transactions");
  }

  return Array.from(usedSources).map((source) => SOURCE_DEFINITIONS[source]);
};

export const createExternalDocxTestInputs = (variant = {}) => {
  const requirements = getVariantDynamicRequirements(variant);
  const inputs = {};

  requirements.forEach((requirement) => {
    requirement.fields.forEach((field) => {
      if (field.root) {
        inputs[field.key] = ROOT_DEFAULTS[field.key] || "";
        return;
      }

      if (!(field.key in inputs)) {
        inputs[field.key] = FIELD_DEFAULTS[field.key] || "";
      }
    });
  });

  return inputs;
};

export const buildDocxApiDataExample = (requirements = []) => {
  const data = {};

  requirements.forEach((requirement) => {
    requirement.fields.forEach((field) => {
      if (field.root || !Array.isArray(field.dataAliases)) {
        return;
      }

      const value = FIELD_DEFAULTS[field.key] || field.placeholder || "";
      field.dataAliases.forEach((alias) => {
        data[alias] = value;
      });
    });
  });

  return data;
};

export const buildExternalDocxApiPayload = ({
  templateId,
  templatePath,
  format = "pdf",
  inputs = {},
  requirements = [],
}) => {
  const payload = {
    format,
  };

  if (String(inputs.clientCode || "").trim()) {
    payload.clientCode = String(inputs.clientCode).trim();
  }

  if (templateId) {
    payload.templateId = templateId;
  }

  if (templatePath) {
    payload.templatePath = templatePath;
  }

  if (inputs.fromDate) {
    payload.fromDate = inputs.fromDate;
  }

  if (inputs.toDate) {
    payload.toDate = inputs.toDate;
  }

  const data = {};
  requirements.forEach((requirement) => {
    requirement.fields.forEach((field) => {
      if (field.root || !Array.isArray(field.dataAliases)) {
        return;
      }

      const value = inputs[field.key];
      if (!value) {
        return;
      }

      field.dataAliases.forEach((alias) => {
        data[alias] = value;
      });
    });
  });

  if (Object.keys(data).length > 0) {
    payload.data = data;
  }

  return payload;
};

export const validateExternalDocxInputs = (requirements = [], inputs = {}) => {
  const missing = [];

  requirements.forEach((requirement) => {
    requirement.fields
      .filter((field) => field.required)
      .forEach((field) => {
        if (!String(inputs[field.key] || "").trim()) {
          missing.push(field.label || field.key);
        }
      });

    if (Array.isArray(requirement.oneOf) && requirement.oneOf.length > 0) {
      const hasOneValue = requirement.oneOf.some((key) => String(inputs[key] || "").trim());
      if (!hasOneValue) {
        missing.push(requirement.oneOf.join(" или "));
      }
    }
  });

  return missing;
};
