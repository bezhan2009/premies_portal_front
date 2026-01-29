import axios from "axios";
import { addInterceptors } from "./apiClient";

const BASE_URL = import.meta.env.VITE_BACKEND_CREDIT_URL;

export const apiClientCredit = axios.create({
  baseURL: BASE_URL,
});

addInterceptors(apiClientCredit);
