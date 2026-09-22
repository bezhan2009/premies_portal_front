import { apiClient } from "../utils/apiClient";

export const fullUpdateWorkers = async (data) => {
  try {
    const res = await apiClient.patch(`/workers/user/${data.ID}`, {
      user: data,
    });
    return res.data;
  } catch (e) {
    console.error(e);
  }
};
