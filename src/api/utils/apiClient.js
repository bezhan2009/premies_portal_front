import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

// const token = localStorage.getItem("access_token");

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  },
});
