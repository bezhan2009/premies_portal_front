import { apiClient } from "../api/utils/apiClient";

export const fetchDeclineBlocks = async () => {
  const response = await apiClient.get("/api/declines/blocks");
  return response.data;
};
