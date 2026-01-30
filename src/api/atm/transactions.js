import axios from 'axios';

export const fetchTransactionsByATM = async (atmId, fromDate, toDate) => {
    try {
        const response = await axios.get(
            `${import.meta.env.VITE_BACKEND_PROCESSING_URL}/api/Transactions/by-atm`,
            {
                params: {
                    atmId,
                    fromDate,
                    toDate
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching transactions:", error);
        throw error;
    }
};