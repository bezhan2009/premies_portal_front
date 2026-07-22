import { apiClientApplication } from "../utils/apiClientApplication";

export const deleteApplicationById = async (id) => {
  try {
    const valid = confirm("Вы уверены, что хотите удалить?");
    if (valid) {
      const res = await apiClientApplication.delete(`/applications/${id}`);
      return res.data;
    }
  } catch (e) {
    console.error(e);
  }
};
