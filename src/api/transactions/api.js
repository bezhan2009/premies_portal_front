import { apiClientTransactions } from "../utils/apiClientTransactions";

export const putTransactions = async ( data) => {
         try {
            const response = await apiClientTransactions.put(
                "/api/Transactions/transaction-type/update",
                {
                    ...data,
                    number: +data?.number,
                    type: +data?.type
                }
            );
            return response;
        } catch (e) {
            // const errorMessage = e?.response?.data?.message || e?.message || "Произошла ошибка при обновлении";
            console.error("Ошибка при обновлении:", e);
        } 
}


export const putTransactionsNumber = async ( data) => {
         try {
            const response = await apiClientTransactions.put(
                "/api/Transactions/transaction-type/update-number",
                {
                    ...data,
                    newNumber: +data?.number,
                    type: +data?.type
                }
            );
            return response;
        } catch (e) {
            // const errorMessage = e?.response?.data?.message || e?.message || "Произошла ошибка при обновлении";
            console.error("Ошибка при обновлении:", e);
        } 
}

export const getTransactions = async () => {
         try {
            const response = await apiClientTransactions.get(
                "/api/Transactions/types/all");
            return response;
        } catch (e) {
            console.error("Ошибка при обновлении:", e);
        }
}

