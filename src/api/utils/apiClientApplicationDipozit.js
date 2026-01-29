// VITE_BACKEND_APPLICATION_URL

import axios from "axios";
import { addInterceptors } from "./apiClient";

const BASE_URL = import.meta.env.VITE_BACKEND_APPLICATION_DIPOZIT_URL;

export const apiClientApplicationDipozit = axios.create({
  baseURL: BASE_URL,
});

addInterceptors(apiClientApplicationDipozit);
