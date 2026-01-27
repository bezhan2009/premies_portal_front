import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_PROCESSING_URL || 'http://10.64.20.84:5003';

// Поиск по идентификатору карты
export const fetchTransactionsByCardId = async (cardID, fromDate = null, toDate = null) => {
    const url = new URL(`${import.meta.env.VITE_BACKEND_PROCESSING_URL}/api/Transactions/by-cards`);
    url.searchParams.append('cardIds', cardID);
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


// Поиск по номеру терминала (ATM ID)
export const fetchTransactionsByATM = async (atmId, fromDate, toDate) => {
    try {
        const params = new URLSearchParams();
        params.append('atmId', atmId);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/by-atm?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by ATM:', error);
        throw error;
    }
};

// Поиск по номеру операции (UTRNNO)
export const fetchTransactionsByUTRNNO = async (utrnno) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/api/Transactions/by-utrnno/${utrnno}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by UTRNNO:', error);
        throw error;
    }
};

// Поиск по типу транзакции
export const fetchTransactionsByType = async (transactionType, fromDate, toDate) => {
    try {
        const params = new URLSearchParams();
        params.append('transactionType', transactionType);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/by-transaction-type?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by type:', error);
        throw error;
    }
};

// Поиск по сумме операции
export const fetchTransactionsByAmount = async (fromAmount, toAmount, fromDate, toDate) => {
    try {
        const params = new URLSearchParams();
        params.append('fromAmount', fromAmount);
        params.append('toAmount', toAmount);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/by-amount-with-date?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by amount:', error);
        throw error;
    }
};

// Поиск по статусу отмены
export const fetchTransactionsByReversal = async (reversal, fromDate, toDate) => {
    try {
        const params = new URLSearchParams();
        params.append('reversal', reversal);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/by-reversal?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by reversal:', error);
        throw error;
    }
};

// Поиск по MCC коду
export const fetchTransactionsByMCC = async (mcc, fromDate, toDate) => {
    try {
        const params = new URLSearchParams();
        params.append('mcc', mcc);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/by-mcc?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by MCC:', error);
        throw error;
    }
};
