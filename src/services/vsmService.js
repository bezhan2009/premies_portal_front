import { apiClient } from "../api/utils/apiClient";

export const searchStops = async (cardId, accountNumber, includeInactive = false) => {
    try {
        const response = await apiClient.post("/api/vsm/search", {
            cardId,
            accountNumber,
            includeInactive
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const addMerchantStop = async (cardId, accountNumber, requestData) => {
    try {
        const response = await apiClient.post("/api/vsm/merchant-add", {
            cardId,
            accountNumber,
            request: requestData
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getCofDataInfo = async (cardId, accountNumber) => {
    try {
        const response = await apiClient.post("/api/vsm/cof-datainfo", {
            cardId,
            accountNumber
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const cancelStopInstruction = async (cardId, cancelStopInstructions) => {
    try {
        const response = await apiClient.post("/api/vsm/cancel", {
            cardId,
            cancelStopInstructions
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const clearVsmCache = async (cardId) => {
    try {
        const response = await apiClient.post("/api/vsm/clear-cache", {
            cardId
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};
