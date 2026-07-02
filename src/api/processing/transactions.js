import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_PROCESSING_URL || 'http://10.64.20.84:5003';

export const fetchTransactionsByCardId = async (
    cardID,
    fromDate = null,
    toDate = null
) => {
    const url = new URL(
        `${import.meta.env.VITE_BACKEND_PROCESSING_URL}/api/Transactions/by-cards`
    );

    // Remove trailing comma if present
    const cardIds = String(cardID).replace(/,+$/, "");

    url.searchParams.append("cardIds", cardIds);

    if (fromDate) {
        url.searchParams.append("fromDate", fromDate);
    }

    if (toDate) {
        url.searchParams.append("toDate", toDate);
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.transactions || data;
};


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
        // Очищаем параметры от пустых значений и формируем query string
        const q = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(v => q.append(key, v));
                } else {
                    q.append(key, value);
                }
            }
        });

        const response = await axios.get(
            `${BASE_URL}/api/Transactions/search-transactions?${q.toString()}`
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

export const fetchCardFios = async (cardIds) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/card-fio`, {
            cardIds: cardIds
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching card fios:', error);
        return { data: {} };
    }
};

// Получение информации об уведомлениях (сервисах) карты
export const fetchCardServices = async (cardId) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.get(`${GATEWAY_URL}/api/transactions/services?CardId=${cardId}`, {
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching card services:', error);
        return [];
    }
};

// Изменение статуса карты (блокировка)
export const changeCardStatus = async (cardId, status, comment) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:7575';
    const url = `${GATEWAY_URL}/api/transactions/block-card`;
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
    const operationalDate = `${new Date().toISOString().split('T')[0]}T10:00:00`;
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:v1="http://bus.colvir.com/service/cards/v1" 
                  xmlns:v11="http://bus.colvir.com/common/support/v1">
    <soapenv:Body>
        <v1:CardBlockRequest>
            <v11:head>
                <v11:requestId>${uuid}</v11:requestId>
                <v11:params>
                    <v11:clientType>CBS</v11:clientType>
                    <v11:interfaceVersion>1.0</v11:interfaceVersion>
                    <v11:language>ru</v11:language>
                    <v11:operationalDate>${operationalDate}</v11:operationalDate>
                </v11:params>
            </v11:head>
            <v1:cardId>${cardId}</v1:cardId>
            <v1:reason>${status}</v1:reason>
            <v1:description>${comment || ""}</v1:description>
        </v1:CardBlockRequest>
    </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await axios.post(url, xml, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'text/xml;charset=UTF-8',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error changing card status (SOAP):', error);
        throw error;
    }
};

// Разблокировка карты
export const unblockCard = async (cardId, comment) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:7575';
    const url = `${GATEWAY_URL}/api/transactions/unblock-card`;
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
    const operationalDate = `${new Date().toISOString().split('T')[0]}T10:00:00`;
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:v1="http://bus.colvir.com/service/cards/v1" 
                  xmlns:v11="http://bus.colvir.com/common/support/v1">
    <soapenv:Body>
        <v1:CardBlockCancel>
            <v11:head>
                <v11:requestId>${uuid}</v11:requestId>
                <v11:params>
                    <v11:clientType>CBS</v11:clientType>
                    <v11:interfaceVersion>1.0</v11:interfaceVersion>
                    <v11:language>ru</v11:language>
                    <v11:operationalDate>${operationalDate}</v11:operationalDate>
                </v11:params>
            </v11:head>
            <v1:cardId>${cardId}</v1:cardId>
            <v1:description>${comment || ""}</v1:description>
        </v1:CardBlockCancel>
    </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await axios.post(url, xml, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'text/xml;charset=UTF-8',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error unblocking card (SOAP):', error);
        throw error;
    }
};

// Сброс счетчика ПИН
export const resetPinCounter = async (cardId) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/reset-pin-counter`, {
            cardId: String(cardId)
        }, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
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
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/service-action`, payload, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error managing card service:', error);
        throw error;
    }
};
export const fetchCardLimits = async (cardId) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.get(`${GATEWAY_URL}/api/transactions/limits?CardId=${cardId}`, {
            headers: {
                'accept': '*/*',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching card limits:', error);
        return [];
    }
};

export const changeCardLimit = async (payload) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL;
    try {
        const response = await axios.post(`${GATEWAY_URL}/api/transactions/change-limit`, payload, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error changing card limit:', error);
        throw error;
    }
};

export const activateCardSoap = async (contractId, cardId) => {
    const GATEWAY_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:7575';
    const url = `${GATEWAY_URL}/api/transactions/activate-card`;
    
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:cr="http://bus.colvir.com/service/cards/v1" 
                  xmlns:s="http://bus.colvir.com/common/support/v1" 
                  xmlns:dm="http://bus.colvir.com/common/domain/v1">
   <soapenv:Header/>
   <soapenv:Body>
      <cr:CardGiveoutRequest>
            <s:head>
                <s:params>
                    <s:clientType>CBS</s:clientType>
                    <s:interfaceVersion>1.0</s:interfaceVersion>
                    <s:language>ru</s:language>
                    <s:operationalDate>${new Date().toISOString().split('T')[0]}T08:00:00</s:operationalDate>
                </s:params>
            </s:head>
            
            <cr:contractId>${contractId}</cr:contractId>
            <cr:cardId>${cardId}</cr:cardId>
            
            <cr:contractParam>
                <dm:code>AUTO_ACTIVATE_FL</dm:code>
                <dm:value>true</dm:value>
            </cr:contractParam>

      </cr:CardGiveoutRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

    try {
        const response = await axios.post(url, xml, {
            headers: {
                'accept': '*/*',
                'Content-Type': 'text/xml;charset=UTF-8',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error activating card (SOAP):', error);
        throw error;
    }
};
