import { apiClientTransactions } from "../utils/apiClientTransactions";

export const putTransactions = async (data) => {
  try {
    const response = await apiClientTransactions.put(
      "/api/Transactions/transaction-type/update",
      {
        ...data,
        number: +data?.number,
        type: +data?.type,
      }
    );
    return response;
  } catch (e) {
    console.error("Ошибка при обновлении:", e);
  }
};

export const putTransactionsNumber = async (data) => {
  try {
    const response = await apiClientTransactions.put(
      "/api/Transactions/transaction-type/update-number",
      {
        ...data,
        newNumber: +data?.number,
        type: +data?.type,
      }
    );
    return response;
  } catch (e) {
    // const errorMessage = e?.response?.data?.message || e?.message || "Произошла ошибка при обновлении";
    console.error("Ошибка при обновлении:", e);
  }
};

export const getTransactions = async () => {
  try {
    const response = await apiClientTransactions.get(
      "/api/Transactions/types/all"
    );
    return response;
  } catch (e) {
    console.error("Ошибка при обновлении:", e);
  }
};

export const getTerminalNames = async () => {
  try {
    const response = await apiClientTransactions.get(
      "/api/TransactionTypeAtmDescriptions"
    );
    return response;
  } catch (e) {
    console.error("Ошибка при обновлении:", e);
  }
};
export const postTerminalNames = async (data) => {
  try {
    const response = await apiClientTransactions.post(
      "/api/TransactionTypeAtmDescriptions",
      {
        ...data,
        transactionType: +data?.transactionType,
      }
    );
    return response;
  } catch (e) {
    console.error("Ошибка при обновлении:", e);
  }
};

export const putTerminalNames = async (data) => {
  try {
    const response = await apiClientTransactions.put(
      "/api/TransactionTypeAtmDescriptions",
      {
        ...data,
        transactionType: +data?.transactionType,
      }
    );
    return response;
  } catch (e) {
    console.error("Ошибка при обновлении:", e);
  }
};

export const deleteTerminalNames = async (id) => {
  try {
    const response = await apiClientTransactions.delete(
      `/api/TransactionTypeAtmDescriptions/${id}`
    );
    return response;
  } catch (e) {
    console.error("Ошибка при обновлении:", e);
  }
};
