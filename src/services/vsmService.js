import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL;

// Re-use existing token logic if auth is required, usually sent in headers or stored in localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem("token"); // adjust if token is stored differently
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const searchStops = async (cardId, accountNumber, includeInactive = false) => {
    try {
        const response = await axios.post(`${API_URL}/api/vsm/search`, {
            cardId,
            accountNumber,
            includeInactive
        }, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const addMerchantStop = async (cardId, accountNumber, requestData) => {
    try {
        const response = await axios.post(`${API_URL}/api/vsm/merchant-add`, {
            cardId,
            accountNumber,
            request: requestData
        }, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
