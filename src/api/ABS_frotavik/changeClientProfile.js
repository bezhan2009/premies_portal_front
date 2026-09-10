import { apiClientABS_Frontovik as api } from '../utils/apiClientABS_Frontovik';
const path = code => `/client/${encodeURIComponent(code)}`;
export const profileCapabilities = async () => (await api.get('/client/profile-change/capabilities')).data;
export const getEditableProfile = async code => (await api.get(`${path(code)}/profile`)).data;
export const getProfileChange = async (code, id) => (await api.get(`${path(code)}/profile-change/${encodeURIComponent(id)}`)).data;
export const submitProfileChange = async (code, request) => (await api.post(`${path(code)}/profile-change`, request, { timeout: 20000 })).data;
