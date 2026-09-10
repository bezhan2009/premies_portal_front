import { apiClientABS_Frontovik as api } from '../utils/apiClientABS_Frontovik';
export const creationCapabilities = async () => (await api.get('/client/onboarding/capabilities')).data;
export const checkNewClientIdentity = async (kind, value, signal) => (await api.get('/client/onboarding/unique', {
  params: {
    kind,
    value
  },
  signal
})).data;
export const findCreationAddresses = async name => (await api.get('/client/onboarding/addresses', {
  params: {
    name
  }
})).data;
export const creationDomain = async kind => (await api.get('/client/onboarding/domains', {
  params: {
    kind
  }
})).data;
export const submitClientCreation = async payload => (await api.post('/client/onboarding', payload, {
  timeout: 60000
})).data;
export const getClientCreation = async id => (await api.get(`/client/onboarding/${encodeURIComponent(id)}`)).data;
export const retryClientCreation = async id => (await api.post(`/client/onboarding/${encodeURIComponent(id)}/retry`)).data;
