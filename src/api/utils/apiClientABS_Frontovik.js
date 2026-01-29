import axios from "axios";
import { addInterceptors } from "./apiClient";

const BASE_URL = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;

export const apiClientABS_Frontovik = axios.create({
  baseURL: BASE_URL,
});

addInterceptors(apiClientABS_Frontovik);
