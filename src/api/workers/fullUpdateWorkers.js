import { apiClient } from "../utils/apiClient";

export const fullUpdateWorkers = async (data, userObjact) => {
  try {
    const res = await apiClient.patch(
      `/workers/user/${data.ID}`,
      userObjact
        ? {
            user: data,
          }
        : data
    );
    return res.data;
  } catch (e) {
    console.error(e);
  }
};
