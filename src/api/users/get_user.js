import { apiClient } from "../utils/apiClient";
import { normalizeUsersResponse } from "../../utils/normalizeOperatorData";

export const fetchUserById = async (id) => {
  const token = localStorage.getItem("access_token");

  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/users/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Не удалось загрузить пользователя");
  return res.json();
};

export const getAllUsers = async ({ after = null }) => {
  try {
    const res = await apiClient.get("/users", { params: { after } });
    return normalizeUsersResponse(res.data);
  } catch (e) {
    console.error(e);
    throw e;
  }
};
