import { apiClientABS_Frontovik as api } from './utils/apiClientABS_Frontovik';

const path = '/embosser';
const options = { timeout: 20000 };

export async function getEmbosserCapabilities() {
  return (await api.get(`${path}/capabilities`, options)).data;
}

export async function listEmbosserJobs({ q = '', status = '', limit = 30, offset = 0 } = {}) {
  return (await api.get(`${path}/jobs`, { ...options, params: { q, status, limit, offset } })).data;
}

export async function getEmbosserJob(id) {
  return (await api.get(`${path}/jobs/${encodeURIComponent(id)}`, options)).data;
}

export async function actOnEmbosserJob(id, action, reason = '') {
  return (await api.post(`${path}/jobs/${encodeURIComponent(id)}/actions`, { action, reason }, options)).data;
}
