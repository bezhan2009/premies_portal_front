import { apiClient } from "../utils/apiClient";

const API_V1_PREFIX = "/api/v1/card-balance";

export const cardBalanceApi = {
  // --- Settings ---
  getAllSettings: async () => {
    const response = await apiClient.get(`${API_V1_PREFIX}/settings`);
    return response.data;
  },

  getSettingById: async (id) => {
    const response = await apiClient.get(`${API_V1_PREFIX}/settings/${id}`);
    return response.data;
  },

  createSetting: async (data) => {
    const response = await apiClient.post(`${API_V1_PREFIX}/settings`, data);
    return response.data;
  },

  updateSetting: async (id, data) => {
    const response = await apiClient.put(`${API_V1_PREFIX}/settings/${id}`, data);
    return response.data;
  },

  deleteSetting: async (id) => {
    const response = await apiClient.delete(`${API_V1_PREFIX}/settings/${id}`);
    return response.data;
  },

  // --- Balances ---
  getAllBalances: async () => {
    const response = await apiClient.get(`${API_V1_PREFIX}/balances`);
    return response.data;
  },

  blockCard: async (id) => {
    const response = await apiClient.patch(`${API_V1_PREFIX}/balances/${id}/block`);
    return response.data;
  },

  unblockCard: async (id) => {
    const response = await apiClient.patch(`${API_V1_PREFIX}/balances/${id}/unblock`);
    return response.data;
  },
};
