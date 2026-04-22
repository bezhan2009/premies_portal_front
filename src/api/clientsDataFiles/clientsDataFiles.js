import { apiClient } from "../utils/apiClient";

export const getClientDocumentsByINN = async (inn) => {
  const response = await apiClient.post("/clients-data-files/search", { inn });

  return response.data || [];
};

export const getClientDocumentById = async (id) => {
  const response = await apiClient.get(`/clients-data-files/${id}`);
  return response.data;
};

export const createClientDocument = async (payload) => {
  const response = await apiClient.post("/clients-data-files", payload);
  return response.data;
};

export const deleteClientDocument = async (id) => {
  const response = await apiClient.delete(`/clients-data-files/${id}`);
  return response.data;
};
