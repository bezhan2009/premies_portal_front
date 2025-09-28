import { apiClientCredit } from "../utils/apiClientCredit";

export const getCreditById = async (id) => {
  try {
    const res = await apiClientCredit(`/credits/${id}`);
    return res.data;
  } catch (e) {
    console.error(e);
  }
};
