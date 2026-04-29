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

export const fetchTransactionsByCardBinAndType = async (cardBin, transactionType, date, fromTime, toTime) => {
    try {
        const params = new URLSearchParams();
        params.append('cardBin', cardBin);
        params.append('transactionType', transactionType);
        params.append('date', date);

        if (fromTime) params.append('fromTime', fromTime);
        if (toTime) params.append('toTime', toTime);

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/search?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by card bin and type:', error);
        throw error;
    }
};

// Универсальный поиск по всем параметрам (GET /api/Transactions/search-transactions)
export const fetchTransactionsSearch = async (params) => {
    try {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            if (Array.isArray(value)) {
                value.forEach((v) => searchParams.append(key, v));
            } else {
                searchParams.append(key, value);
            }
        });

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/search-transactions?${searchParams.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions by search-transactions:', error);
        throw error;
    }
};

// Получение подробной информации о карте
export const fetchCardDetails = async (cardId) => {
    const BASE_URL_5012 = 'http://10.64.20.84:5012';
    try {
        const response = await axios.post(`${BASE_URL_5012}/api/Transactions/card-data`, {
            cardId: String(cardId)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching card details:', error);
        return null;
    }
};

// Получение информации об уведомлениях (сервисах) карты
export const fetchCardServices = async (cardId) => {
    const BASE_URL_5012 = 'http://10.64.20.84:5012';
    try {
        const response = await axios.get(`${BASE_URL_5012}/api/Transactions/services?CardId=${cardId}`, {
            headers: {
                'accept': '*/*'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching card services:', error);
        return [];
    }
};

// Изменение статуса карты (блокировка)
export const changeCardStatus = async (cardId, status) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/block-card`, {
            cardId: String(cardId),
            hotCardStatus: String(status)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error changing card status:', error);
        throw error;
    }
};

// Разблокировка карты
export const unblockCard = async (cardId) => {
    const BASE_URL_5012 = 'http://10.64.20.84:5012';
    try {
        const response = await axios.post(`${BASE_URL_5012}/api/Transactions/validate-card`, {
            cardId: String(cardId)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error unblocking card:', error);
        throw error;
    }
};

// Сброс счетчика ПИН
export const resetPinCounter = async (cardId) => {
    const BASE_URL_5012 = 'http://10.64.20.84:5012';
    try {
        const response = await axios.post(`${BASE_URL_5012}/api/Transactions/reset-pin-counter`, {
            cardId: String(cardId)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error resetting pin counter:', error);
        throw error;
    }
};

// Генерация/Смена ПИН
export const generatePin = async (cardId, phoneNumber, pinValue = "") => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/generate-pin`, {
            cardId: String(cardId),
            phoneNumber: String(phoneNumber),
            pinDeliveryMethod: "WS",
            pinValue: String(pinValue)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error generating pin:', error);
        throw error;
    }
};

export const sendPinOtp = async (phoneNumber) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/send-pin-otp`, {
            phoneNumber: String(phoneNumber)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error sending pin OTP:', error);
        throw error;
    }
};

export const checkPinOtp = async (phoneNumber, otpCode) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/check-pin-otp`, {
            phoneNumber: String(phoneNumber),
            otpCode: String(otpCode)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error checking pin OTP:', error);
        throw error;
    }
};

// Управление сервисами (SMS/3DS)
export const manageCardService = async (payload) => {
    const BASE_URL_5012 = 'http://10.64.20.84:5012';
    try {
        const response = await axios.post(`${BASE_URL_5012}/api/Transactions/service-action`, payload, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error managing card service:', error);
        throw error;
    }
};
export const fetchCardLimits = async (cardId) => {
    const BASE_URL_5012 = 'http://10.64.20.84:5012';
    try {
        const response = await axios.get(`${BASE_URL_5012}/api/Transactions/limits?CardId=${cardId}`, {
            headers: {
                'accept': '*/*'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching card limits:', error);
        return [];
    }
};

export const changeCardLimit = async (payload) => {
    const BASE_URL_5012 = 'http://10.64.20.84:5012';
    try {
        const response = await axios.post(`${BASE_URL_5012}/api/Transactions/change-card-limit`, payload, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error changing card limit:', error);
        throw error;
    }
};
