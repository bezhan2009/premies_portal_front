export const validateProxyAccount = (value, kind) => {
  const valid = /^[0-9]{20}$/.test(value || '');
  if (kind === 'conversion' && (!valid || value.slice(5, 8) !== '643')) return 'Введите счет в рублях';
  return valid ? '' : 'Счёт должен содержать 20 цифр';
};
export const validateProxyAmount = (value) => /^[0-9]{1,10}(\.[0-9]{1,2})?$/.test(String(value)) && Number(value) > 0 ? '' : 'Введите положительную сумму, не более 2 знаков после запятой';
export const proxyQuotePayload = (amount, payerIban) => {
  const normalizedAmount = String(amount ?? '');
  const normalizedAccount = String(payerIban ?? '');
  if (validateProxyAmount(normalizedAmount) || validateProxyAccount(normalizedAccount, 'conversion')) return null;
  return {amount: normalizedAmount, payer_iban: normalizedAccount};
};
export const isCurrentProxyQuote = (payload, amount, payerIban) => !!payload
  && payload.amount === String(amount ?? '')
  && payload.payer_iban === String(payerIban ?? '');
export const proxyStatistics = (rows = []) => (rows ?? []).reduce((s, row) => {
  s.count += row.count;
  if (row.status === 'executed') s[row.kind === 'conversion' ? 'rub' : 'tjs'] += row.amount_minor / 100;
  if (['unknown', 'sending', 'accepted'].includes(row.status)) s.unconfirmed += row.count;
  return s;
}, {count: 0, rub: 0, tjs: 0, unconfirmed: 0});
export const proxyStatus = {
  sending: ['Отправляется / ожидает проверки', 'processing'],
  accepted: ['Принято АБС', 'processing'],
  executed: ['Исполнено', 'success'],
  error: ['Не отправлено', 'error'],
  unknown: ['Требует проверки в АБС', 'warning'],
};
export const proxyOperationStatus = (operation = {}) => {
  const status = String(operation.status || '').toLowerCase();
  const absStatus = String(operation.abs_status || '').toUpperCase().replace(/[-\s]+/g, '_');
  if (status === 'executed' || absStatus === 'BOOKED') return {text: 'Исполнено', color: 'success'};
  if (status === 'error') {
    const exact = operation.abs_status_text || operation.message || operation.abs_status || 'Операция отклонена';
    return {text: `Ошибка: ${exact}`, color: 'error'};
  }
  if (status === 'accepted' || status === 'sending' || absStatus === 'NOT_BOOKED') return {text: 'Ожидание', color: 'processing'};
  return {text: proxyStatus[status]?.[0] || operation.status || 'Неизвестно', color: proxyStatus[status]?.[1] || 'warning'};
};
export const replaceProxyOperation = (journal, refreshed) => ({
  ...journal,
  items: (journal?.items || []).map((item) => item.operation?.id === refreshed?.operation?.id ? refreshed : item),
});
export const proxyKind = (kind) => kind === 'conversion' ? 'Конвертация' : 'Платежка';
export const createProxyKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
