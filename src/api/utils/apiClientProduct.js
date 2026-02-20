import axios from "axios";
import { addInterceptors } from "./apiClient";

const BASE_URL = import.meta.env.VITE_BACKEND_PRODUCT_URL;

export const apiClientProduct = axios.create({
  baseURL: BASE_URL,
});

addInterceptors(apiClientProduct);
