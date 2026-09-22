import axios from 'axios';
import { apiClientABS_Frontovik as abs } from './utils/apiClientABS_Frontovik';

const portal = axios.create({ baseURL: import.meta.env.VITE_BACKEND_URL, timeout: 30000 });
portal.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('access_token') || ''}`;
  return config;
});
export const workflowError = e => e?.response?.data?.error || e?.message || 'Не удалось выполнить запрос';
export const getChangePermissions = async () => (await abs.get('/client/change-permissions')).data;
export const listChangeApprovals = async () => (await abs.get('/client/change-approvals')).data;
export const decideChangeApproval = async (id, decision, reason = '', minutes = 10) => (await abs.post(`/client/change-approvals/${encodeURIComponent(id)}/decision`, { decision, reason, minutes })).data;
export const listClientDrafts = async () => (await portal.get('/frontovik/drafts')).data;
export const saveClientDraft = async (id, revision, payload) => (await portal.put(`/frontovik/drafts/${encodeURIComponent(id)}`, { revision, payload })).data;
export const deleteClientDraft = async id => portal.delete(`/frontovik/drafts/${encodeURIComponent(id)}`);
export const preflightClientCreation = async request => (await abs.post('/client/onboarding/preflight', request, { timeout: 60000 })).data;
export const uploadWorkflowAttachment = async (file, metadata) => {
  const data = new FormData();
  data.append('file', file);
  Object.entries(metadata).forEach(([key, value]) => data.append(key, value || ''));
  return (await portal.post('/frontovik/attachments', data, { timeout: 60000 })).data;
};
export const downloadWorkflowAttachment = async id => {
  const response = await portal.get(`/frontovik/attachments/${encodeURIComponent(id)}/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  const extension = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }[response.data.type] || 'pdf';
  a.href = url; a.download = `document.${extension}`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
