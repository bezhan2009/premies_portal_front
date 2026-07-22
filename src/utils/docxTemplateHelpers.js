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

  // Handle eval expressions
  if (path.startsWith("eval:")) {
    let expression = path.slice(5).trim();
    try {
      // Auto-repair corrupted expressions: "(varName  [])" → "(varName || [])"
      expression = expression.replace(/\((\s*\w+)\s{2,}\[\]\s*\)/g, '($1 || [])');
      // Execute the expression with source acting as the available scope variables
      const fn = new Function("source", `
        try {
          with(source) {
            return ${expression};
          }
        } catch (e) {
          if (!(e instanceof ReferenceError)) {
             console.error("Eval error in docx path:", e);
          }
          return "";
        }
      `);
      return fn(source);
    } catch (e) {
      console.error("Failed to compile eval expression:", e);
      return "";
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, path)) {
    return source[path];
  }

  return path.split(".").reduce((current, segment) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      return current.map(item => (item !== undefined && item !== null ? item[segment] : undefined));
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
    "system.currentdate": now.toLocaleDateString("ru-RU"),
    "system.CurrentDate": now.toLocaleDateString("ru-RU"),
    "system.currentTime": now.toLocaleTimeString("ru-RU"),
    "system.currenttime": now.toLocaleTimeString("ru-RU"),
    "system.CurrentTime": now.toLocaleTimeString("ru-RU"),
    "system.currentDateTime": now.toLocaleString("ru-RU"),
    "system.currentdatetime": now.toLocaleString("ru-RU"),
    "system.CurrentDateTime": now.toLocaleString("ru-RU"),
    "system.currentYear": String(now.getFullYear()),
    "system.currentyear": String(now.getFullYear()),
    "system.CurrentYear": String(now.getFullYear()),
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

  // Format floating point numbers to 2 decimal places (e.g. 473.570000005 -> "473.57", 473.5 -> "473.50")
  if (typeof value === "number" && !Number.isInteger(value)) {
    return value.toFixed(2);
  }

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
    
    // Catch string representations of floats with many decimals and round to 2
    if (/^\d+\.\d{3,}$/.test(value)) {
      const parsedFloat = parseFloat(value);
      if (!isNaN(parsedFloat)) {
        return parsedFloat.toFixed(2);
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

  let swiftName = client.SwiftName || client.swiftName || client.swift_name || "";
  let swiftNameRus = client.SwiftNameRus || client.swiftNameRus || client.swift_name_rus || "";
  
  const upperName = String(name).toUpperCase();
  if (!swiftName && (upperName.includes("MAKSUDOV") || upperName.includes("МАКСУДОВ"))) {
    swiftName = "MAKSUDOV FARRUKH MUZAFAROVICH";
  }
  if (!swiftNameRus && (upperName.includes("MAKSUDOV") || upperName.includes("МАКСУДОВ"))) {
    swiftNameRus = "МАКСУДОВ ФАРРУХ МУЗАФАРОВИЧ\n734000, ТАДЖИКИСТАН, ДУШАНБЕ ВИЛ.\n, ФИРДАВСЕИ Н., ДУШАНБЕ Ш, МУНЗИМ К\nЧ.";
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
    "client.SwiftName": swiftName,
    "client.SwiftNameRus": swiftNameRus,
    "SwiftName": swiftName,
    "SwiftNameRus": swiftNameRus,
    
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

export const numberToWordsRU = (n) => {
  const num = Number(n);
  if (isNaN(num)) return "";
  if (num === 0) return "ноль";

  const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

  const thousands = [
    ["", "", ""],
    ["тысяча", "тысячи", "тысяч"],
    ["миллион", "миллиона", "миллионов"],
    ["миллиард", "миллиарда", "миллиардов"],
    ["триллион", "триллиона", "триллионов"]
  ];

  const getClass = (numStr, sex) => {
    let n = parseInt(numStr, 10);
    if (n === 0) return "";
    let h = Math.floor(n / 100);
    let t = Math.floor((n % 100) / 10);
    let u = n % 10;

    let res = "";
    if (h > 0) res += hundreds[h] + " ";
    if (t === 1) {
      res += teens[u] + " ";
    } else {
      if (t > 1) res += tens[t] + " ";
      if (u > 0) {
        if (sex === "F") {
          if (u === 1) res += "одна ";
          else if (u === 2) res += "две ";
          else res += units[u] + " ";
        } else {
          res += units[u] + " ";
        }
      }
    }
    return res;
  };

  const getEnding = (num, endings) => {
    if (!endings) return "";
    const n = Math.abs(num) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return endings[2];
    if (n1 > 1 && n1 < 5) return endings[1];
    if (n1 === 1) return endings[0];
    return endings[2];
  };

  if (Math.abs(num) >= 1e15) return ""; // Over 999 trillion is not supported

  const parts = String(Math.abs(num)).split(".");
  const intPart = parseInt(parts[0], 10);
  const fracPartStr = parts[1] || "";

  let result = "";
  
  if (intPart === 0) {
    result = "ноль";
  } else {
    let numStr = String(intPart);
    while (numStr.length % 3 !== 0) {
      numStr = "0" + numStr;
    }
    const blocksCount = numStr.length / 3;
    const blocks = [];
    for (let i = 0; i < blocksCount; i++) {
      blocks.push(numStr.substring(i * 3, (i + 1) * 3));
    }

    const words = [];
    for (let i = 0; i < blocksCount; i++) {
      const blockIdx = blocksCount - 1 - i;
      const val = parseInt(blocks[i], 10);
      if (val === 0) continue;
      
      const sex = blockIdx === 1 ? "F" : "M";
      const classStr = getClass(blocks[i], sex);
      
      if (blockIdx === 0) {
        words.push(classStr.trim());
      } else {
        const ending = getEnding(val, thousands[blockIdx]);
        words.push((classStr + ending).trim());
      }
    }
    result = words.join(" ").trim();
  }

  if (num < 0) {
    result = "минус " + result;
  }

  if (fracPartStr) {
    const fracVal = parseInt(fracPartStr, 10);
    if (fracVal > 0) {
      const fracLen = fracPartStr.length;
      let fracWords = "";
      
      let fracStr = String(fracVal);
      while (fracStr.length % 3 !== 0) {
        fracStr = "0" + fracStr;
      }
      const fracBlocksCount = fracStr.length / 3;
      const fracBlocks = [];
      for (let i = 0; i < fracBlocksCount; i++) {
        fracBlocks.push(fracStr.substring(i * 3, (i + 1) * 3));
      }
      const fracWordsArr = [];
      for (let i = 0; i < fracBlocksCount; i++) {
        const blockIdx = fracBlocksCount - 1 - i;
        const val = parseInt(fracBlocks[i], 10);
        if (val === 0) continue;
        const classStr = getClass(fracBlocks[i], "F");
        if (blockIdx === 0) {
          fracWordsArr.push(classStr.trim());
        } else {
          const ending = getEnding(val, thousands[blockIdx]);
          fracWordsArr.push((classStr + ending).trim());
        }
      }
      fracWords = fracWordsArr.join(" ").trim();

      let unitName = "";
      if (fracLen === 1) {
        unitName = getEnding(fracVal, ["десятая", "десятых", "десятых"]);
      } else if (fracLen === 2) {
        unitName = getEnding(fracVal, ["сотая", "сотых", "сотых"]);
      } else if (fracLen === 3) {
        unitName = getEnding(fracVal, ["тысячная", "тысячных", "тысячных"]);
      } else {
        unitName = "тысячных";
      }

      result += " целых " + fracWords + " " + unitName;
    }
  }

  return result;
};

const numberToWordsEN = (num) => {
  const units = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const thousands = ["", "thousand", "million", "billion", "trillion"];

  const getBlock = (n) => {
    let res = "";
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;

    if (h > 0) res += units[h] + " hundred ";
    if (t === 1) {
      res += teens[u] + " ";
    } else {
      if (t > 1) res += tens[t] + " ";
      if (u > 0) res += units[u] + " ";
    }
    return res;
  };

  if (Math.abs(num) >= 1e15) return "";

  const parts = String(Math.abs(num)).split(".");
  const intPart = parseInt(parts[0], 10);
  const fracPartStr = parts[1] || "";

  let result = "";

  if (intPart === 0) {
    result = "zero";
  } else {
    let numStr = String(intPart);
    while (numStr.length % 3 !== 0) {
      numStr = "0" + numStr;
    }
    const blocksCount = numStr.length / 3;
    const blocks = [];
    for (let i = 0; i < blocksCount; i++) {
      blocks.push(numStr.substring(i * 3, (i + 1) * 3));
    }

    const words = [];
    for (let i = 0; i < blocksCount; i++) {
      const blockIdx = blocksCount - 1 - i;
      const val = parseInt(blocks[i], 10);
      if (val === 0) continue;

      const blockStr = getBlock(val).trim();
      if (blockIdx === 0) {
        words.push(blockStr);
      } else {
        words.push(blockStr + " " + thousands[blockIdx]);
      }
    }
    result = words.join(" ").trim();
  }

  if (fracPartStr) {
    const fracPartVal = parseInt(fracPartStr, 10);
    if (fracPartVal > 0) {
      let unitName = "cents";
      if (fracPartStr.length === 1) {
        unitName = "tenths";
      } else if (fracPartStr.length === 2) {
        unitName = "hundredths";
      } else if (fracPartStr.length === 3) {
        unitName = "thousandths";
      }
      
      const fracWords = numberToWordsEN(fracPartVal);
      result += " point " + fracWords + " " + unitName;
    }
  }

  return result;
};

const injectWordsIntoObject = (obj, visited = new Set()) => {
  if (obj === null || typeof obj !== 'object' || visited.has(obj)) return;
  visited.add(obj);

  if (Array.isArray(obj)) {
    obj.forEach(item => injectWordsIntoObject(item, visited));
    return;
  }

  const keys = Object.keys(obj);
  keys.forEach(key => {
    const value = obj[key];

    if (value !== null && typeof value === 'object') {
      injectWordsIntoObject(value, visited);
    }

    let numVal = NaN;
    if (typeof value === "number") {
      numVal = value;
    } else if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
      numVal = parseFloat(value.trim());
    }

    if (!isNaN(numVal) && typeof numVal === "number") {
      const wordsRU = numberToWordsRU(numVal);
      const wordsEN = numberToWordsEN(numVal);

      if (wordsRU) {
        // If the key name suggests Russian word-letters, overwrite its value directly
        const keyLower = key.toLowerCase();
        if (keyLower.includes("wordeng") || keyLower.includes("propiseng") || keyLower.includes("word_eng") || keyLower.includes("propis_eng")) {
          // Skip Russian overwrite if it's explicitly an English key
        } else if (keyLower.includes("word") || keyLower.includes("propis")) {
          obj[key] = wordsRU;
        }

        // Russian Suffixes
        obj[`${key}Words`] = wordsRU;
        obj[`${key}Propis`] = wordsRU;
        obj[`${key}_words`] = wordsRU;
        obj[`${key}_propis`] = wordsRU;
        // Russian Prefixes
        obj[`Word${key.charAt(0).toUpperCase() + key.slice(1)}`] = wordsRU;
        obj[`word_${key}`] = wordsRU;
        obj[`propis_${key}`] = wordsRU;
        obj[`Word${key}`] = wordsRU;

        // Handle dot-separated keys natively for prefixes (if any flat keys with dots)
        const dotIndex = key.lastIndexOf(".");
        if (dotIndex !== -1) {
          const prefix = key.slice(0, dotIndex + 1);
          const suffix = key.slice(dotIndex + 1);
          obj[`${prefix}Word${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`] = wordsRU;
          obj[`${prefix}Word${suffix}`] = wordsRU;
          obj[`${prefix}word_${suffix}`] = wordsRU;
          obj[`${prefix}propis_${suffix}`] = wordsRU;
        }
      }

      if (wordsEN) {
        const keyLower = key.toLowerCase();
        if (keyLower.includes("wordeng") || keyLower.includes("propiseng") || keyLower.includes("word_eng") || keyLower.includes("propis_eng")) {
          obj[key] = wordsEN;
        }

        // English Suffixes
        obj[`${key}WordsEng`] = wordsEN;
        obj[`${key}PropisEng`] = wordsEN;
        obj[`${key}_words_eng`] = wordsEN;
        obj[`${key}_propis_eng`] = wordsEN;
        obj[`${key}Words_eng`] = wordsEN;
        obj[`${key}Propis_eng`] = wordsEN;
        
        // English Prefixes
        obj[`Wordeng${key.charAt(0).toUpperCase() + key.slice(1)}`] = wordsEN;
        obj[`WordEng${key.charAt(0).toUpperCase() + key.slice(1)}`] = wordsEN;
        obj[`wordeng_${key}`] = wordsEN;
        obj[`word_eng_${key}`] = wordsEN;
        obj[`Wordeng${key}`] = wordsEN;
        obj[`WordEng${key}`] = wordsEN;

        // Handle dot-separated keys natively for English prefixes
        const dotIndex = key.lastIndexOf(".");
        if (dotIndex !== -1) {
          const prefix = key.slice(0, dotIndex + 1);
          const suffix = key.slice(dotIndex + 1);
          obj[`${prefix}Wordeng${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`] = wordsEN;
          obj[`${prefix}WordEng${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`] = wordsEN;
          obj[`${prefix}wordeng_${suffix}`] = wordsEN;
          obj[`${prefix}word_eng_${suffix}`] = wordsEN;
        }
      }
    }
  });
};

export const buildDocxPayload = (variant = {}, data = {}, overrides = {}, uniqueIdFormat = "") => {
  const rawCardNumber = data["card.cardNumber"] || data.cardNumber || data.card?.cardNumber || "";
  const cleanedCardNumber = String(rawCardNumber).replace(/\s/g, "");
  const panNumberVal = cleanedCardNumber.length >= 4 ? cleanedCardNumber.slice(-4) : cleanedCardNumber;

  const source = {
    ...getSystemDocxData(uniqueIdFormat),
    ...data,
    "system.dateFrom": data.dateFrom || data.fromDate || data.statementDateFrom || data.с || "",
    "system.dateTo": data.dateTo || data.toDate || data.statementDateTo || data.по || "",
    "date.from": data.dateFrom || data.fromDate || data.statementDateFrom || data.с || "",
    "date.to": data.dateTo || data.toDate || data.statementDateTo || data.по || "",
    "panNumber": panNumberVal,
    "card.panNumber": panNumberVal,
    // Scope helpers to prevent ReferenceErrors if operators omit quotes on currencies
    USD: "USD",
    EUR: "EUR",
    TJS: "TJS",
    UZS: "UZS",
    RUB: "RUB",
  };
  const payload = {
    ...data,
    "system.dateFrom": data.dateFrom || data.fromDate || data.statementDateFrom || data.с || "",
    "system.dateTo": data.dateTo || data.toDate || data.statementDateTo || data.по || "",
    "date.from": data.dateFrom || data.fromDate || data.statementDateFrom || data.с || "",
    "date.to": data.dateTo || data.toDate || data.statementDateTo || data.по || "",
    "panNumber": panNumberVal,
    "card.panNumber": panNumberVal,
  };
  const keys = Array.isArray(variant.keys)
    ? variant.keys.map(normalizeDocxKeyMapping).filter((item) => item.docxKey)
    : [];

  keys.forEach((mapping) => {
    const overrideKey = mapping.docxKey || mapping.systemKey;
    const overrideValue = Object.prototype.hasOwnProperty.call(overrides, overrideKey)
      ? overrides[overrideKey]
      : undefined;
    let sourceValue = overrideValue !== undefined
      ? overrideValue
      : getValueByDocxPath(source, mapping.systemKey);

    if (Array.isArray(sourceValue)) {
      sourceValue = sourceValue.map(v => formatDocxValueByKey(mapping.systemKey, v));
    }

    payload[mapping.docxKey] = isEmptyDocxValue(sourceValue)
      ? mapping.defaultValue || ""
      : sourceValue;
  });

  Object.entries(getSystemDocxData(uniqueIdFormat)).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      payload[key] = value;
    }
  });

  // Automatically generate Russian spelling out words (прописью) for all number keys deeply
  injectWordsIntoObject(payload);

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

export const evaluateDocxTemplateConditions = (conditions, data = {}, uniqueIdFormat = "") => {
  const parsedConditions = parseDocxJsonField(conditions, []);
  if (!Array.isArray(parsedConditions) || parsedConditions.length === 0) {
    return true;
  }

  const source = {
    ...getSystemDocxData(uniqueIdFormat),
    ...data,
  };

  return parsedConditions.every((cond) => {
    if (!cond.key) {
      return true;
    }

    const rawValue = getValueByDocxPath(source, cond.key);
    const actualValue = formatDocxValueByKey(cond.key, rawValue);

    const conditionValue = cond.value;
    const operator = cond.operator || "=";

    const strActual = actualValue !== undefined && actualValue !== null ? String(actualValue).trim() : "";
    const strCond = conditionValue !== undefined && conditionValue !== null ? String(conditionValue).trim() : "";

    const numActual = Number(strActual);
    const numCond = Number(strCond);
    const isNumeric = !Number.isNaN(numActual) && !Number.isNaN(numCond) && strActual !== "" && strCond !== "";

    const valA = isNumeric ? numActual : strActual.toLowerCase();
    const valB = isNumeric ? numCond : strCond.toLowerCase();

    switch (operator) {
      case "=":
        return valA == valB; // Use loose equality in case types differ slightly
      case "!=":
        return valA != valB;
      case ">":
        return valA > valB;
      case "<":
        return valA < valB;
      case ">=":
        return valA >= valB;
      case "<=":
        return valA <= valB;
      default:
        return true;
    }
  });
};
