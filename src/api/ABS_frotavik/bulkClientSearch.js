import { apiClientABS_Frontovik } from "../utils/apiClientABS_Frontovik";

const ATM_BASE_URL = import.meta.env.VITE_BACKEND_ATM_SERVICE_URL;
const LOOKUP_CACHE_TTL = 60 * 1000;
const lookupCache = new Map();

const authScope = () => {
  try {
    return localStorage.getItem("access_token") || "anonymous";
  } catch {
    return "anonymous";
  }
};

const cachedLookup = (key, request) => {
  const now = Date.now();
  const scopedKey = `${authScope()}:${key}`;
  const cached = lookupCache.get(scopedKey);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = Promise.resolve()
    .then(request)
    .catch((error) => {
      lookupCache.delete(scopedKey);
      throw error;
    });
  lookupCache.set(scopedKey, { promise, expiresAt: now + LOOKUP_CACHE_TTL });
  return promise;
};

const unwrapItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload === undefined || payload === null || payload === "") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.result)) return payload.result;
  if (payload.data && typeof payload.data === "object") return [payload.data];
  return [payload];
};

const extractClientCode = (item) => {
  if (typeof item === "string" || typeof item === "number") {
    return String(item).trim();
  }
  return String(
    item?.Code ??
      item?.code ??
      item?.clicode ??
      item?.client_code ??
      item?.clientCode ??
      item?.ClientCode ??
      "",
  ).trim();
};

const uniqueClientCodes = (payload) =>
  [...new Set(unwrapItems(payload).map(extractClientCode).filter(Boolean))];

const fetchATM = async (path) => {
  if (!ATM_BASE_URL) {
    throw new Error("Не настроен адрес сервиса поиска клиентов");
  }

  const url = `${ATM_BASE_URL.replace(/\/$/, "")}${path}`;
  return cachedLookup(url, async () => {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const error = new Error(`Сервис поиска вернул HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  });
};

export const resolveBulkClientCodes = async (identifierType, rawValue) => {
  const value = String(rawValue ?? "").trim();
  const digits = value.replace(/\D/g, "");
  if (!value) return [];

  if (identifierType === "client_code") return [value];

  if (identifierType === "inn") {
    const data = await cachedLookup(`inn:${digits}`, async () => {
      const response = await apiClientABS_Frontovik(
        `/client/info/inn?inn=${encodeURIComponent(digits)}`,
      );
      return response.data;
    });
    return uniqueClientCodes(data);
  }

  let data;
  if (identifierType === "telefon") {
    data = await fetchATM(`/services/clientcode.php?phone=${encodeURIComponent(digits)}`);
  } else if (identifierType === "account_number") {
    data = await fetchATM(`/services/clientcode.php?acc=${encodeURIComponent(value)}`);
  } else if (identifierType === "card_id") {
    data = await fetchATM(`/services/innbyidn.php?cardidn=${encodeURIComponent(value)}`);
  } else {
    throw new Error("Неизвестный тип идентификатора");
  }

  return uniqueClientCodes(data);
};

