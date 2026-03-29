import { TYPE_SEARCH_CLIENT } from "../../../const/defConst.js";

/**
 * Нормализует данные клиента в зависимости от типа поиска.
 * @param {Object} client - Данные клиента из API
 * @param {string} searchType - Тип поиска
 * @returns {Object} Нормализованные данные
 */
export const normalizeClientData = (client, searchType) => {
  // Если это поиск по телефону - данные уже в нужном формате
  if (searchType === TYPE_SEARCH_CLIENT[0].value) {
    return client;
  }

  // Для поиска по ИНН и коду клиента - преобразуем формат
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
