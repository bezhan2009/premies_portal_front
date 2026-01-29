import axios from "axios";
import { addInterceptors } from "./apiClient";

const BASE_URL = import.meta.env.VITE_BACKEND_APPLICATION_URL;

export const apiClientApplication = axios.create({
  baseURL: BASE_URL,
});

addInterceptors(apiClientApplication);
