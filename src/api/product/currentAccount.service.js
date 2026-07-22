import { apiClientProduct } from "../utils/apiClientProduct";

const API_API = "v1";
const API_CURRENTACCOUNT = "current-account";
const API_URL = `/${API_API}/${API_CURRENTACCOUNT}`;

export const currentAccountService = {
  getAll: (pageNumber = 1, pageSize = 10) =>
    apiClientProduct.get(`${API_URL}`, { params: { pageNumber, pageSize } }),

  getById: (id) => apiClientProduct.get(`${API_URL}/${id}`),

  create: (account) => apiClientProduct.post(`${API_URL}`, account),

  update: (id, account) => apiClientProduct.put(`${API_URL}/${id}`, account),

  delete: (id) => apiClientProduct.delete(`${API_URL}/${id}`),
};
