import { apiClient } from "./utils/apiClient";

export async function getV2Token({ token }) {
  try {
    const res = await apiClient("/auth/translate-token", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error) {
    console.log(error);
  }
}
