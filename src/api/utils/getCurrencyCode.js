const CURRENCIES = {
    '840': 'USD',
    '972': 'TJS',
    '978': 'EUR'
};

export const getCurrencyCode = (currencyNumber) => {
    return CURRENCIES[currencyNumber] || currencyNumber;
};