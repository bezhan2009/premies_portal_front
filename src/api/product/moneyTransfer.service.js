import { apiClientProduct } from "../utils/apiClientProduct";

const API_API = "v1";
const API_MONEYTRANSFER = "money-transfer";
const API_URL = `/${API_API}/${API_MONEYTRANSFER}`;

export const moneyTransferService = {
  getAll: (pageNumber = 1, pageSize = 10) =>
    apiClientProduct.get(`${API_URL}`, { params: { pageNumber, pageSize } }),

  getById: (id) => apiClientProduct.get(`${API_URL}/${id}`),

  create: (transfer) => apiClientProduct.post(`${API_URL}`, transfer),

  update: (id, transfer) => apiClientProduct.put(`${API_URL}/${id}`, transfer),

  delete: (id) => apiClientProduct.delete(`${API_URL}/${id}`),
};
