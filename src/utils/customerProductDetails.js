export const creditStatus = item => item?.params?.statusName || item?.statusName || item?.Status?.Name || 'Статус не указан';
export const cardExpiry = item => {
  const value = String(item?.details?.expiryDate || item?.details?.expirationDate || item?.expirationDate || '');
  if (/^\d{4}(0[1-9]|1[0-2])$/.test(value)) return `${value.slice(4,6)}.${value.slice(0,4)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0,10).split('-').reverse().join('.');
  return value || 'Не указан';
};
