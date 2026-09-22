import axios from "axios";
import { addInterceptors } from "./apiClient";

const BASE_URL = import.meta.env.VITE_BACKEND_ABS_SERVICE_URL;

export const apiClientABS_Frontovik = axios.create({
  baseURL: BASE_URL,
});

apiClientABS_Frontovik.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


addInterceptors(apiClientABS_Frontovik);

apiClientABS_Frontovik.interceptors.response.use(response => response, error => {
 const data=error.response?.data;
 if (data?.approval_required && /^\d{4}\.\d{6}$/.test(data.client_code || '')) window.dispatchEvent(new CustomEvent('client-read-sanction',{detail:data.client_code}));
 return Promise.reject(error);
});
