import { apiClient } from "./utils/apiClient.js";

const PREFIX = "/merchant-pos-terminals";

export const fetchMerchantPosTerminals = async (clientCode) => {
  const code = String(clientCode ?? "").trim();
  if (!code) return [];
  const { data } = await apiClient.get(`${PREFIX}/client/${encodeURIComponent(code)}`);
  return Array.isArray(data) ? data : [];
};

export const fetchMerchantPosTerminalList = async ({
  page = 1,
  limit = 20,
  search = "",
  sortBy = "created_at",
  sortOrder = "desc",
} = {}) => {
  const { data } = await apiClient.get(PREFIX, {
    params: {
      page,
      limit,
      search: search || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    },
  });
  return data;
};

export const createMerchantPosTerminal = async (payload) => {
  const { data } = await apiClient.post(PREFIX, payload);
  return data;
};

export const updateMerchantPosTerminal = async (id, payload) => {
  const { data } = await apiClient.patch(`${PREFIX}/${id}`, payload);
  return data;
};

export const deleteMerchantPosTerminal = async (id) => {
  await apiClient.delete(`${PREFIX}/${id}`);
};

export const fetchMerchantPosHistory = async (payload) => {
  const { data } = await apiClient.post(`${PREFIX}/history`, payload);
  return Array.isArray(data) ? data : [];
};
