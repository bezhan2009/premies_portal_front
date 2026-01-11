import { apiClientABS_Frontovik } from "../utils/apiClientABS_Frontovik";

export const getUserCards = async (clientIndex) => {
  try {
    const res = await apiClientABS_Frontovik(
      "/cards?clientIndex=" + clientIndex
    );
    return res.data;
  } catch (err) {
    console.log(err);
  }
};

export const getUserAccounts = async (clientIndex) => {
  try {
    const res = await apiClientABS_Frontovik(
      "/accounts?clientIndex=" + clientIndex
    );
    return res.data;
  } catch (err) {
    console.log(err);
  }
};

export const getUserCredits = async (clientIndex) => {
  try {
    const res = await apiClientABS_Frontovik(
      "/credits?clientIndex=" + clientIndex
    );
    return res.data;
  } catch (err) {
    console.log(err);
  }
};

export const getUserDeposits = async (clientIndex) => {
  try {
    const res = await apiClientABS_Frontovik(
      "/deposits?clientIndex=" + clientIndex
    );
    return res.data;
  } catch (err) {
    console.log(err);
  }
};
