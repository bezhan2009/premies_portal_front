import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export const addInterceptors = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
});

addInterceptors(apiClient);
