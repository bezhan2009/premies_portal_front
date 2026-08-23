export const isQuestionnaireFieldValid = (field, values) => {
  const value = values?.[field.name];
  if (field.boolean) return typeof value === "boolean";
  if (field.optional && String(value || "").trim().length === 0) return true;
  if (field.validate) return field.validate(value, values || {});
  return String(value || "").trim().length > 0;
};

export const isTerrorScreeningReady = ({ lastName, firstName, birthDate }) =>
  [lastName, firstName, birthDate].every(
    (value) => String(value || "").trim().length > 0,
  );

export const getComplianceLookupStateForScreening = ({
  identifier,
  isResident,
  complianceCheck = {},
}) => {
  const normalizedIdentifier = String(identifier || "").replace(/\s/g, "");
  if (!/^\d{9,14}$/.test(normalizedIdentifier)) {
    const validForeignIdentifier = /^[A-Za-z0-9-]{5,32}$/.test(normalizedIdentifier);
    return {
      pending: isResident !== false || !validForeignIdentifier,
      isWhiteListed: false,
    };
  }

  const resultMatchesIdentifier = complianceCheck.identifier === normalizedIdentifier;
  const lookupResolved = resultMatchesIdentifier
    && (complianceCheck.state === "checked" || complianceCheck.state === "error");
  const isWhiteListed = lookupResolved
    && complianceCheck.state === "checked"
    && complianceCheck.matched
    && complianceCheck.listType === "white";

  return { pending: !lookupResolved, isWhiteListed };
};

export const buildNewClientStatusReasons = ({
  complianceCheck = {},
  terrorScreening = {},
  complianceLookupPending = false,
  isWhiteListed = false,
  values = {},
}) => {
  const reasons = [];

  if (complianceLookupPending) {
    reasons.push({ tone: "checking", text: "Проверка ИНН по базе Compliance…" });
  } else if (complianceCheck.state === "loading") {
    reasons.push({ tone: "checking", text: "Проверка ИНН по базе Compliance…" });
  } else if (complianceCheck.state === "error") {
    reasons.push({ tone: "danger", text: "Не удалось выполнить проверку Compliance" });
  } else if (complianceCheck.state === "checked") {
    if (!complianceCheck.matched) {
      reasons.push({ tone: "success", text: "Клиент не найден в черных списках" });
    } else if (complianceCheck.listType === "black") {
      reasons.push({ tone: "danger", text: "Клиент в черных списках" });
    } else if (isWhiteListed) {
      reasons.push({ tone: "success", text: "Клиент в белом списке — совпадения по спискам игнорируются" });
    }
  }

  if (!isWhiteListed && !complianceLookupPending) {
    if (terrorScreening.state === "checking") {
      reasons.push({ tone: "checking", text: "Проверка ФИО по внешнему списку…" });
    } else if (terrorScreening.state === "error") {
      reasons.push({ tone: "danger", text: "Внешняя проверка недоступна — отправка будет перепроверена сервером" });
    } else if (terrorScreening.state === "matched") {
      reasons.push({ tone: "danger", text: "Найдено совпадение в террористическом списке — заявка уйдёт в Compliance" });
    } else if (terrorScreening.state === "clear") {
      reasons.push({ tone: "success", text: "Совпадений в террористическом списке не найдено" });
    }
  }

  if (values.is_resident === false) {
    reasons.push({ tone: "warning", text: "Клиент нерезидент" });
  }
  if (values.fatca === true || values.apl_pzl === true) {
    reasons.push({ tone: "warning", text: "Требуется проверка Compliance" });
  }
  if (reasons.length === 0) {
    reasons.push({ tone: "neutral", text: "Заполните ИНН, ФИО и дату рождения для проверки" });
  }

  return reasons;
};
