import { apiClient } from "./utils/apiClient";

export async function login(username, password) {
  try {
    const response = await apiClient.post("/auth/sign-in", {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.error || "Неверный логин или пароль";
    throw new Error(message);
  }
}

export async function registerUser(payload) {
  try {
    const response = await apiClient.post("/auth/sign-up", payload);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || "Ошибка регистрации";
    throw new Error(message);
  }
}
