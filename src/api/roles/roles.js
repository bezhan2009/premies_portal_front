import { apiClient } from "../utils/apiClient";

export const getRoles = async () => {
  try {
    const response = await apiClient(`/roles`);
    return response.data;
  } catch (err) {
    throw err;
  }
};
export const getRoleUserById = async (id) => {
  try {
    const response = await apiClient(`/roles/user/${id}`);
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const updateRoleUserById = async (id, data) => {
  try {
    const response = await apiClient.patch(`/roles/user/${id}`, data);
    return response.data;
  } catch (err) {
    throw err;
  }
};
