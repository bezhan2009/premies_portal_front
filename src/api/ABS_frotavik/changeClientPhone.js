import { apiClientABS_Frontovik } from '../utils/apiClientABS_Frontovik';

export const getPhoneChangeCapabilities = async () => (await apiClientABS_Frontovik.get('/client/phone-change/capabilities')).data;
export const getClientPhoneChange = async (clientCode, requestID) => (await apiClientABS_Frontovik.get(`/client/${encodeURIComponent(clientCode)}/phone-change/${encodeURIComponent(requestID)}`)).data;
export const changeClientPhone = async (clientCode, input) => (await apiClientABS_Frontovik.post(`/client/${encodeURIComponent(clientCode)}/phone-change`, input, { timeout: 20000 })).data;
export function newPhoneChangeID() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function normalizeClientPhone(value) {
  let digits = String(value || '').replace(/[+\s()-]/g, '');
  if (/^\d{9}$/.test(digits)) digits = `992${digits}`;
  return /^992\d{9}$/.test(digits) ? digits : '';
}
