import { apiClient } from "../utils/apiClient";

export const getApplicationOffices = async () => {
  const response = await apiClient.get("/application-offices");
  return response.data || [];
};

export const getUserApplicationOffices = async (userId) => {
  const response = await apiClient.get(`/application-offices/user/${userId}`);
  return response.data || [];
};
