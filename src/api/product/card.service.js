import { apiClientProduct } from "../utils/apiClientProduct";

const API_API = "v1";
const API_CARD = "cards";
const API_URL = `/${API_API}/${API_CARD}`;

export const cardService = {
  getAll: (pageNumber = 1, pageSize = 10) =>
    apiClientProduct.get(`${API_URL}`, { params: { pageNumber, pageSize } }),

  getById: (id) => apiClientProduct.get(`${API_URL}/${id}`),

  create: (card) => apiClientProduct.post(`${API_URL}`, card),

  update: (id, card) => apiClientProduct.put(`${API_URL}/${id}`, card),

  delete: (id) => apiClientProduct.delete(`${API_URL}/${id}`),
};
