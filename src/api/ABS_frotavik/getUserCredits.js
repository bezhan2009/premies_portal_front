import { apiClientABS_Frontovik } from "../utils/apiClientABS_Frontovik";

const ABS_CACHE_TTL = 60 * 1000;
const absRequestCache = new Map();

const authCacheScope = () => {
  try { return localStorage.getItem("access_token") || "anonymous"; }
  catch { return "anonymous"; }
};

const cachedABSRequest = (key, request, ttl = ABS_CACHE_TTL) => {
  const now = Date.now();
  const scopedKey = `${authCacheScope()}:${key}`;
  const cached = absRequestCache.get(scopedKey);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = Promise.resolve()
    .then(request)
    .catch((error) => {
      absRequestCache.delete(scopedKey);
      throw error;
    });
  absRequestCache.set(scopedKey, { promise, expiresAt: now + ttl });
  return promise;
};

export const getUserCards = async (clientIndex) => {
  try {
    return await cachedABSRequest(`cards:${clientIndex}`, async () => {
      const res = await apiClientABS_Frontovik(
        "/cards?clientIndex=" + clientIndex,
      );
      return res.data;
    });
  } catch (err) {
    console.log(err);
  }
};

export const getUserAccounts = async (clientIndex) => {
  try {
    return await cachedABSRequest(`accounts:${clientIndex}`, async () => {
      const res = await apiClientABS_Frontovik(
        "/accounts?clientIndex=" + clientIndex,
      );
      return res.data;
    });
  } catch (err) {
    console.log(err);
  }
};

export const getUserCredits = async (clientIndex) => {
  try {
    return await cachedABSRequest(`credits:${clientIndex}`, async () => {
      const res = await apiClientABS_Frontovik(
        "/credits?clientIndex=" + clientIndex,
      );
      return res.data;
    });
  } catch (err) {
    console.log(err);
  }
};

export const getUserDeposits = async (clientIndex) => {
  try {
    const data = await cachedABSRequest(`deposits:${clientIndex}`, async () => {
      const res = await apiClientABS_Frontovik(
        "/deposits?clientIndex=" + clientIndex,
      );
      return res.data;
    });
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    if (data && Array.isArray(data.deposits)) {
      return data.deposits;
    }
    if (data && typeof data === "object" && Object.keys(data).length > 0) {
      return [data];
    }
    return [];
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const fetchDepositSchedule = async (colvirReferenceId) => {
  try {
    const res = await apiClientABS_Frontovik(
      "/credits/graphs?referenceId=" + encodeURIComponent(colvirReferenceId),
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    if (res.data && Array.isArray(res.data.schedule)) {
      return res.data.schedule;
    }
    return [];
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const getUserInfoPhone = async (clientNumber) => {
  try {
    const res = await apiClientABS_Frontovik("account/user/" + clientNumber);
    return res.data;
  } catch (err) {
    console.log(err);
  }
};

export const repayLoanEarly = async (repayData) => {
  try {
    const res = await apiClientABS_Frontovik.post("/credits/repay", repayData);
    return res.data;
  } catch (err) {
    console.error("Error in repayLoanEarly:", err);
    throw err;
  }
};

export const fetchCreditGraphs = async (referenceId) => {
  try {
    return await cachedABSRequest(`credit-graphs:${referenceId}`, async () => {
      const res = await apiClientABS_Frontovik(
        "/credits/graphs?referenceId=" + referenceId
      );
      return res.data;
    });
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const getClientByCode = async (clientIndex) => {
  try {
    return await cachedABSRequest(`client:${clientIndex}`, async () => {
      const res = await apiClientABS_Frontovik(
        "/client/info/client-index?clientIndex=" + clientIndex,
      );
      return res.data;
    });
  } catch (err) {
    console.error("getClientByCode error:", err);
    throw err;
  }
};
