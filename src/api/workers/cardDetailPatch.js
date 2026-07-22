import { apiClient } from "../utils/apiClient";

export const cardDetailPatch = async (data) => {
  try {
    const res = await apiClient.patch(`/workers/card-details/${data.ID}`, data);
    return res.data;
  } catch (e) {
    console.error(e);
  }
};
