import { apiClientApplication } from "../utils/apiClientApplication";

export const getApplicationById = async (id) => {
  try {
    const res = await apiClientApplication(`/applications/${id}`);
    return res.data;
  } catch (e) {
    console.error(e);
  }
};
