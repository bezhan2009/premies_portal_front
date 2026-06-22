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

export const getSystemDocxData = (uniqueIdFormat) => {
  const now = new Date();
  const storage = typeof window !== "undefined" ? window.localStorage : null;

  let uniqueId = "";
  if (uniqueIdFormat && typeof uniqueIdFormat === "string" && uniqueIdFormat.trim() !== "") {
    const yyyy = String(now.getFullYear());
    const yy = yyyy.slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    const seq = String(now.getTime()).slice(-6);

    uniqueId = uniqueIdFormat
      .replace(/YYYY/g, yyyy)
      .replace(/YY/g, yy)
      .replace(/MM/g, mm)
      .replace(/DD/g, dd)
      .replace(/HH/g, hh)
      .replace(/mm/g, min)
      .replace(/ss/g, ss)
      .replace(/RAND/g, rand)
      .replace(/SEQ/g, seq);
  } else {
    uniqueId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${now.getTime()}`;
  }

  return {
    "system.currentDate": now.toLocaleDateString("ru-RU"),
    "system.currentTime": now.toLocaleTimeString("ru-RU"),
    "system.currentDateTime": now.toLocaleString("ru-RU"),
    "system.currentYear": String(now.getFullYear()),
    "system.operatorName": storage?.getItem("operator_name") || storage?.getItem("username") || "Оператор",
    "system.operatorOffice": storage?.getItem("operator_office") || "",
    "system.operatorBranch": storage?.getItem("operator_branch") || "",
    "system.uniqueId": uniqueId,
  };
};

export const formatDocxDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(dateStr).trim())) {
      return String(dateStr).trim();
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[3]}.${match[2]}.${match[1]}`;
      }
      return dateStr;
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch (e) {
    return dateStr;
  }
};

export const formatDocxTime = (timeStr) => {
  if (!timeStr) return "";
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) {
      const match = String(timeStr).match(/(\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        return `${match[1]}:${match[2]}:${match[3]}`;
      }
      return timeStr;
    }
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${min}:${ss}`;
  } catch (e) {
    return timeStr;
  }
};

export const formatDocxDateTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr;
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
  } catch (e) {
    return dateStr;
  }
};

export const formatDocxValueByKey = (key, value) => {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  const keyLower = String(key).toLowerCase();

  if (value instanceof Date) {
    if (keyLower.includes("datetime") || keyLower.includes("createdat") || keyLower.includes("updatedat")) {
      return formatDocxDateTime(value.toISOString());
    }
    if (keyLower.includes("date")) {
      return formatDocxDate(value.toISOString());
    }
    if (keyLower.includes("time")) {
      return formatDocxTime(value.toISOString());
    }
  }

  if (typeof value === "string") {
    const isDatePattern = /^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{4}\/\d{2}\/\d{2}/.test(value);
    
    if (isDatePattern) {
      if (keyLower.includes("datetime") || keyLower.includes("createdat") || keyLower.includes("updatedat")) {
        return formatDocxDateTime(value);
      }
      if (keyLower.includes("date")) {
        return formatDocxDate(value);
      }
      if (keyLower.includes("time")) {
        return formatDocxTime(value);
      }
    }
  }

  return value;
};

export const extractDocxClientData = (client) => {
  if (!client) return {};

  const name = client.long_name || `${client.surname || ""} ${client.name || ""} ${client.patronymic || ""}`.trim();
  const code = client.client_code || "";
  const inn = client.tax_code || client.inn || "";
  
  let gender = "";
  if (client.Sex === "M" || client.Sex === "m" || String(client.Sex).toUpperCase() === "M") {
    gender = "Мужской";
  } else if (client.Sex === "F" || client.Sex === "f" || String(client.Sex).toUpperCase() === "F") {
    gender = "Женский";
  } else {
    gender = client.Sex || "";
  }

  const getValByCode = (codeStr) => {
    const upper = codeStr.toUpperCase();
    if (Array.isArray(client.ClientClassifier)) {
      const found = client.ClientClassifier.find(c => 
        c.Classifier?.Code?.toUpperCase() === upper || 
        c.Classifier?.Name?.toUpperCase() === upper
      );
      if (found) return found.Value?.Name || found.Value?.Value || null;
    }
    if (Array.isArray(client.AddInfoList)) {
      const found = client.AddInfoList.find(a => a.Code?.toUpperCase() === upper);
      if (found) return found.Value || null;
    }
    return null;
  };

  let docType = client.identdoc_name || "";
  let passSeries = client.identdoc_series || "";
  let passNumber = client.identdoc_num || "";
  let passIssueDate = client.identdoc_date || "";
  let passExpireDate = "";
  let passAuthority = client.identdoc_orgname || "";

  if (Array.isArray(client.RegistrationDocuments) && client.RegistrationDocuments.length > 0) {
    let doc = client.RegistrationDocuments.find(d => {
      const tName = String(d.Type?.Name || "").toLowerCase();
      return tName.includes("паспорт") || tName.includes("passport");
    });
    if (!doc) {
      doc = client.RegistrationDocuments[0];
    }
    if (doc) {
      docType = doc.Type?.Name || docType;
      passSeries = doc.Serie || passSeries;
      passNumber = doc.Number || passNumber;
      passIssueDate = doc.IssueDate || passIssueDate;
      passExpireDate = doc.ExpireDate || passExpireDate;
      passAuthority = doc.Authority || doc.IssueAuthority || passAuthority;
    }
  }

  let regAddress = "";
  let resAddress = "";

  if (Array.isArray(client.DetailedAddresses) && client.DetailedAddresses.length > 0) {
    const regAddrObj = client.DetailedAddresses.find(a => {
      const tName = String(a.Type?.Name || a.type?.name || "").toLowerCase();
      return tName.includes("юридическ") || tName.includes("регистрац") || tName.includes("прописк");
    }) || client.DetailedAddresses[0];

    const resAddrObj = client.DetailedAddresses.find(a => {
      const tName = String(a.Type?.Name || a.type?.name || "").toLowerCase();
      return tName.includes("фактическ") || tName.includes("проживан") || tName.includes("резиден");
    }) || client.DetailedAddresses[0];

    if (regAddrObj) {
      regAddress = regAddrObj.AddressString || `${regAddrObj.City?.Name || ""}, ${regAddrObj.Street?.Name || ""} ${regAddrObj.HouseNumber?.Value || ""}`.trim();
    }
    if (resAddrObj) {
      resAddress = resAddrObj.AddressString || `${resAddrObj.City?.Name || ""}, ${resAddrObj.Street?.Name || ""} ${resAddrObj.HouseNumber?.Value || ""}`.trim();
    }
  }

  let phone = client.phone || "";
  let mobilePhone = client.phone || "";
  let email = client.email || "";

  if (Array.isArray(client.ContactData) && client.ContactData.length > 0) {
    const phoneObj = client.ContactData.find(c => {
      const tName = String(c.Type?.Name || c.type?.name || "").toLowerCase();
      return tName.includes("мобильн") || tName.includes("телефон") || tName.includes("phone");
    });
    const emailObj = client.ContactData.find(c => {
      const tName = String(c.Type?.Name || c.type?.name || "").toLowerCase();
      return tName.includes("email") || tName.includes("почт");
    });

    if (phoneObj) {
      phone = phoneObj.Value || phone;
      mobilePhone = phoneObj.Value || mobilePhone;
    }
    if (emailObj) {
      email = emailObj.Value || email;
    }
  }

  return {
    "client.fullName": name,
    "client.firstName": client.name || client.FirstName || "",
    "client.lastName": client.surname || client.LastName || "",
    "client.middleName": client.patronymic || client.MiddleName || "",
    "client.clientCode": code,
    "client.pinfl": inn,
    "client.inn": inn,
    "client.gender": gender,
    "client.birthDate": formatDocxDate(client.BirthDate || client.birth_date || client.birthDate),
    "client.birthPlace": client.birth_place || client.birthPlace || "",
    "client.citizenship": client.citizenship || "",
    "client.documentType": docType,
    "client.passportSeries": passSeries,
    "client.passportNumber": passNumber,
    "client.passportIssueDate": formatDocxDate(passIssueDate),
    "client.passportExpireDate": formatDocxDate(passExpireDate),
    "client.passportAuthority": passAuthority,
    "client.registrationAddress": regAddress,
    "client.residenceAddress": resAddress,
    "client.phoneNumber": phone,
    "client.mobilePhone": mobilePhone,
    "client.email": email,
    "client.officeName": getValByCode("OFFICE") || getValByCode("BRANCH") || "",
    "client.managerName": getValByCode("MANAGER") || "",
    
    "client.companyName": client.company_name || client.companyName || name,
    "client.companyShortName": client.short_name || client.company_short_name || client.companyShortName || "",
    "client.companyInn": inn,
    "client.companyMfo": getValByCode("MFO") || "",
    "client.companyOkpo": getValByCode("OKPO") || "",
    "client.directorName": getValByCode("DIRECTOR") || getValByCode("DIR") || "",
    "client.accountantName": getValByCode("ACCOUNTANT") || getValByCode("BUHG") || "",
    "client.legalAddress": regAddress,
    "client.actualAddress": resAddress,
    "client.registrationDate": formatDocxDate(client.registrationDate || client.BirthDate || client.birth_date),
    "client.companyPhone": phone,
    "client.companyEmail": email,
  };
};

export const buildDocxPayload = (variant = {}, data = {}, overrides = {}, uniqueIdFormat = "") => {
  const source = {
    ...getSystemDocxData(uniqueIdFormat),
    ...data,
  };
  const payload = {
    ...data,
  };
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

  Object.entries(getSystemDocxData(uniqueIdFormat)).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      payload[key] = value;
    }
  });

  // Apply automatic formatting for date/time fields across the entire payload
  const formattedPayload = {};
  Object.entries(payload).forEach(([key, value]) => {
    formattedPayload[key] = formatDocxValueByKey(key, value);
  });

  return formattedPayload;
};

export const sanitizeDocxFileName = (value, fallback = "document") => {
  const safe = String(value || fallback)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();

  return safe || fallback;
};
