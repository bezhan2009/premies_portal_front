import { apiClientABS_Frontovik as api } from '../utils/apiClientABS_Frontovik';

const path = code => `/client/${encodeURIComponent(code)}/card-opening`;
const options = { timeout: 20000 };
export const cardOpeningCapabilities = async () => (await api.get('/client/card-opening/capabilities', options)).data;
export const openClientCard = async (code, input) => (await api.post(path(code), input, options)).data;
export const getCardOpening = async (code, id) => (await api.get(`${path(code)}/${encodeURIComponent(id)}`, options)).data;
export const selectCardAccount = async (code, id, number) => (await api.post(`${path(code)}/${encodeURIComponent(id)}/account`, { account_number: number }, options)).data;
