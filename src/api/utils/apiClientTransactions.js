import axios from "axios";
import { addInterceptors } from "./apiClient";

const BASE_URL = import.meta.env.VITE_BACKEND_PROCESSING_URL;

export const apiClientTransactions = axios.create({
  baseURL: BASE_URL,
});

addInterceptors(apiClientTransactions);
