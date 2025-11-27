import { apiClient } from "../utils/apiClient";

export const getRoles = async () => {
  try {
    const response = await apiClient(`/roles`);
    return response.data;
  } catch (err) {
    throw err;
  }
};
