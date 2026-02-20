import { apiClientProduct } from "../utils/apiClientProduct";

const API_API = "v1";
const API_DEPOSIT = "deposits";
const API_URL = `/${API_API}/${API_DEPOSIT}`;

export const depositService = {
  getAll: (pageNumber = 1, pageSize = 10) =>
    apiClientProduct.get(`${API_URL}`, { params: { pageNumber, pageSize } }),

  getById: (id) => apiClientProduct.get(`${API_URL}/${id}`),

  create: (deposit) => apiClientProduct.post(`${API_URL}`, deposit),

  update: (id, deposit) => apiClientProduct.put(`${API_URL}/${id}`, deposit),

  delete: (id) => apiClientProduct.delete(`${API_URL}/${id}`),
};
