// Context is not authorization: the server verifies the client and membership.
export const withClientProductRead = (url, clientCode) => {
 if (!clientCode) return url;
 if (!/^\d{4}\.\d{6}$/.test(clientCode)) throw new Error('Некорректный код клиента');
 return `${url}${url.includes('?') ? '&' : '?'}clientIndex=${encodeURIComponent(clientCode)}`;
};

export const buildSelectedClientPhoneURL = (phone, clientCode) => {
 const normalizedPhone = String(phone || '').replace(/\D/g, '');
 if (!normalizedPhone) throw new Error('Некорректный номер телефона');
 if (!/^\d{4}\.\d{6}$/.test(clientCode || '')) throw new Error('Не выбран клиент');
 return `account/user/${encodeURIComponent(normalizedPhone)}?clientIndex=${encodeURIComponent(clientCode)}`;
};
