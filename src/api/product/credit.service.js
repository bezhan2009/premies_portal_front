import { apiClientProduct } from "../utils/apiClientProduct";

const API_API = "v1";
const API_CREDIT = "credits";
const API_URL = `/${API_API}/${API_CREDIT}`;

export const creditService = {
  getAll: (pageNumber = 1, pageSize = 10) =>
    apiClientProduct.get(`${API_URL}`, { params: { pageNumber, pageSize } }),

  getById: (id) => apiClientProduct.get(`${API_URL}/${id}`),

  create: (credit) => apiClientProduct.post(`${API_URL}`, credit),

  update: (id, credit) => apiClientProduct.put(`${API_URL}/${id}`, credit),

  delete: (id) => apiClientProduct.delete(`${API_URL}/${id}`),
};
