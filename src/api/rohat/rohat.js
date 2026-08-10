import { apiClient } from "../utils/apiClient.js";

const ROHAT_PREFIX = "/rohat";

export const rohatApi = {
  getProducts: async ({ archived = false } = {}) => {
    const response = await apiClient.get(`${ROHAT_PREFIX}${archived ? "/archive" : ""}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  createProduct: async (payload) => {
    const response = await apiClient.post(ROHAT_PREFIX, payload);
    return response.data;
  },

  changeLimit: async (id, limitMinor) => {
    const response = await apiClient.post(`${ROHAT_PREFIX}/${id}/limit`, { limitMinor });
    return response.data;
  },

  closeProduct: async (id) => {
    const response = await apiClient.post(`${ROHAT_PREFIX}/${id}/close`);
    return response.data;
  },

  getHistory: async (id) => {
    const response = await apiClient.get(`${ROHAT_PREFIX}/${id}/history`);
    return Array.isArray(response.data) ? response.data : [];
  },
};
