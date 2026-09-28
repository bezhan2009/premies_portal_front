import { apiClient } from "../utils/apiClient";
import { documentScopeOptions } from "./clientDocumentScope.js";

export const getClientDocumentsByINN = async (inn, clientIndex) => {
  const response = await apiClient.post("/clients-data-files/search", { inn }, documentScopeOptions(clientIndex));

  return response.data || [];
};

export const getClientDocumentById = async (id, clientIndex) => {
  const response = await apiClient.get(`/clients-data-files/${id}`, documentScopeOptions(clientIndex));
  return response.data;
};

export const createClientDocument = async (payload, clientIndex) => {
  const response = await apiClient.post("/clients-data-files", payload, documentScopeOptions(clientIndex));
  return response.data;
};

export const deleteClientDocument = async (id, clientIndex) => {
  const response = await apiClient.delete(`/clients-data-files/${id}`, documentScopeOptions(clientIndex));
  return response.data;
};

export const uploadClientDocument = async (inn, title, file, documentType = "", clientIndex) => {
  const formData = new FormData();
  formData.append("inn", inn);
  formData.append("title", title);
  formData.append("file", file);
  if (documentType) {
    formData.append("document_type", documentType);
  }

  const response = await apiClient.post("/clients-data-files/upload", formData, {
    ...documentScopeOptions(clientIndex),
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
