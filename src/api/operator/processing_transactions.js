export const fetchTransactionsByCardId = async (cardID, fromDate = null, toDate = null) => {
    const url = new URL(`${import.meta.env.VITE_BACKEND_PROCESSING_URL}/api/Transactions/by-card/${cardID}`);
    if (fromDate) {
        url.searchParams.append('fromDate', fromDate);
    }
    if (toDate) {
        url.searchParams.append('toDate', toDate);
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.transactions || data;
}
