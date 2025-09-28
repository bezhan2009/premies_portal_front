import { apiClientCredit } from "../utils/apiClientCredit";

export const deleteCreditById = async (id) => {
  try {
    const valid = confirm("Вы уверены, что хотите удалить?");
    if (valid) {
      const res = await apiClientCredit.delete(`/credits/${id}`);
      return res.data;
    }
  } catch (e) {
    console.error(e);
  }
};
