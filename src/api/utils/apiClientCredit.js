// VITE_BACKEND_APPLICATION_URL

import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_CREDIT_URL;

export const apiClientCredit = axios.create({
  baseURL: BASE_URL,
});
