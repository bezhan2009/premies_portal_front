import { TYPE_SEARCH_CLIENT } from "../../../const/defConst.js";

/**
 * Нормализует данные клиента в зависимости от типа поиска.
 * @param {Object} client - Данные клиента из API
 * @param {string} searchType - Тип поиска
 * @returns {Object} Нормализованные данные
 */
export const normalizeClientData = (client, searchType) => {
  const isPhoneSearch = searchType === TYPE_SEARCH_CLIENT[0].value;

  if (isPhoneSearch) {
    const rawLongName = client.long_name || client.LongName || `${client.surname || ""} ${client.name || ""} ${client.patronymic || ""}`.trim();
    const rawType = client.client_type || client.Type || (client.client_type_name?.toLowerCase().includes("юр") ? "corporate" : "individual");
    return {
      ...client,
      long_name: rawLongName,
      client_type: rawType,
    };
  }

  const rawLongName = client.LongName || client.long_name || `${client.LastName || ""} ${client.FirstName || ""} ${client.MiddleName || ""}`.trim();
  const rawType = client.Type || client.client_type || (client.TypeExt?.Name?.toLowerCase().includes("юр") ? "corporate" : "individual");

  return {
    phone: client.ContactData?.[0]?.Value || "",
    arc_flag: "",
    client_type_name: client.TypeExt?.Name || "",
    ban_acc_open_flag: "",
    dep_code: client.Department?.Code || "",
    client_code: client.Code || "",
    surname: client.LastName || "",
    name: client.FirstName || "",
    patronymic: client.MiddleName || "",
    ltn_surname: client.LatinLastName || "",
    ltn_name: client.LatinFirstName || "",
    ltn_patronymic: client.LatinMiddleName || "",
    tax_code: client.TaxIdentificationNumber?.Code || "",
    identdoc_name: client.IdentDocs?.[0]?.Type?.Name || "",
    identdoc_series: client.IdentDocs?.[0]?.Series || "",
    identdoc_num: client.IdentDocs?.[0]?.Number || "",
    identdoc_date: client.IdentDocs?.[0]?.IssueDate || "",
    identdoc_orgname: client.IdentDocs?.[0]?.IssueOrganization || "",
    sv_id:
      client.ExternalSystemCodes?.ExternalCode?.find(
        (c) => c.System?.Code === "SVPC",
      )?.Code || "",
    long_name: rawLongName,
    client_type: rawType,
  };
};

/**
 * Форматирует номер телефона для отображения.
 * @param {string} value - Исходный номер
 * @returns {string} Отформатированный номер
 */
export const formatPhoneNumber = (value) => {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  return cleaned;
};

/**
 * Копирует текст в буфер обмена.
 * @param {string} text - Текст для копирования
 * @returns {Promise<boolean>} Успешно или нет
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy: ", err);
    return false;
  }
};
